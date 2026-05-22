import type { ReactNode } from "react";

interface OnboardingSlideProps {
  eyebrow?: string;
  title: string;
  description?: string;
  media?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function OnboardingSlide({
  eyebrow,
  title,
  description,
  media,
  children,
  footer,
  className = "",
}: OnboardingSlideProps) {
  return (
    <section className={`ob-slide ${className}`} aria-label={title}>
      {media && <div className="ob-slide-media">{media}</div>}

      <div className="ob-slide-body">
        <div className="ob-slide-copy">
          {eyebrow && <p className="ob-eyebrow">{eyebrow}</p>}
          <h1 className="ob-title">{title}</h1>
          {description && <p className="ob-description">{description}</p>}
        </div>

        {children && <div className="ob-slide-content">{children}</div>}
      </div>

      {footer && <div className="ob-slide-footer">{footer}</div>}
    </section>
  );
}
