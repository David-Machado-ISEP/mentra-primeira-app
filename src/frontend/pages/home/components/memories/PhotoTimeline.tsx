import { useMemo, useState } from "react";
import { Camera, CheckCircle2 } from "lucide-react";

import type { Photo } from "../PhotoStream";
import { MemoryDetailModal } from "./MemoryDetailModal";

interface PhotoTimelineProps {
  photos: Photo[];
  selectedPhotoIds: string[];
  onTogglePhoto: (photoId: string) => void;
}

const groupPhotos = (photos: Photo[]) => {
  if (photos.length === 0) return [];

  return [
    {
      label: "Hoje",
      photos,
    },
  ];
};

export function PhotoTimeline({
  photos,
  selectedPhotoIds,
  onTogglePhoto,
}: PhotoTimelineProps) {
  const [openedPhoto, setOpenedPhoto] = useState<Photo | null>(null);
  const groups = useMemo(() => groupPhotos(photos), [photos]);

  return (
    <section className="mp-timeline-section">
      <div className="mp-section-heading">
        <div>
          <p className="mp-section-kicker">Timeline</p>
          <h2>Todas as fotografias</h2>
        </div>

        <span className="mp-section-count">{photos.length} fotos</span>
      </div>

      {photos.length === 0 ? (
        <div className="mp-empty-state">
          <Camera className="mp-empty-state-icon" />
          <h3>Ainda sem fotografias</h3>
          <p>Usa 1 toque nos óculos para começar a criar a tua galeria.</p>
        </div>
      ) : (
        <div className="mp-timeline-groups">
          {groups.map((group) => (
            <div className="mp-timeline-group" key={group.label}>
              <h3>{group.label}</h3>

              <div className="mp-photo-grid">
                {group.photos.map((photo, index) => {
                  const isSelected = selectedPhotoIds.includes(photo.id);
                  const featured = index % 7 === 0;

                  return (
                    <button
                      key={photo.id}
                      type="button"
                      className={`mp-photo-tile ${
                        featured ? "mp-photo-tile-featured" : ""
                      } ${isSelected ? "is-selected" : ""}`}
                      onClick={() => setOpenedPhoto(photo)}
                    >
                      <img
                        src={photo.url}
                        alt={`Fotografia capturada às ${photo.timestamp}`}
                        loading="lazy"
                      />

                      <span className="mp-photo-tile-time">{photo.timestamp}</span>

                      <span
                        className="mp-photo-tile-select"
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          onTogglePhoto(photo.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            onTogglePhoto(photo.id);
                          }
                        }}
                      >
                        <CheckCircle2 className="mp-photo-tile-select-icon" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <MemoryDetailModal
        photo={openedPhoto}
        isSelected={
          openedPhoto ? selectedPhotoIds.includes(openedPhoto.id) : false
        }
        onClose={() => setOpenedPhoto(null)}
        onTogglePhoto={onTogglePhoto}
      />
    </section>
  );
}
