import { useEffect, useMemo, useState } from "react";

import {
  ArrowLeft,
  Bookmark,
  Camera,
  ChevronRight,
  Edit3,
  Glasses,
  Languages,
  MapPin,
  MessageCircle,
  Mic,
  Power,
  Sparkles,
  Star,
  Store,
  ThumbsUp,
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
  imageUrl?: string;
  photoDataUrl?: string;
}

interface CompanionPageProps {
  tripName: string;
  interactions: CompanionInteraction[];
  preferenceSummary?: string[];
  onBack?: () => void;
  onContinue?: () => void;
  onEditStyle?: () => void;
  onChangePreferences?: () => void;
  onEndTrip?: () => void;
}

type CompanionTone = "teal" | "blue" | "amber" | "green" | "purple";

const SAVED_COMPANION_KEY = "travel-whisperer-saved-companion";

const fallbackPreferenceSummary = [
  "Arte e museus",
  "Gastronomia",
  "Ritmo equilibrado",
];

const interactionMeta: Record<
  CompanionInteractionType,
  {
    label: string;
    featuredLabel: string;
    icon: LucideIcon;
    tone: CompanionTone;
  }
> = {
  ai: {
    label: "Pergunta AI",
    featuredLabel: "Perguntaste através das glasses",
    icon: Sparkles,
    tone: "purple",
  },
  photo: {
    label: "Momento captado",
    featuredLabel: "Momento captado pelas glasses",
    icon: Camera,
    tone: "amber",
  },
  translation: {
    label: "Tradução · Menu",
    featuredLabel: "Tradução através das glasses",
    icon: Languages,
    tone: "blue",
  },
  transcription: {
    label: "Transcrição",
    featuredLabel: "Transcrição guardada",
    icon: Mic,
    tone: "purple",
  },
  triple_tap: {
    label: "Pergunta nas glasses",
    featuredLabel: "Perguntaste através das glasses",
    icon: Glasses,
    tone: "teal",
  },
  long_press: {
    label: "Comando de voz",
    featuredLabel: "Pedido feito por voz",
    icon: MessageCircle,
    tone: "teal",
  },
  recommendation: {
    label: "Recomendação",
    featuredLabel: "Recomendação do Companion",
    icon: Store,
    tone: "green",
  },
  itinerary: {
    label: "Roteiro",
    featuredLabel: "Atualização do roteiro",
    icon: MapPin,
    tone: "teal",
  },
};

const formatInteractionTime = (value: string) => {
  if (!value) return "";

  const timeMatch = value.match(/(\d{1,2}:\d{2})/);

  if (!timeMatch) return value;

  return timeMatch[1].padStart(5, "0");
};

const formatLatestSource = (interaction: CompanionInteraction) => {
  const source = interaction.source?.trim() || interactionMeta[interaction.type].label;
  const time = formatInteractionTime(interaction.createdAt);

  return time ? `${source.toUpperCase()} · HOJE, ${time}` : source.toUpperCase();
};

const getFeaturedImage = (interaction: CompanionInteraction) => {
  return interaction.imageUrl || interaction.photoDataUrl || "";
};

