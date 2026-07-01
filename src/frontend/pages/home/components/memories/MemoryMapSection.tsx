import { useEffect, useMemo, useState } from "react";
import { Clock, MapPin, Navigation, Camera } from "lucide-react";
import { divIcon } from "leaflet";
import type { LatLngExpression } from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { Photo } from "../PhotoStream";
import type { VisitedPlace } from "../VisitedPlacesPanel";

interface MemoryMapSectionProps {
  places: VisitedPlace[];
  photos: Photo[];
}

type MapPlace = VisitedPlace & {
  lat: number;
  lng: number;
};

const PORTO_CENTER: LatLngExpression = [41.1469, -8.611];

const createMarkerIcon = (index: number, isActive: boolean) =>
  divIcon({
    className: "mp-real-map-marker-wrapper",
    html: `<span class="mp-real-map-marker${
      isActive ? " mp-real-map-marker--active" : ""
    }"><span>${index + 1}</span></span>`,
    iconSize: [30, 38],
    iconAnchor: [15, 36],
  });

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const calculateDirectDistanceKm = (places: MapPlace[]) => {
  if (places.length < 2) return 0;

  const earthRadiusKm = 6371;
  let total = 0;

  for (let index = 1; index < places.length; index += 1) {
    const previous = places[index - 1];
    const current = places[index];
    const deltaLat = toRadians(current.lat - previous.lat);
    const deltaLng = toRadians(current.lng - previous.lng);

    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(toRadians(previous.lat)) *
        Math.cos(toRadians(current.lat)) *
        Math.sin(deltaLng / 2) ** 2;

    total += earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  return total;
};

function MapFocus({ selectedPlace }: { selectedPlace?: MapPlace }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedPlace) return;

    map.setView([selectedPlace.lat, selectedPlace.lng], Math.max(map.getZoom(), 15), {
      animate: true,
    });
  }, [map, selectedPlace]);

  return null;
}

export function MemoryMapSection({ places, photos }: MemoryMapSectionProps) {
  const visiblePlaces = useMemo<MapPlace[]>(
    () =>
      places.filter(
        (place): place is MapPlace =>
          typeof place.lat === "number" && typeof place.lng === "number",
      ),
    [places],
  );

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const selectedPlace =
    visiblePlaces.find((place) => place.id === selectedPlaceId) || visiblePlaces[0];

  const routePositions = useMemo<LatLngExpression[]>(
    () => visiblePlaces.map((place) => [place.lat, place.lng]),
    [visiblePlaces],
  );

  const mapCenter: LatLngExpression = selectedPlace
    ? [selectedPlace.lat, selectedPlace.lng]
    : PORTO_CENTER;

  const selectedPlacePhotos = useMemo(() => {
    if (!selectedPlace) return [];

    const matchedByRequestId = selectedPlace.photoRequestId
      ? photos.filter((photo) => photo.requestId === selectedPlace.photoRequestId)
      : [];

    if (matchedByRequestId.length > 0) {
      return matchedByRequestId.slice(0, 3);
    }

    return photos.slice(0, 3);
  }, [photos, selectedPlace]);

  const directDistanceKm = calculateDirectDistanceKm(visiblePlaces);
  const formattedDistance =
    directDistanceKm > 0
      ? `${directDistanceKm.toFixed(1).replace(".", ",")} km`
      : "—";

  return (
    <section className="mp-map-section">
      <div className="mp-section-heading">
        <div>
          <p className="mp-section-kicker">Mapa</p>
          <h2>Fotografias por localização</h2>
        </div>
      </div>

      <div className="mp-map-card mp-map-card--real">
        <div className="mp-real-map-shell" aria-label="Mapa de memórias">
          {visiblePlaces.length === 0 ? (
            <div className="mp-map-empty">
              <MapPin className="mp-map-empty-icon" />
              <p>Os locais guardados vão aparecer aqui quando a viagem avançar.</p>
            </div>
          ) : (
            <>
              <MapContainer
                center={mapCenter}
                zoom={15}
                zoomControl={false}
                scrollWheelZoom
                className="mp-real-map"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {routePositions.length > 1 && (
                  <Polyline
  positions={routePositions}
  pathOptions={{
    color: "#087987",
    weight: 3,
    opacity: 0.55,
    dashArray: "6 9",
    lineCap: "round",
    lineJoin: "round",
  }}
/>
                )}

                {visiblePlaces.map((place, index) => (
                  <Marker
                    key={place.id}
                    position={[place.lat, place.lng]}
                    icon={createMarkerIcon(index, place.id === selectedPlace?.id)}
                    eventHandlers={{
                      click: () => setSelectedPlaceId(place.id),
                    }}
                  />
                ))}

                <MapFocus selectedPlace={selectedPlace} />
              </MapContainer>

              {selectedPlace && (
                <div className="mp-real-map-selected-card">
                  {selectedPlacePhotos[0] ? (
                    <img
                      src={selectedPlacePhotos[0].url}
                      alt={selectedPlace.name}
                    />
                  ) : (
                    <span>
                      <Camera size={18} />
                    </span>
                  )}

                  <div>
                    <strong>{selectedPlace.name}</strong>
                    <small>
                      {selectedPlace.city} · {selectedPlace.category}
                    </small>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="mp-real-map-location-button"
                onClick={() => setSelectedPlaceId(selectedPlace?.id || null)}
                aria-label="Centrar no local selecionado"
              >
                <Navigation size={20} />
              </button>
            </>
          )}
        </div>

        <div className="mp-real-map-sheet">
          <div className="mp-real-map-summary">
            <div>
              <span className="mp-real-map-summary-icon">
                <MapPin size={16} />
              </span>
              <strong>{visiblePlaces.length} locais</strong>
            </div>

            <div>
              <Navigation size={16} />
              <strong>Ligação direta</strong>
            </div>

            <span className="mp-real-map-distance">{formattedDistance}</span>
          </div>

          {selectedPlace ? (
            <div className="mp-map-panel">
              <div>
                <p className="mp-map-panel-label">Local selecionado</p>
                <h3>{selectedPlace.name}</h3>
                <span>
                  {selectedPlace.city} · {selectedPlace.category}
                </span>
              </div>

              <div className="mp-map-photo-stack">
                {selectedPlacePhotos.length > 0 ? (
                  selectedPlacePhotos.map((photo) => (
                    <img key={photo.id} src={photo.url} alt={selectedPlace.name} />
                  ))
                ) : (
                  <div className="mp-map-photo-empty">
                    <Camera className="mp-map-photo-empty-icon" />
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {visiblePlaces.length > 0 && (
            <div className="mp-real-map-place-list">
              {visiblePlaces.map((place, index) => (
                <button
                  key={place.id}
                  type="button"
                  className={`mp-real-map-place-row${
                    place.id === selectedPlace?.id ? " mp-real-map-place-row--active" : ""
                  }`}
                  onClick={() => setSelectedPlaceId(place.id)}
                >
                  <span className="mp-real-map-place-number">{index + 1}</span>

                  <span className="mp-real-map-place-info">
                    <strong>{place.name}</strong>
                    <small>
                      {place.city} · {place.category}
                    </small>
                  </span>

                  <span className="mp-real-map-place-meta">
                    <Clock size={13} />
                    {place.visitCount && place.visitCount > 1
                      ? `${place.visitCount} visitas`
                      : "1 visita"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}