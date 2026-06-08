import { Eye, Sparkles } from "lucide-react";


type MemoryAiCategory =
  | "food"
  | "outdoor"
  | "landmark"
  | "city"
  | "shopping"
  | "nightlife"
  | "transport"
  | "people"
  | "general";

type VisualDiscoverySource = "single_tap" | "double_press" | "triple_tap";

interface VisualDiscovery {
  id: string;
  userId: string;
  photoRequestId: string;
  photoDataUrl: string;
  description: string;
  timestamp: string;
  source: VisualDiscoverySource;
  aiCategory?: MemoryAiCategory;
  aiTags?: string[];
  aiConfidence?: number;
}

interface VisualDiscoveriesPanelProps {
  discoveries: VisualDiscovery[];
}

export function VisualDiscoveriesPanel({
  discoveries,
}: VisualDiscoveriesPanelProps) {
  return (
    <section className="vdp-card">
      <div className="vdp-header">
        <div className="vdp-title-row">
          <Eye className="vdp-title-icon" />
          <div>
            <h2>Visual Discoveries</h2>
            <p>Fotos e descrições guardadas automaticamente pelas glasses.</p>
          </div>
        </div>

        <span className="vdp-counter">{discoveries.length} descobertas</span>
      </div>

      {discoveries.length === 0 ? (
        <div className="vdp-empty">
          <Sparkles className="vdp-empty-icon" />
          <p>
            Ainda não há descobertas visuais. Usa o triple tap para perguntar o
            que estás a ver.
          </p>
        </div>
      ) : (
        <div className="vdp-list">
          {discoveries.map((discovery) => (
            <article key={discovery.id} className="vdp-item">
              <img
                src={discovery.photoDataUrl}
                alt="Visual discovery captured by triple tap"
                className="vdp-image"
              />

              <div className="vdp-copy">
                <div className="vdp-meta">
                  <span>{discovery.source === "triple_tap" ? "Triple tap" : "Foto rápida"}</span>
                  <span>{discovery.timestamp}</span>
                </div>

                <p>{discovery.description}</p>

                {discovery.aiCategory && (
                  <small>
                    {discovery.aiCategory} · {Math.round((discovery.aiConfidence ?? 0) * 100)}%
                  </small>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