export function CompanionPage({
  tripName,
  interactions,
  preferenceSummary = fallbackPreferenceSummary,
  onBack,
  onContinue,
  onEditStyle,
  onChangePreferences,
  onEndTrip,
}: CompanionPageProps) {
  const [savedInteractions, setSavedInteractions] = useState<
    CompanionInteraction[]
  >(() => {
    try {
      const raw = localStorage.getItem(SAVED_COMPANION_KEY);
      const parsed = raw ? JSON.parse(raw) : [];

      if (!Array.isArray(parsed)) return [];

      return parsed;
    } catch {
      return [];
    }
  });

  const savedInteractionIds = useMemo(
    () => new Set(savedInteractions.map((interaction) => interaction.id)),
    [savedInteractions],
  );

  useEffect(() => {
    localStorage.setItem(
      SAVED_COMPANION_KEY,
      JSON.stringify(savedInteractions),
    );
  }, [savedInteractions]);

  const handleSaveInteraction = (interaction: CompanionInteraction) => {
    setSavedInteractions((previous) => {
      const alreadySaved = previous.some((item) => item.id === interaction.id);

      if (alreadySaved) return previous;

      return [interaction, ...previous].slice(0, 60);
    });
  };

  const orderedInteractions = useMemo(() => {
    return [...interactions].reverse();
  }, [interactions]);

  const latestInteraction = orderedInteractions[0] ?? null;
  const timelineInteractions = latestInteraction
    ? orderedInteractions.slice(1)
    : orderedInteractions;

  const handleBack = onBack ?? onContinue;

  const renderLatestInteraction = (interaction: CompanionInteraction) => {
    const meta = interactionMeta[interaction.type];
    const Icon = meta.icon;
    const image = getFeaturedImage(interaction);
    const isSaved = savedInteractionIds.has(interaction.id);

    return (
      <article className="tw-companion-latest-card">
        <div
          className={`tw-companion-latest-image tw-companion-latest-image-${meta.tone}`}
          style={
            image
              ? {
                  backgroundImage: `linear-gradient(180deg, rgba(3, 32, 46, 0.08), rgba(3, 32, 46, 0.12)), url(${image})`,
                }
              : undefined
          }
        >
          <span className="tw-companion-latest-pill">
            <Icon />
            {meta.featuredLabel}
          </span>
        </div>

        <div className="tw-companion-latest-content">
          <button
            type="button"
            className={`tw-companion-star-button ${
              isSaved ? "tw-companion-star-button-active" : ""
            }`}
            onClick={() => handleSaveInteraction(interaction)}
            aria-label={isSaved ? "Interação guardada" : "Guardar interação"}
          >
            <Star />
          </button>

          <h2>“{interaction.title}”</h2>

          <span className="tw-companion-latest-meta">
            {formatLatestSource(interaction)}
          </span>

          <p>{interaction.content}</p>

          <div className="tw-companion-latest-actions">
            <button
              type="button"
              className="tw-companion-primary-action"
              onClick={onContinue}
            >
              Saber mais
            </button>

            <button
              type="button"
              className="tw-companion-secondary-action"
              onClick={() => handleSaveInteraction(interaction)}
              disabled={isSaved}
            >
              <Bookmark />
              {isSaved ? "Guardado" : "Guardar"}
            </button>
          </div>
        </div>
      </article>
    );
  };

  const renderTimelineInteraction = (interaction: CompanionInteraction) => {
    const meta = interactionMeta[interaction.type];
    const Icon = meta.icon;

    return (
      <article
        key={interaction.id}
        className={`tw-companion-timeline-item tw-companion-tone-${meta.tone}`}
      >
        <span className="tw-companion-timeline-marker">
          <Icon />
        </span>

        <div className="tw-companion-timeline-card">
          <div className="tw-companion-timeline-top">
            <span>{meta.label}</span>
            <time>{formatInteractionTime(interaction.createdAt)}</time>
          </div>

          <h3>{interaction.title}</h3>
          <p>{interaction.content}</p>

          <ChevronRight className="tw-companion-timeline-chevron" />
        </div>
      </article>
    );
  };

  return (
    <section className="tw-companion-page">
      <header className="tw-companion-trip-header">
        <button
          type="button"
          className="tw-companion-back-button"
          onClick={handleBack}
          aria-label="Voltar"
        >
          <ArrowLeft />
        </button>

        <div className="tw-companion-trip-title">
          <h1>{tripName || "Viagem atual"}</h1>
          <p>A guardar nesta aventura</p>
        </div>

      </header>

      <p className="tw-companion-preferences-line">
        {preferenceSummary.join(" · ")}
      </p>

      <div className="tw-companion-style-actions">
        <button
          type="button"
          className="tw-companion-style-button"
          onClick={onEditStyle}
        >
          <Edit3 />
          Editar estilo
        </button>

        <button
          type="button"
          className="tw-companion-change-button"
          onClick={onChangePreferences}
        >
          Mudar
        </button>

        {onEndTrip && (
          <button
            type="button"
            className="tw-companion-end-trip-button"
            onClick={onEndTrip}
          >
            <Power />
            <span>Terminar</span>
          </button>
        )}
      </div>

      <section className="tw-companion-glasses-card">
        <span className="tw-companion-glasses-icon" aria-hidden="true">
          <Glasses />
          <span className="tw-companion-online-dot" />
        </span>

        <div>
          <h2>Glasses ligadas</h2>
          <p>Toca nas glasses para perguntar, traduzir ou captar momentos.</p>
        </div>
      </section>

      <section className="tw-companion-latest-section">
        <h2>Última interação</h2>

        {latestInteraction ? (
          renderLatestInteraction(latestInteraction)
        ) : (
          <div className="tw-companion-empty-card">
            <span className="tw-companion-empty-icon">
              <Sparkles />
            </span>

            <h3>Ainda não há interações nesta viagem</h3>

            <p>
              Quando usares a AI, tirares fotos, traduzires menus ou adicionares
              locais ao roteiro, a última interação aparece aqui.
            </p>
          </div>
        )}
      </section>

      <section className="tw-companion-timeline-section">
        <h2>Hoje</h2>

        {timelineInteractions.length === 0 ? (
          <div className="tw-companion-empty-card tw-companion-empty-card-small">
            <span className="tw-companion-empty-icon">
              <ThumbsUp />
            </span>

            <h3>Sem mais interações para mostrar</h3>
            <p>As próximas ações importantes da viagem vão aparecer aqui.</p>
          </div>
        ) : (
          <div className="tw-companion-timeline">
            {timelineInteractions.map((interaction) =>
              renderTimelineInteraction(interaction),
            )}
          </div>
        )}
      </section>
    </section>
  );
}
