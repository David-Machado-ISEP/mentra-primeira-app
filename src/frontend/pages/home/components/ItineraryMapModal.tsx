import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Navigation,
} from "lucide-react";
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

import "../estilo/ItineraryMapModal.css";

type ItineraryMapPlace = {
  id: string;
  name: string;
  category?: string;
  location?: string;
  imageUrl?: string;
  image?: string;
  duration?: string;
  estimatedTime?: string;
  timeOfDay?: "Manhã" | "Tarde" | "Noite" | string;
  optimizedPeriod?: "morning" | "afternoon" | "night";
  lat?: number;
  lng?: number;
};

interface ItineraryMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  places: ItineraryMapPlace[];
}

type MapPlace = ItineraryMapPlace & {
  lat: number;
  lng: number;
  periodLabel: string;
};

const PORTO_CENTER: LatLngExpression = [41.1469, -8.611];

const fallbackCoordinatesById: Record<string, { lat: number; lng: number }> = {
  "livraria-lello": { lat: 41.1469, lng: -8.6148 },
  "igreja-clerigos": { lat: 41.1457, lng: -8.6147 },
  "torre-dos-clerigos": { lat: 41.1457, lng: -8.6147 },
  "estacao-sao-bento": { lat: 41.1456, lng: -8.6105 },
  "sao-bento": { lat: 41.1456, lng: -8.6105 },
  "se-do-porto": { lat: 41.1429, lng: -8.6113 },
  "miradouro-vitoria": { lat: 41.1436, lng: -8.6153 },
  "cais-ribeira": { lat: 41.1406, lng: -8.611 },
  "ribeira-porto": { lat: 41.1406, lng: -8.611 },
  "ponte-luis-i": { lat: 41.1398, lng: -8.6091 },
  "ponte-luis-1": { lat: 41.1398, lng: -8.6091 },
  "cafe-majestic": { lat: 41.1472, lng: -8.6066 },
  "mercado-bolhao": { lat: 41.1497, lng: -8.607 },
  "jardins-palacio-cristal": { lat: 41.1486, lng: -8.6255 },
  "museu-soares-dos-reis": { lat: 41.1472, lng: -8.621 },
  "foz-douro": { lat: 41.1512, lng: -8.6745 },
  "azulejos-route": { lat: 41.1456, lng: -8.6105 },
  "sunset-porto": { lat: 41.1412, lng: -8.6152 },
  "local-flavours": { lat: 41.1497, lng: -8.607 },
};

const fallbackCoordinatesByName: Record<string, { lat: number; lng: number }> = {
  "livraria lello": { lat: 41.1469, lng: -8.6148 },
  "igreja dos clérigos": { lat: 41.1457, lng: -8.6147 },
  "torre dos clérigos": { lat: 41.1457, lng: -8.6147 },
  "estação de são bento": { lat: 41.1456, lng: -8.6105 },
  "sé do porto": { lat: 41.1429, lng: -8.6113 },
  "miradouro da vitória": { lat: 41.1436, lng: -8.6153 },
  "cais da ribeira": { lat: 41.1406, lng: -8.611 },
  "ribeira do porto": { lat: 41.1406, lng: -8.611 },
  "ponte luís i": { lat: 41.1398, lng: -8.6091 },
  "ponte luis i": { lat: 41.1398, lng: -8.6091 },
  "café majestic": { lat: 41.1472, lng: -8.6066 },
  "cafe majestic": { lat: 41.1472, lng: -8.6066 },
  "mercado do bolhão": { lat: 41.1497, lng: -8.607 },
  "mercado de bolhão": { lat: 41.1497, lng: -8.607 },
  "jardins do palácio de cristal": { lat: 41.1486, lng: -8.6255 },
  "museu nacional soares dos reis": { lat: 41.1472, lng: -8.621 },
  "foz do douro": { lat: 41.1512, lng: -8.6745 },
};

const getPeriodLabel = (place: ItineraryMapPlace, index: number) => {
  if (place.timeOfDay) return place.timeOfDay;

  if (place.optimizedPeriod === "morning") return "Manhã";
  if (place.optimizedPeriod === "afternoon") return "Tarde";
  if (place.optimizedPeriod === "night") return "Noite";

  if (index === 0) return "Manhã";
  if (index === 1 || index === 2) return "Tarde";
  return "Noite";
};

