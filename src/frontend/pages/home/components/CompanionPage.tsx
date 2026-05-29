import { useMemo, useState } from "react";

import {
  Camera,
  CheckCircle2,
  Clock3,
  Eye,
  Languages,
  ListFilter,
  MapPin,
  MessageCircle,
  Mic,
  Route,
  Sparkles,
  ThumbsUp,
  Wand2,
  Zap,
  type LucideIcon,
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

type CompanionFilter = "all" | "assistant" | "glasses" | "media" | "route";

const interactionMeta: Record<
  CompanionInteractionType,
  {
    label: string;
    icon: LucideIcon;
  }
> = {
  ai: {
    label: "AI",
    icon: Sparkles,
  },
  photo: {
    label: "Momento captado",
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
    label: "Sugestão",
    icon: ThumbsUp,
  },
  itinerary: {
    label: "Roteiro",
    icon: MapPin,
  },
};

const filterLabels: Record<CompanionFilter, string> = {
  all: "Tudo",
  assistant: "AI",
  glasses: "Óculos",
  media: "Fotos & voz",
  route: "Roteiro",
};

const filterTypeMap: Record<CompanionFilter, CompanionInteractionType[]> = {
  all: [
    "ai",
    "photo",
    "translation",
    "transcription",
    "triple_tap",
    "long_press",
    "recommendation",
    "itinerary",
  ],
  assistant: ["ai", "translation", "transcription"],
  glasses: ["triple_tap", "long_press"],
  media: ["photo", "transcription", "translation"],
  route: ["recommendation", "itinerary"],
};

export function CompanionPage({
  tripName,
  interactions,
}: CompanionPageProps) {
  const [activeFilter, setActiveFilter] = useState<CompanionFilter>("all");

  const orderedInteractions = useMemo(() => {
    return [...interactions].reverse();
  }, [interactions]);

  const latestInteraction = orderedInteractions[0] ?? null;

  const timelineInteractions = useMemo(() => {
    const allowedTypes = filterTypeMap[activeFilter];

    return orderedInteractions
      .slice(latestInteraction ? 1 : 0)
      .filter((interaction) => allowedTypes.includes(interaction.type));
  }, [activeFilter, latestInteraction, orderedInteractions]);

  const summary = useMemo(() => {
    return {
      total: interactions.length,
      assistant: interactions.filter((interaction) =>
        filterTypeMap.assistant.includes(interaction.type),
      ).length,
      glasses: interactions.filter((interaction) =>
        filterTypeMap.glasses.includes(interaction.type),
      ).length,
      route: interactions.filter((interaction) =>
        filterTypeMap.route.includes(interaction.type),
      ).length,
    };
  }, [interactions]);

  const renderInteractionCard = (
    interaction: CompanionInteraction,
    variant: "featured" | "timeline" = "timeline",
  ) => {
    const meta = interactionMeta[interaction.type];
    const Icon = meta.icon;

    return (
      <article
        key={interaction.id}
        className={`tw-companion-interaction-card ${
          variant === "featured" ? "tw-companion-interaction-featured" : ""
        }`}
      >
        <div className="tw-companion-interaction-icon">
          <Icon />
        </div>

        <div className="tw-companion-interaction-body">
          <div className="tw-companion-interaction-top">
            <span>{meta.label}</span>
            <time>{interaction.createdAt}</time>
          </div>

          <h3>{interaction.title}</h3>

          <p>{interaction.content}</p>

          {interaction.source && (
            <span className="tw-companion-source">{interaction.source}</span>
          )}

          {variant === "featured" && (
            <div className="tw-companion-featured-actions">
              <button type="button" className="tw-companion-primary-action">
                Continuar
              </button>

              <button type="button" className="tw-companion-secondary-action">
                Guardar
              </button>
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <section className="tw-companion-page">
      <header className="tw-companion-trip-header">
        <div>
          <p className="tw-companion-trip-kicker">Companion da viagem</p>

          <h1>{tripName || "Viagem atual"}</h1>

          <p>A guardar memórias incríveis</p>
        </div>

        <button
          type="button"
          className="tw-companion-header-action"
          aria-label="Ver resumo da viagem"
        >
          <Sparkles />
        </button>
      </header>

      <div className="tw-companion-preferences-row">
        <span>Arte e museus</span>
        <span>Gastronomia</span>
        <span>Ritmo equilibrado</span>
      </div>

      <section className="tw-companion-glasses-card">
        <div className="tw-companion-glasses-icon">
          <Eye />
        </div>

        <div>
          <h2>Glasses ligadas</h2>

          <p>Toca nas glasses para perguntar, traduzir ou captar momentos.</p>
        </div>

        <span className="tw-companion-glasses-arrow">›</span>
      </section>

      <section className="tw-companion-summary-section">
        <h2>Resumo da atividade</h2>

        <div className="tw-companion-summary-card">
          <div className="tw-companion-summary-item">
            <MessageCircle />
            <strong>{summary.total}</strong>
            <span>Total interações</span>
          </div>

          <div className="tw-companion-summary-item">
            <Wand2 />
            <strong>{summary.assistant}</strong>
            <span>Com a AI</span>
          </div>

          <div className="tw-companion-summary-item">
            <Eye />
            <strong>{summary.glasses}</strong>
            <span>Dos óculos</span>
          </div>

          <div className="tw-companion-summary-item">
            <Route />
            <strong>{summary.route}</strong>
            <span>Roteiro</span>
          </div>
        </div>
      </section>

      <section className="tw-companion-latest-section">
        <div className="tw-companion-section-title-row">
          <h2>Última interação</h2>

          {latestInteraction && <span>Hoje</span>}
        </div>

        {latestInteraction ? (
          renderInteractionCard(latestInteraction, "featured")
        ) : (
          <div className="tw-companion-empty-card">
            <CheckCircle2 />

            <h3>Ainda não há interações nesta viagem</h3>

            <p>
              Quando usares a AI, tirares fotos, traduzires menus ou adicionares
              locais ao roteiro, a última interação aparece aqui.
            </p>
          </div>
        )}
      </section>

      <section className="tw-companion-timeline-section">
        <div className="tw-companion-section-title-row">
          <h2>Hoje</h2>

          <ListFilter />
        </div>

        <div className="tw-companion-filters">
          {(Object.keys(filterLabels) as CompanionFilter[]).map((filter) => (
            <button
              key={filter}
              type="button"
              className={`tw-companion-filter ${
                activeFilter === filter ? "tw-companion-filter-active" : ""
              }`}
              onClick={() => setActiveFilter(filter)}
            >
              {filterLabels[filter]}
            </button>
          ))}
        </div>

        {timelineInteractions.length === 0 ? (
          <div className="tw-companion-empty-card tw-companion-empty-card-small">
            <Sparkles />

            <h3>Sem mais interações para mostrar</h3>

            <p>
              As próximas ações importantes da viagem vão aparecer nesta
              timeline.
            </p>
          </div>
        ) : (
          <div className="tw-companion-timeline">
            {timelineInteractions.map((interaction) =>
              renderInteractionCard(interaction),
            )}
          </div>
        )}
      </section>
    </section>
  );
}