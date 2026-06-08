import type { LucideIcon } from "lucide-react";

interface CollectionCardProps {
  title: string;
  countLabel: string;
  icon: LucideIcon;
  coverUrl?: string;
  accent?: "blue" | "green" | "violet" | "amber";
  onClick?: () => void;
}

function CollectionContent({
  title,
  countLabel,
  icon: Icon,
  coverUrl,
}: Pick<CollectionCardProps, "title" | "countLabel" | "icon" | "coverUrl">) {
  return (
    <>
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
    </>
  );
}

export function CollectionCard({
  title,
  countLabel,
  icon,
  coverUrl,
  accent = "blue",
  onClick,
}: CollectionCardProps) {
  const className = `mp-collection-card mp-collection-${accent} ${
    onClick ? "is-clickable" : ""
  }`;

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        <CollectionContent
          title={title}
          countLabel={countLabel}
          icon={icon}
          coverUrl={coverUrl}
        />
      </button>
    );
  }

  return (
    <article className={className}>
      <CollectionContent
        title={title}
        countLabel={countLabel}
        icon={icon}
        coverUrl={coverUrl}
      />
    </article>
  );
}