const getCoordinates = (place: ItineraryMapPlace) => {
  if (typeof place.lat === "number" && typeof place.lng === "number") {
    return { lat: place.lat, lng: place.lng };
  }

  const byId = fallbackCoordinatesById[place.id];
  if (byId) return byId;

  return fallbackCoordinatesByName[place.name.trim().toLowerCase()];
};

const createMarkerIcon = (index: number, isActive: boolean) =>
  divIcon({
    className: "itinerary-real-map-marker-wrapper",
    html: `<span class="itinerary-real-map-marker${
      isActive ? " itinerary-real-map-marker--active" : ""
    }">${index + 1}</span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
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

  if (selectedPlace) {
    map.setView([selectedPlace.lat, selectedPlace.lng], Math.max(map.getZoom(), 15), {
      animate: true,
    });
  }

  return null;
}

export function ItineraryMapModal({
  isOpen,
  onClose,
  places,
}: ItineraryMapModalProps) {
  const visiblePlaces = useMemo<MapPlace[]>(
    () =>
      places
        .slice(0, 8)
        .map((place, index) => {
          const coordinates = getCoordinates(place);

          if (!coordinates) return null;

          return {
            ...place,
            ...coordinates,
            periodLabel: getPeriodLabel(place, index),
          };
        })
        .filter((place): place is MapPlace => Boolean(place)),
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

  const directDistanceKm = calculateDirectDistanceKm(visiblePlaces);
  const formattedDistance =
    directDistanceKm > 0
      ? `${directDistanceKm.toFixed(1).replace(".", ",")} km`
      : "—";

  if (!isOpen) return null;

  return (
    <div className="itinerary-map-overlay">
      <div className="itinerary-map-screen">
        <div className="itinerary-map-topbar">
          <button
            type="button"
            className="itinerary-map-back-button"
            onClick={onClose}
            aria-label="Voltar ao roteiro"
          >
            <ChevronLeft size={22} />
          </button>

          <div className="itinerary-map-heading">
            <h2>Mapa do roteiro</h2>
            <p>Hoje · Porto</p>
          </div>
        </div>

        <div className="itinerary-map-canvas itinerary-map-canvas--real">
          <MapContainer
            center={mapCenter}
            zoom={15}
            zoomControl={false}
            scrollWheelZoom
            className="itinerary-real-map"
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
                  weight: 4,
                  opacity: 0.78,
                  dashArray: "8 10",
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
        </div>

        <button
          type="button"
          className="itinerary-map-location-button"
          onClick={() => setSelectedPlaceId(selectedPlace?.id || null)}
          aria-label="Centrar no local selecionado"
        >
          <Navigation size={22} />
        </button>

        <div className="itinerary-map-bottom-stack">
          {selectedPlace && (
            <div className="itinerary-map-selected-card">
              {selectedPlace.imageUrl || selectedPlace.image ? (
                <img
                  src={selectedPlace.imageUrl || selectedPlace.image}
                  alt={selectedPlace.name}
                />
              ) : (
                <span>{selectedPlace.name.charAt(0)}</span>
              )}

              <div>
                <strong>{selectedPlace.name}</strong>
                <small>
                  {selectedPlace.category || "Local"} · {selectedPlace.location || "Porto"}
                </small>
              </div>
            </div>
          )}

          <div className="itinerary-map-bottom-sheet">
            <div className="itinerary-map-drag-handle" />

            <div className="itinerary-map-summary">
              <div>
                <span className="itinerary-map-summary-icon">
                  <MapPin size={17} />
                </span>
                <strong>{visiblePlaces.length} locais</strong>
              </div>

              <div>
                <Navigation size={17} />
                <strong>Ligação direta</strong>
              </div>

              <span className="itinerary-map-distance">
                {formattedDistance}
                <ChevronRight size={17} />
              </span>
            </div>

            <div className="itinerary-map-place-list">
              {visiblePlaces.map((place, index) => (
                <button
                  type="button"
                  className={`itinerary-map-place-row${
                    place.id === selectedPlace?.id ? " itinerary-map-place-row--active" : ""
                  }`}
                  key={place.id}
                  onClick={() => setSelectedPlaceId(place.id)}
                >
                  <span className="itinerary-map-place-number">{index + 1}</span>

                  <span className="itinerary-map-place-info">
                    <strong>{place.name}</strong>
                    <small>
                      {place.category || "Local"} · {place.location || "Porto"}
                    </small>
                  </span>

                  <span className="itinerary-map-period">{place.periodLabel}</span>

                  <span className="itinerary-map-duration">
                    <Clock size={14} />
                    {place.duration || place.estimatedTime || "—"}
                  </span>

                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
