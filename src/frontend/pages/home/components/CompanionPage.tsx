import {
  Camera,
  Languages,
  MapPin,
  MessageCircle,
  Mic,
  Sparkles,
  ThumbsUp,
  Zap,
} from "lucide-react";

import "../estilo/CompanionPage.css";

export type CompanionInteractionType =
  | "ai"
  | "photo"
  | "translation"
  | "transcription"
  | "triple_tap"
  | "long_press"
  | "recommendation"
  | "itinerary";

export interface CompanionInteraction {
  id: string;
  tripId: string;
  type: CompanionInteractionType;
  title: string;
  content: string;
  createdAt: string;
  source?: string;
}

interface CompanionPageProps {
  tripName: string;
  interactions: CompanionInteraction[];
}

const interactionMeta: Record<
  CompanionInteractionType,
  {
    label: string;
    icon: typeof Sparkles;
  }
> = {
  ai: {
    label: "AI",
    icon: Sparkles,
  },
  photo: {
    label: "Foto",
    icon: Camera,
  },
  translation: {
    label: "Tradução",
    icon: Languages,
  },
  transcription: {
    label: "Transcrição",
    icon: Mic,
  },
  triple_tap: {
    label: "Triple tap",
    icon: Zap,
  },
  long_press: {
    label: "Long press",
    icon: MessageCircle,
  },
  recommendation: {
    label: "Recomendação",
    icon: ThumbsUp,
  },
  itinerary: {
    label: "Roteiro",
    icon: MapPin,
  },
};

export function CompanionPage({
  tripName,
  interactions,
}: CompanionPageProps) {
  return (
    <section className="tw-companion-card">
      <header className="tw-companion-header">
        <div>
          <p className="tw-companion-kicker">Companion da viagem</p>

          <h1>{tripName || "Viagem atual"}</h1>

          <p>
            Aqui ficam guardadas as interações importantes desta viagem: ações
            dos óculos, respostas da AI, fotos, traduções, transcrições e locais
            adicionados ao roteiro.
          </p>
        </div>

        <span className="tw-companion-count">
          {interactions.length} interações
        </span>
      </header>

      {interactions.length === 0 ? (
        <div className="tw-companion-empty">
          <div className="tw-companion-empty-icon">
            <Sparkles />
          </div>

          <h2>Ainda não há interações nesta viagem</h2>

          <p>
            Quando usares triple tap, tirares fotos, traduzires conteúdos ou
            adicionares locais ao roteiro, tudo vai aparecer aqui.
          </p>
        </div>
      ) : (
        <div className="tw-companion-timeline">
          {interactions.map((interaction) => {
            const meta = interactionMeta[interaction.type];
            const Icon = meta.icon;

            return (
              <article key={interaction.id} className="tw-companion-item">
                <div className="tw-companion-item-icon">
                  <Icon />
                </div>

                <div className="tw-companion-item-body">
                  <div className="tw-companion-item-top">
                    <span>{meta.label}</span>
                    <time>{interaction.createdAt}</time>
                  </div>

                  <h2>{interaction.title}</h2>

                  <p>{interaction.content}</p>

                  {interaction.source && (
                    <span className="tw-companion-source">
                      {interaction.source}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}