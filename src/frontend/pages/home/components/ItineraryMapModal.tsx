import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Navigation,
  X,
} from "lucide-react";

import "../estilo/ItineraryMapModal.css";

type ItineraryMapPlace = {
  id: string;
  name: string;
  category?: string;
  location?: string;
  imageUrl?: string;
  duration?: string;
  timeOfDay?: "Manhã" | "Tarde" | "Noite" | string;
};

interface ItineraryMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  places: ItineraryMapPlace[];
}

const mockPositions = [
  { left: "22%", top: "34%" },
  { left: "53%", top: "52%" },
  { left: "72%", top: "25%" },
  { left: "76%", top: "68%" },
  { left: "38%", top: "72%" },
];

export function ItineraryMapModal({
  isOpen,
  onClose,
  places,
}: ItineraryMapModalProps) {
  if (!isOpen) return null;

  const visiblePlaces = places.slice(0, 5);

  const routePoints = visiblePlaces
    .map((_, index) => {
      const position = mockPositions[index] ?? mockPositions[0];
      return `${position.left.replace("%", "")},${position.top.replace("%", "")}`;
    })
    .join(" ");

  return (
    <div className="itinerary-map-overlay">
      <div className="itinerary-map-screen">
        <div className="itinerary-map-topbar">
          <button
            type="button"
            className="itinerary-map-round-button"
            onClick={onClose}
            aria-label="Voltar"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="itinerary-map-heading">
            <h2>Mapa do roteiro</h2>
            <p>Hoje · Porto</p>
          </div>

          <button
            type="button"
            className="itinerary-map-round-button"
            onClick={onClose}
            aria-label="Fechar mapa"
          >
            <X size={24} />
          </button>
        </div>

        <div className="itinerary-map-canvas">
          <div className="itinerary-map-grid" />

          <svg
            className="itinerary-map-route"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <polyline points={routePoints} />
          </svg>

          {visiblePlaces.map((place, index) => {
            const position = mockPositions[index] ?? mockPositions[0];

            return (
              <button
                type="button"
                key={place.id}
                className="itinerary-map-pin"
                style={{
                  left: position.left,
                  top: position.top,
                }}
                aria-label={place.name}
              >
                <span>{index + 1}</span>
              </button>
            );
          })}

          {visiblePlaces[0] && (
            <div className="itinerary-map-preview-card">
              {visiblePlaces[0].imageUrl ? (
                <img src={visiblePlaces[0].imageUrl} alt={visiblePlaces[0].name} />
              ) : (
                <div className="itinerary-map-preview-fallback">
                  {visiblePlaces[0].name.charAt(0)}
                </div>
              )}

              <div>
                <h3>{visiblePlaces[0].name}</h3>
                <p>
                  {visiblePlaces[0].category || "Local"} ·{" "}
                  {visiblePlaces[0].location || "Porto"}
                </p>

                <span>
                  <Clock size={15} />
                  {visiblePlaces[0].duration || "45 min"}
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            className="itinerary-map-location-button"
            aria-label="Centrar localização"
          >
            <Navigation size={24} />
          </button>

          <div className="itinerary-map-zoom-controls">
            <button type="button">+</button>
            <button type="button">−</button>
          </div>
        </div>

        <div className="itinerary-map-bottom-sheet">
          <div className="itinerary-map-drag-handle" />

          <div className="itinerary-map-summary">
            <div>
              <span className="itinerary-map-summary-icon">
                <MapPin size={18} />
              </span>
              <strong>{visiblePlaces.length} locais</strong>
            </div>

            <div className="itinerary-map-summary-divider" />

            <div>
              <Navigation size={18} />
              <strong>Percurso a pé</strong>
            </div>

            <button type="button">
              2,8 km
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="itinerary-map-place-list">
            {visiblePlaces.map((place, index) => (
              <button
                type="button"
                className="itinerary-map-place-row"
                key={place.id}
              >
                <span className="itinerary-map-place-number">{index + 1}</span>

                <span className="itinerary-map-place-info">
                  <strong>{place.name}</strong>
                  <small>
                    {place.category || "Local"} · {place.location || "Porto"}
                  </small>
                </span>

                <span className="itinerary-map-period">
                  {place.timeOfDay || (index === 0 ? "Manhã" : "Tarde")}
                </span>

                <span className="itinerary-map-duration">
                  <Navigation size={15} />
                  {place.duration || "15 min"}
                </span>

                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}