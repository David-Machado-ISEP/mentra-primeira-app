import { CheckCircle2, Download, Share2, X } from "lucide-react";

import type { Photo } from "../PhotoStream";

interface MemoryDetailModalProps {
  photo: Photo | null;
  isSelected: boolean;
  onClose: () => void;
  onTogglePhoto: (photoId: string) => void;
  onLog?: (
    message: string,
    type?: "info" | "success" | "warning" | "error",
  ) => void;
}

const getPhotoFilename = (photo: Photo) => {
  const safeTimestamp = photo.timestamp.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return `mentra-memoria-${safeTimestamp || photo.id}.jpg`;
};

const dataUrlToFile = async (dataUrl: string, filename: string) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const type = blob.type || "image/jpeg";
  return new File([blob], filename, { type });
};

export function MemoryDetailModal({
  photo,
  isSelected,
  onClose,
  onTogglePhoto,
  onLog,
}: MemoryDetailModalProps) {
  if (!photo) return null;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = photo.url;
    link.download = getPhotoFilename(photo);
    document.body.appendChild(link);
    link.click();
    link.remove();
    onLog?.("Fotografia preparada para transferência.", "success");
  };

  const handleShare = async () => {
    try {
      const file = await dataUrlToFile(photo.url, getPhotoFilename(photo));
      const shareData: ShareData = {
        title: "Memória Mentra",
        text: "Fotografia captada durante a viagem.",
        files: [file],
      };

      if (navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        return;
      }

      handleDownload();
      onLog?.(
        "Este dispositivo não suporta partilha direta desta foto. Iniciei a transferência.",
        "info",
      );
    } catch {
      onLog?.("Não foi possível abrir a partilha desta fotografia.", "error");
    }
  };

  return (
    <div className="mp-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="mp-photo-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Detalhe da fotografia"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="mp-modal-close"
          onClick={onClose}
          aria-label="Fechar fotografia"
        >
          <X className="mp-modal-close-icon" />
        </button>

        <img src={photo.url} alt={`Memória capturada às ${photo.timestamp}`} />

        <div className="mp-photo-modal-footer">
          <div>
            <h2>Momento da viagem</h2>
            <p>{photo.timestamp}</p>
          </div>

          <div className="mp-photo-modal-actions">
            <button
              type="button"
              className="mp-photo-action-button"
              onClick={handleDownload}
            >
              <Download className="mp-photo-select-icon" />
              Transferir
            </button>

            <button
              type="button"
              className="mp-photo-action-button"
              onClick={handleShare}
            >
              <Share2 className="mp-photo-select-icon" />
              Partilhar
            </button>

            <button
              type="button"
              className={`mp-photo-select-button ${isSelected ? "is-selected" : ""}`}
              onClick={() => onTogglePhoto(photo.id)}
            >
              <CheckCircle2 className="mp-photo-select-icon" />
              {isSelected ? "Selecionada" : "Selecionar"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
