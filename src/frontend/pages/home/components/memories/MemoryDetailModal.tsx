import { CheckCircle2, X } from "lucide-react";

import type { Photo } from "../PhotoStream";

interface MemoryDetailModalProps {
  photo: Photo | null;
  isSelected: boolean;
  onClose: () => void;
  onTogglePhoto: (photoId: string) => void;
}

export function MemoryDetailModal({
  photo,
  isSelected,
  onClose,
  onTogglePhoto,
}: MemoryDetailModalProps) {
  if (!photo) return null;

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

          <button
            type="button"
            className={`mp-photo-select-button ${isSelected ? "is-selected" : ""}`}
            onClick={() => onTogglePhoto(photo.id)}
          >
            <CheckCircle2 className="mp-photo-select-icon" />
            {isSelected ? "Selecionada" : "Selecionar"}
          </button>
        </div>
      </section>
    </div>
  );
}
