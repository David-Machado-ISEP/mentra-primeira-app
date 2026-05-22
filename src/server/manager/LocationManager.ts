import type { LocationUpdate } from "@mentra/sdk";
import type { AppSession } from "@mentra/sdk";
import type { User } from "../session/User";

export interface CurrentLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
  placeName?: string;
  displayName?: string;
  city?: string;
  country?: string;
}

interface SSEWriter {
  write: (data: string) => void;
  userId: string;
  close: () => void;
}

/**
 * LocationManager — listens for MentraOS location updates and broadcasts them.
 */
export class LocationManager {
  private latestLocation: CurrentLocation | null = null;
  private sseClients: Set<SSEWriter> = new Set();
  private unsubscribeLocation: (() => void) | null = null;
  private lastReverseGeocodeAt = 0;
  private lastReverseGeocodedLocation: CurrentLocation | null = null;
  private readonly reverseGeocodeCooldownMs = 15_000;
  private readonly reverseGeocodeMinDistanceMeters = 75;

  constructor(private user: User) {}

  setup(session: AppSession): void {
    this.destroy();

    try {
      this.unsubscribeLocation = session.location.subscribeToStream(
        { accuracy: "standard" },
        (location) => this.handleLocationUpdate(location),
      );

      console.log(`[Location] ${this.user.userId}: location stream started`);
    } catch (error) {
      console.error(
        `[Location] ${this.user.userId}: failed to start location stream`,
        error,
      );
    }
  }

  getLatest(): CurrentLocation | null {
    return this.latestLocation;
  }

  addSSEClient(client: SSEWriter): void {
    this.sseClients.add(client);
  }

  removeSSEClient(client: SSEWriter): void {
    this.sseClients.delete(client);
  }

  destroy(): void {
    if (this.unsubscribeLocation) {
      this.unsubscribeLocation();
      this.unsubscribeLocation = null;
    }

    this.sseClients.clear();
  }

  private async handleLocationUpdate(location: LocationUpdate): Promise<void> {
    const currentLocation: CurrentLocation = {
      lat: location.lat,
      lng: location.lng,
      accuracy: location.accuracy,
      timestamp: Date.now(),
    };
    const inferredPlace = this.inferKnownPlace(currentLocation);
    const initialLocation = {
      ...currentLocation,
      ...(inferredPlace ?? {}),
    };

    this.latestLocation = initialLocation;

    /*console.log(
      `[Location] ${this.user.userId}: ${currentLocation.lat}, ${currentLocation.lng}`,
    );*/

    this.broadcast(initialLocation);

    const shouldReverseGeocode = this.shouldReverseGeocode(currentLocation);
    if (!shouldReverseGeocode) return;

    this.lastReverseGeocodeAt = Date.now();
    const place = await this.reverseGeocode(currentLocation);
    if (!place) return;

    this.latestLocation = {
      ...currentLocation,
      ...place,
      city: inferredPlace?.city ?? place.city,
      country: inferredPlace?.country ?? place.country,
    };
    this.lastReverseGeocodedLocation = this.latestLocation;

    /*console.log(
      `[Location] ${this.user.userId}: resolved place ${this.latestLocation.placeName}`,
    );*/

    this.broadcast(this.latestLocation);
  }

  private broadcast(location: CurrentLocation): void {
    const payload = JSON.stringify({
      type: "location_update",
      location,
    });

    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  private shouldReverseGeocode(location: CurrentLocation): boolean {
    const now = Date.now();

    if (!this.lastReverseGeocodedLocation) return true;
    if (now - this.lastReverseGeocodeAt > this.reverseGeocodeCooldownMs) {
      return true;
    }

    return (
      this.distanceInMeters(location, this.lastReverseGeocodedLocation) >
      this.reverseGeocodeMinDistanceMeters
    );
  }

  private async reverseGeocode(
    location: CurrentLocation,
  ): Promise<
    Pick<CurrentLocation, "placeName" | "displayName" | "city" | "country"> | null
  > {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(location.lat));
    url.searchParams.set("lon", String(location.lng));
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "TravelWhisperer/1.0 (MentraOS development app)",
          "Accept-Language": "pt,en",
        },
      });

      if (!response.ok) {
        console.warn(
          `[Location] ${this.user.userId}: reverse geocoding failed (${response.status})`,
        );
        return null;
      }

      const data = await response.json();
      const address = data.address ?? {};
      const city =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.county ||
        address.state;
      const placeName =
        data.name ||
        address.attraction ||
        address.tourism ||
        address.amenity ||
        address.building ||
        address.road ||
        address.neighbourhood ||
        address.suburb ||
        address.city ||
        address.town ||
        address.village ||
        data.display_name;

      return {
        placeName,
        displayName: data.display_name,
        city,
        country: address.country,
      };
    } catch (error) {
      console.error(
        `[Location] ${this.user.userId}: failed to reverse geocode location`,
        error,
      );
      return null;
    }
  }

  private inferKnownPlace(
    location: CurrentLocation,
  ): Pick<CurrentLocation, "placeName" | "city" | "country"> | null {
    const knownPlaces = [
      {
        name: "Estádio do Dragão",
        city: "Porto",
        country: "Portugal",
        lat: 41.16176,
        lng: -8.58393,
        radiusMeters: 300,
      },
      {
        name: "Porto",
        city: "Porto",
        country: "Portugal",
        lat: 41.15794,
        lng: -8.62911,
        radiusMeters: 15000,
      },
      {
        name: "Lisboa",
        city: "Lisboa",
        country: "Portugal",
        lat: 38.72225,
        lng: -9.13934,
        radiusMeters: 18000,
      },
    ];

    const match = knownPlaces.find(
      (place) =>
        this.distanceInMeters(location, {
          lat: place.lat,
          lng: place.lng,
          timestamp: Date.now(),
        }) <= place.radiusMeters,
    );

    if (!match) return null;

    return {
      placeName: match.name,
      city: match.city,
      country: match.country,
    };
  }

  private distanceInMeters(a: CurrentLocation, b: CurrentLocation): number {
    const earthRadiusMeters = 6_371_000;
    const lat1 = this.toRadians(a.lat);
    const lat2 = this.toRadians(b.lat);
    const deltaLat = this.toRadians(b.lat - a.lat);
    const deltaLng = this.toRadians(b.lng - a.lng);

    const haversine =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(deltaLng / 2) *
        Math.sin(deltaLng / 2);

    return (
      earthRadiusMeters *
      2 *
      Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
    );
  }

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }
}
