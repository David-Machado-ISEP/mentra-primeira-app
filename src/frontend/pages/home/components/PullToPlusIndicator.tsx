import type { CSSProperties } from "react";
import { ChevronDown } from "lucide-react";

import "../estilo/PullToPlusIndicator.css";

interface PullToPlusIndicatorProps {
  progress: number;
  isVisible: boolean;
}

export function PullToPlusIndicator({
  progress,
  isVisible,
}: PullToPlusIndicatorProps) {
  const clampedProgress = Math.max(0, Math.min(progress, 1));
  const lineHeight = 24 + clampedProgress * 74;

  const style = {
    "--pull-progress": clampedProgress,
    "--pull-line-height": `${lineHeight}px`,
  } as CSSProperties;

  return (
    <div
      className={`tw-pull-plus-indicator ${
        isVisible ? "tw-pull-plus-indicator-visible" : ""
      } ${clampedProgress > 0.72 ? "tw-pull-plus-indicator-armed" : ""}`}
      style={style}
      aria-hidden="true"
    >
      <span className="tw-pull-plus-line" />
      <span className="tw-pull-plus-chevrons">
        <ChevronDown />
        <ChevronDown />
      </span>
    </div>
  );
}
