import { useMemo, useState } from "react";
import { Camera, MapPin } from "lucide-react";

import type { Photo } from "../PhotoStream";
import type { VisitedPlace } from "../VisitedPlacesPanel";

interface MemoryMapSectionProps {
  places: VisitedPlace[];
  photos: Photo[];
}

const getPinPosition = (place: VisitedPlace, index: number, places: VisitedPlace[]) => {
  const placesWithCoordinates = places.filter(
    (item) => typeof item.lat === "number" && typeof item.lng === "number",
  );

  if (
    typeof place.lat !== "number" ||
    typeof place.lng !== "number" ||
    placesWithCoordinates.length < 2
  ) {
    const fallbackPositions = [
      { left: 24, top: 36 },
      { left: 58, top: 28 },
      { left: 72, top: 54 },
      { left: 36, top: 64 },
      { left: 48, top: 44 },
    ];

    return fallbackPositions[index % fallbackPositions.length];
  }

  const lats = placesWithCoordinates.map((item) => item.lat as number);
  const lngs = placesWithCoordinates.map((item) => item.lng as number);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latRange = maxLat - minLat || 0.001;
  const lngRange = maxLng - minLng || 0.001;

  return {
    left: 16 + (((place.lng as number) - minLng) / lngRange) * 68,
    top: 18 + (1 - (((place.lat as number) - minLat) / latRange)) * 64,
  };
};

export function MemoryMapSection({ places, photos }: MemoryMapSectionProps) {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(
    places[0]?.id ?? null,
  );

  const selectedPlace = useMemo(
    () => places.find((place) => place.id === selectedPlaceId) ?? places[0],
    [places, selectedPlaceId],
  );

  const previewPhotos = photos.slice(0, 3);

  return (
    <section className="mp-map-section">
      <div className="mp-section-heading">
        <div>
          <p className="mp-section-kicker">Mapa</p>
          <h2>Fotografias por localização</h2>
        </div>
      </div>

      <div className="mp-map-card">
        <div className="mp-map-canvas" aria-label="Mapa de memórias">
          <span className="mp-map-route mp-map-route-one" />
          <span className="mp-map-route mp-map-route-two" />
          <span className="mp-map-area mp-map-area-one" />
          <span className="mp-map-area mp-map-area-two" />

          {places.length === 0 ? (
            <div className="mp-map-empty">
              <MapPin className="mp-map-empty-icon" />
              <p>Os locais guardados vão aparecer aqui quando a viagem avançar.</p>
            </div>
          ) : (
            places.map((place, index) => {
              const position = getPinPosition(place, index, places);
              const isSelected = selectedPlace?.id === place.id;

              return (
                <button
                  key={place.id}
                  type="button"
                  className={`mp-map-pin ${isSelected ? "is-selected" : ""}`}
                  style={{
                    left: `${position.left}%`,
                    top: `${position.top}%`,
                  }}
                  onClick={() => setSelectedPlaceId(place.id)}
                  aria-label={`Abrir fotos em ${place.name}`}
                >
                  <MapPin className="mp-map-pin-icon" />
                </button>
              );
            })
          )}
        </div>

        <aside className="mp-map-panel">
          {selectedPlace ? (
            <>
              <div>
                <p className="mp-map-panel-label">Local selecionado</p>
                <h3>{selectedPlace.name}</h3>
                <span>
                  {selectedPlace.city} · {selectedPlace.category}
                </span>
              </div>

              <div className="mp-map-photo-stack">
                {previewPhotos.length > 0 ? (
                  previewPhotos.map((photo) => (
                    <img key={photo.id} src={photo.url} alt={selectedPlace.name} />
                  ))
                ) : (
                  <div className="mp-map-photo-empty">
                    <Camera className="mp-map-photo-empty-icon" />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div>
              <p className="mp-map-panel-label">Ainda sem mapa</p>
              <h3>Locais da viagem</h3>
              <span>As memórias ganham mapa quando houver lugares guardados.</span>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
