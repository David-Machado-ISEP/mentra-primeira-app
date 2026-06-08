import { useMemo, useState } from "react";
import { Camera, CheckCircle2, Download, Share2, X } from "lucide-react";

import type { Photo } from "../PhotoStream";
import { MemoryDetailModal } from "./MemoryDetailModal";

interface PhotoTimelineProps {
  photos: Photo[];
  selectedPhotoIds: string[];
  onTogglePhoto: (photoId: string) => void;
  onClearPhotoSelection?: () => void;
  onLog?: (
    message: string,
    type?: "info" | "success" | "warning" | "error",
  ) => void;
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

const getPhotoFilename = (photo: Photo, index = 0) => {
  const safeTimestamp = photo.timestamp.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return `mentra-memoria-${safeTimestamp || photo.id || index}.jpg`;
};

const dataUrlToFile = async (dataUrl: string, filename: string) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const type = blob.type || "image/jpeg";
  return new File([blob], filename, { type });
};

const downloadPhoto = (photo: Photo, index = 0) => {
  const link = document.createElement("a");
  link.href = photo.url;
  link.download = getPhotoFilename(photo, index);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const sharePhotos = async (photos: Photo[]) => {
  const files = await Promise.all(
    photos.map((photo, index) => dataUrlToFile(photo.url, getPhotoFilename(photo, index))),
  );

  const shareData: ShareData = {
    title: photos.length === 1 ? "Memória Mentra" : "Memórias Mentra",
    text:
      photos.length === 1
        ? "Fotografia captada durante a viagem."
        : `${photos.length} fotografias captadas durante a viagem.`,
    files,
  };

  if (navigator.canShare?.(shareData)) {
    await navigator.share(shareData);
    return true;
  }

  return false;
};

export function PhotoTimeline({
  photos,
  selectedPhotoIds,
  onTogglePhoto,
  onClearPhotoSelection,
  onLog,
}: PhotoTimelineProps) {
  const [openedPhoto, setOpenedPhoto] = useState<Photo | null>(null);
  const groups = useMemo(() => groupPhotos(photos), [photos]);
  const selectedPhotos = useMemo(
    () => photos.filter((photo) => selectedPhotoIds.includes(photo.id)),
    [photos, selectedPhotoIds],
  );

  const handleDownloadSelected = () => {
    if (selectedPhotos.length === 0) {
      onLog?.("Seleciona pelo menos uma fotografia para transferir.", "warning");
      return;
    }

    selectedPhotos.forEach((photo, index) => downloadPhoto(photo, index));
    onLog?.(
      selectedPhotos.length === 1
        ? "Fotografia preparada para transferência."
        : `${selectedPhotos.length} fotografias preparadas para transferência.`,
      "success",
    );
  };

  const handleShareSelected = async () => {
    if (selectedPhotos.length === 0) {
      onLog?.("Seleciona pelo menos uma fotografia para partilhar.", "warning");
      return;
    }

    try {
      const shared = await sharePhotos(selectedPhotos);

      if (!shared) {
        handleDownloadSelected();
        onLog?.(
          "Este dispositivo não suporta partilha direta de várias fotos. Iniciei a transferência.",
          "info",
        );
      }
    } catch {
      onLog?.("Não foi possível abrir a partilha desta vez.", "error");
    }
  };

  return (
    <section className="mp-timeline-section">
      <div className="mp-section-heading">
        <div>
          <p className="mp-section-kicker">Timeline</p>
          <h2>Todas as fotografias</h2>
        </div>

        <span className="mp-section-count">{photos.length} fotos</span>
      </div>

      {selectedPhotos.length > 0 && (
        <div className="mp-photo-selection-bar" role="status">
          <strong>
            {selectedPhotos.length} {selectedPhotos.length === 1 ? "foto" : "fotos"} selecionada
            {selectedPhotos.length === 1 ? "" : "s"}
          </strong>

          <div className="mp-photo-selection-actions">
            <button type="button" onClick={handleDownloadSelected}>
              <Download className="mp-photo-selection-icon" />
              Transferir
            </button>
            <button type="button" onClick={handleShareSelected}>
              <Share2 className="mp-photo-selection-icon" />
              Partilhar
            </button>
            {onClearPhotoSelection && (
              <button type="button" className="is-subtle" onClick={onClearPhotoSelection}>
                <X className="mp-photo-selection-icon" />
                Limpar
              </button>
            )}
          </div>
        </div>
      )}

      {photos.length === 0 ? (
        <div className="mp-empty-state">
          <Camera className="mp-empty-state-icon" />
          <h3>Ainda sem fotografias</h3>
          <p>Usa um toque nos óculos para começar a criar a tua galeria.</p>
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
        onLog={onLog}
      />
    </section>
  );
}
