import type { User } from "../session/User";
import type { CurrentLocation } from "./LocationManager";

export interface VisitedPlace {
  id: string;
  name: string;
  city: string;
  category: string;
  description: string;
  detectedFrom: "photo" | "menu" | "manual";
  timestamp: number;
  firstVisitedAt: number;
  visitCount: number;
  lat?: number;
  lng?: number;
  accuracy?: number;
  address?: string;
  photoRequestId?: string;
}

interface VisitedPlaceInput {
  name: string;
  city: string;
  category: string;
  description: string;
  detectedFrom: VisitedPlace["detectedFrom"];
  location?: CurrentLocation | null;
  photoRequestId?: string;
}

interface SSEWriter {
  write: (data: string) => void;
  userId: string;
  close: () => void;
}

/**
 * VisitedPlacesManager — stores and broadcasts automatically detected places.
 */
export class VisitedPlacesManager {
  private places: Map<string, VisitedPlace> = new Map();
  private sseClients: Set<SSEWriter> = new Set();
  private readonly duplicateDistanceMeters = 120;

  constructor(private user: User) {}

  saveVisitedPlace(place: VisitedPlaceInput): VisitedPlace {
    const baseId = this.slugify(`${place.name}-${place.city}`);
    const existingId = this.findExistingPlaceId(baseId, place);
    const id = existingId ?? baseId;
    const existing = this.places.get(id);
    const now = Date.now();
    const location = place.location ?? null;

    const visitedPlace: VisitedPlace = {
      id,
      name: place.name,
      city: place.city,
      category: place.category,
      description: place.description,
      detectedFrom: place.detectedFrom,
      timestamp: now,
      firstVisitedAt: existing?.firstVisitedAt ?? now,
      visitCount: (existing?.visitCount ?? 0) + 1,
      lat: location?.lat ?? existing?.lat,
      lng: location?.lng ?? existing?.lng,
      accuracy: location?.accuracy ?? existing?.accuracy,
      address: location?.displayName ?? existing?.address,
      photoRequestId: place.photoRequestId ?? existing?.photoRequestId,
    };

    this.places.set(id, visitedPlace);
    this.broadcast(visitedPlace, existing ? "updated" : "created");

    console.log(
      `[VisitedPlaces] ${this.user.userId}: ${existing ? "updated" : "saved"} ${place.name}`,
    );

    return visitedPlace;
  }

  getAll(): VisitedPlace[] {
    return Array.from(this.places.values()).sort(
      (a, b) => b.timestamp - a.timestamp,
    );
  }

  addSSEClient(client: SSEWriter): void {
    this.sseClients.add(client);
  }

  removeSSEClient(client: SSEWriter): void {
    this.sseClients.delete(client);
  }

  destroy(): void {
    this.places.clear();
    this.sseClients.clear();
  }

  private broadcast(place: VisitedPlace, event: "created" | "updated"): void {
    const payload = JSON.stringify({
      type: "visited_place",
      event,
      place,
    });

    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  private slugify(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  private findExistingPlaceId(
    baseId: string,
    place: VisitedPlaceInput,
  ): string | null {
    if (this.places.has(baseId)) {
      return baseId;
    }

    const location = place.location;
    if (!location) {
      return null;
    }

    for (const existing of this.places.values()) {
      if (existing.lat === undefined || existing.lng === undefined) {
        continue;
      }

      const distance = this.distanceInMeters(
        { lat: location.lat, lng: location.lng },
        { lat: existing.lat, lng: existing.lng },
      );

      if (distance <= this.duplicateDistanceMeters) {
        return existing.id;
      }
    }

    return null;
  }

  private distanceInMeters(
    a: Pick<CurrentLocation, "lat" | "lng">,
    b: Pick<CurrentLocation, "lat" | "lng">,
  ): number {
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
