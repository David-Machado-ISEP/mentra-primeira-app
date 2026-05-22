import { Eye, Sparkles } from "lucide-react";


interface VisualDiscovery {
  id: string;
  userId: string;
  photoRequestId: string;
  photoDataUrl: string;
  description: string;
  timestamp: string;
  source: "triple_tap";
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
            <p>Fotos e descrições guardadas quando usas o triple tap.</p>
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
                  <span>Triple tap</span>
                  <span>{discovery.timestamp}</span>
                </div>

                <p>{discovery.description}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
