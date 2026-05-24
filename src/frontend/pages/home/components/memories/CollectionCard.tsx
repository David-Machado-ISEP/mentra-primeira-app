import type { LucideIcon } from "lucide-react";

interface CollectionCardProps {
  title: string;
  countLabel: string;
  icon: LucideIcon;
  coverUrl?: string;
  accent?: "blue" | "green" | "violet" | "amber";
}

export function CollectionCard({
  title,
  countLabel,
  icon: Icon,
  coverUrl,
  accent = "blue",
}: CollectionCardProps) {
  return (
    <article className={`mp-collection-card mp-collection-${accent}`}>
      <div className="mp-collection-preview">
        {coverUrl ? (
          <img src={coverUrl} alt={title} className="mp-collection-image" />
        ) : (
          <div className="mp-collection-empty" />
        )}

        <div className="mp-collection-icon-wrap">
          <Icon className="mp-collection-icon" />
        </div>
      </div>

      <div className="mp-collection-copy">
        <h3>{title}</h3>
        <p>{countLabel}</p>
      </div>
    </article>
  );
}
