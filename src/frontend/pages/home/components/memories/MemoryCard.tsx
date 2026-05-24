import { Camera, MapPin } from "lucide-react";

interface MemoryCardProps {
  title: string;
  subtitle: string;
  imageUrl?: string;
  meta?: string;
  location?: string;
  variant?: "large" | "compact";
  onClick?: () => void;
}

export function MemoryCard({
  title,
  subtitle,
  imageUrl,
  meta,
  location,
  variant = "compact",
  onClick,
}: MemoryCardProps) {
  const content = (
    <>
      <div className="mp-memory-image-wrap">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="mp-memory-image" />
        ) : (
          <div className="mp-memory-image-empty">
            <Camera className="mp-memory-empty-icon" />
          </div>
        )}

        <div className="mp-memory-overlay" />
      </div>

      <div className="mp-memory-copy">
        {meta && <span className="mp-memory-meta">{meta}</span>}
        <h3>{title}</h3>
        <p>{subtitle}</p>

        {location && (
          <span className="mp-memory-location">
            <MapPin className="mp-memory-location-icon" />
            {location}
          </span>
        )}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`mp-memory-card mp-memory-card-${variant}`}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <article className={`mp-memory-card mp-memory-card-${variant}`}>
      {content}
    </article>
  );
}
