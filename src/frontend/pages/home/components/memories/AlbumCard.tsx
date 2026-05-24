import { CalendarDays, Camera, MapPin } from "lucide-react";

interface AlbumCardProps {
  title: string;
  dateLabel: string;
  photoCount: number;
  placeCount: number;
  coverUrl?: string;
  onClick?: () => void;
}

export function AlbumCard({
  title,
  dateLabel,
  photoCount,
  placeCount,
  coverUrl,
  onClick,
}: AlbumCardProps) {
  const content = (
    <>
      <div className="mp-album-cover">
        {coverUrl ? (
          <img src={coverUrl} alt={title} />
        ) : (
          <div className="mp-album-cover-empty">
            <Camera className="mp-album-empty-icon" />
          </div>
        )}
      </div>

      <div className="mp-album-copy">
        <h3>{title}</h3>

        <span>
          <CalendarDays className="mp-album-meta-icon" />
          {dateLabel}
        </span>

        <span>
          <Camera className="mp-album-meta-icon" />
          {photoCount} fotos
          <span className="mp-album-dot">•</span>
          <MapPin className="mp-album-meta-icon" />
          {placeCount} locais
        </span>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="mp-album-card" onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <article className="mp-album-card">
      {content}
    </article>
  );
}
