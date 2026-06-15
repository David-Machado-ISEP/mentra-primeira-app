import { useEffect, useMemo, useState } from "react";

import {
  ArrowLeft,
  Bookmark,
  Camera,
  Check,
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
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";

import "../estilo/CompanionPage.css";
import type { Photo } from "./PhotoStream";

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
  photoId?: string;
}

interface CompanionPageProps {
  tripName: string;
  interactions: CompanionInteraction[];
  photos?: Photo[];
  preferenceSummary?: string[];
  onBack?: () => void;
  onContinue?: () => void;
  onEditStyle?: () => void;
  onChangePreferences?: () => void;
  onOpenAudioPage?: () => void;
  onEndTrip?: () => void;
  onDeleteInteractions?: (interactionIds: string[]) => void;
}

type CompanionTone = "teal" | "blue" | "amber" | "green" | "purple";

const SAVED_COMPANION_KEY = "travel-whisperer-saved-companion";

const isLocalDataImage = (value?: string) =>
  typeof value === "string" && value.startsWith("data:image/");

const getStorageSafeInteraction = (interaction: CompanionInteraction) => {
  const safeInteraction = { ...interaction };

  if (isLocalDataImage(safeInteraction.imageUrl)) {
    delete safeInteraction.imageUrl;
  }

  if (isLocalDataImage(safeInteraction.photoDataUrl)) {
    delete safeInteraction.photoDataUrl;
  }

  return safeInteraction;
};

const fallbackPreferenceSummary = [
  "Arte e museus",
  "Gastronomia",
  "Ritmo equilibrado",
];

const isAudioRelatedInteraction = (interaction: CompanionInteraction) =>
  interaction.type === "translation" ||
  interaction.type === "transcription" ||
  interaction.type === "long_press";

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
  const source =
    interaction.source?.trim() || interactionMeta[interaction.type].label;
  const time = formatInteractionTime(interaction.createdAt);

  return time
    ? `${source.toUpperCase()} · HOJE, ${time}`
    : source.toUpperCase();
};

const getFeaturedImage = (
  interaction: CompanionInteraction,
  photos: Photo[],
) => {
  if (interaction.imageUrl || interaction.photoDataUrl) {
    return interaction.imageUrl || interaction.photoDataUrl || "";
  }

  if (!interaction.photoId) return "";

  return (
    photos.find(
      (photo) =>
        photo.id === interaction.photoId ||
        photo.requestId === interaction.photoId,
    )?.url || ""
  );
};

const getInteractionDetails = (
  interaction: CompanionInteraction,
  photos: Photo[],
) => {
  const image = getFeaturedImage(interaction, photos);

  return [
    { label: "Tipo", value: interactionMeta[interaction.type].label },
    { label: "Origem", value: interaction.source || "Companion" },
    { label: "Data", value: interaction.createdAt || "Sem data" },
    { label: "ID", value: interaction.id },
    interaction.photoId
      ? { label: "Foto associada", value: interaction.photoId }
      : null,
    image ? { label: "Imagem", value: "Disponível" } : null,
  ].filter(Boolean) as { label: string; value: string }[];
};

export function CompanionPage({
  tripName,
  interactions,
  photos = [],
  preferenceSummary = fallbackPreferenceSummary,
  onBack,
  onContinue,
  onEditStyle,
  onChangePreferences,
  onOpenAudioPage,
  onEndTrip,
  onDeleteInteractions,
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

  const [selectedInteraction, setSelectedInteraction] =
    useState<CompanionInteraction | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedInteractionIds, setSelectedInteractionIds] = useState<
    string[]
  >([]);

  const savedInteractionIds = useMemo(
    () => new Set(savedInteractions.map((interaction) => interaction.id)),
    [savedInteractions],
  );

  useEffect(() => {
    localStorage.setItem(
      SAVED_COMPANION_KEY,
      JSON.stringify(savedInteractions.map(getStorageSafeInteraction)),
    );
  }, [savedInteractions]);

  const handleSaveInteraction = (interaction: CompanionInteraction) => {
    setSavedInteractions((previous) => {
      const alreadySaved = previous.some((item) => item.id === interaction.id);

      if (alreadySaved) return previous;

      return [getStorageSafeInteraction(interaction), ...previous].slice(0, 60);
    });
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode((previous) => !previous);
    setSelectedInteractionIds([]);
  };

  const toggleInteractionSelection = (interactionId: string) => {
    setSelectedInteractionIds((previous) =>
      previous.includes(interactionId)
        ? previous.filter((id) => id !== interactionId)
        : [...previous, interactionId],
    );
  };

  const handleDeleteSelectedInteractions = () => {
    if (!selectedInteractionIds.length || !onDeleteInteractions) return;

    onDeleteInteractions(selectedInteractionIds);
    setSavedInteractions((previous) =>
      previous.filter(
        (interaction) => !selectedInteractionIds.includes(interaction.id),
      ),
    );
    setSelectedInteractionIds([]);
    setIsSelectionMode(false);
  };

  const handleDeleteInteraction = (interactionId: string) => {
    if (!onDeleteInteractions) return;

    onDeleteInteractions([interactionId]);
    setSavedInteractions((previous) =>
      previous.filter((interaction) => interaction.id !== interactionId),
    );
    setSelectedInteraction(null);
  };

  const audioInteractionCount = useMemo(
    () => interactions.filter(isAudioRelatedInteraction).length,
    [interactions],
  );

  const orderedMainInteractions = useMemo(() => {
    return [...interactions]
      .filter((interaction) => !isAudioRelatedInteraction(interaction))
      .reverse();
  }, [interactions]);

  const latestInteraction = orderedMainInteractions[0] ?? null;
  const timelineInteractions = orderedMainInteractions;

  const handleBack = onBack ?? onContinue;

  const renderLatestInteraction = (interaction: CompanionInteraction) => {
    const meta = interactionMeta[interaction.type];
    const Icon = meta.icon;
    const image = getFeaturedImage(interaction, photos);
    const isSaved = savedInteractionIds.has(interaction.id);

    return (
      <article
        className="tw-companion-latest-card"
        onClick={() => setSelectedInteraction(interaction)}
        role="button"
        tabIndex={0}
      >
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
            onClick={(event) => {
              event.stopPropagation();
              handleSaveInteraction(interaction);
            }}
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
              onClick={(event) => {
                event.stopPropagation();
                setSelectedInteraction(interaction);
              }}
            >
              Saber mais
            </button>

            <button
              type="button"
              className="tw-companion-secondary-action"
              onClick={(event) => {
                event.stopPropagation();
                handleSaveInteraction(interaction);
              }}
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
    const image = getFeaturedImage(interaction, photos);
    const isSelected = selectedInteractionIds.includes(interaction.id);

    return (
      <article
        key={interaction.id}
        className={`tw-companion-timeline-item tw-companion-tone-${meta.tone} ${
          isSelected ? "tw-companion-timeline-item-selected" : ""
        }`}
        onClick={() => {
          if (isSelectionMode) {
            toggleInteractionSelection(interaction.id);
            return;
          }

          setSelectedInteraction(interaction);
        }}
        role="button"
        tabIndex={0}
        aria-label={
          isSelectionMode
            ? "Selecionar interação"
            : "Abrir detalhes da interação"
        }
      >
        <span className="tw-companion-timeline-marker">
          {isSelectionMode ? (
            <span
              className={`tw-companion-selection-check ${
                isSelected ? "tw-companion-selection-check-active" : ""
              }`}
            >
              {isSelected ? <Check /> : null}
            </span>
          ) : (
            <Icon />
          )}
        </span>

        <div className="tw-companion-timeline-card">
          <div className="tw-companion-timeline-top">
            <span>{meta.label}</span>
            <time>{formatInteractionTime(interaction.createdAt)}</time>
          </div>

          <div className="tw-companion-timeline-body">
            {image && (
              <span
                className="tw-companion-timeline-thumb"
                style={{ backgroundImage: `url(${image})` }}
                aria-hidden="true"
              />
            )}

            <div>
              <h3>{interaction.title}</h3>
              <p>{interaction.content}</p>
            </div>
          </div>

          {!isSelectionMode && (
            <ChevronRight className="tw-companion-timeline-chevron" />
          )}
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
              Quando usares a AI, tirares fotos ou adicionares locais ao
              roteiro, a última interação aparece aqui. Traduções e
              transcrições ficam na área de áudio.
            </p>
          </div>
        )}
      </section>

      <section className="tw-companion-timeline-section">
        <div className="tw-companion-section-header">
          <div>
            <h2>Últimas interações</h2>
            <p>
              {timelineInteractions.length} interações guardadas
              {audioInteractionCount > 0
                ? ` · ${audioInteractionCount} em áudio`
                : ""}
            </p>
          </div>

          <div className="tw-companion-section-actions">
            {onOpenAudioPage && (
              <button
                type="button"
                className="tw-round-action tw-companion-audio-button"
                onClick={onOpenAudioPage}
                aria-label="Abrir áudio, traduções e transcrições"
                title="Áudios"
              >
                <Mic className="tw-round-action-icon" />
              </button>
            )}

            {timelineInteractions.length > 0 && onDeleteInteractions && (
              <button
                type="button"
                className={`tw-companion-select-button ${
                  isSelectionMode ? "tw-companion-select-button-active" : ""
                }`}
                onClick={toggleSelectionMode}
              >
                {isSelectionMode ? "Cancelar" : "Selecionar"}
              </button>
            )}
          </div>
        </div>

        {isSelectionMode && (
          <div className="tw-companion-selection-toolbar">
            <span>{selectedInteractionIds.length} selecionadas</span>
            <button
              type="button"
              onClick={handleDeleteSelectedInteractions}
              disabled={selectedInteractionIds.length === 0}
            >
              <Trash2 />
              Apagar
            </button>
          </div>
        )}

        {timelineInteractions.length === 0 ? (
          <div className="tw-companion-empty-card tw-companion-empty-card-small">
            <span className="tw-companion-empty-icon">
              <ThumbsUp />
            </span>

            <h3>Sem interações para mostrar</h3>
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

      {selectedInteraction && (
        <div
          className="tw-companion-modal-backdrop"
          onClick={() => setSelectedInteraction(null)}
          role="presentation"
        >
          <article
            className="tw-companion-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Detalhes da interação"
          >
            <button
              type="button"
              className="tw-companion-modal-close"
              onClick={() => setSelectedInteraction(null)}
              aria-label="Fechar detalhes"
            >
              <X />
            </button>

            {(() => {
              const meta = interactionMeta[selectedInteraction.type];
              const Icon = meta.icon;
              const image = getFeaturedImage(selectedInteraction, photos);
              const details = getInteractionDetails(
                selectedInteraction,
                photos,
              );

              return (
                <>
                  <div className="tw-companion-modal-title-row">
                    <span
                      className={`tw-companion-modal-icon tw-companion-modal-icon-${meta.tone}`}
                    >
                      <Icon />
                    </span>
                    <div>
                      <span>{meta.label}</span>
                      <h2>{selectedInteraction.title}</h2>
                    </div>
                  </div>

                  {image && (
                    <div
                      className="tw-companion-modal-image"
                      style={{ backgroundImage: `url(${image})` }}
                    />
                  )}

                  <p className="tw-companion-modal-content">
                    {selectedInteraction.content}
                  </p>

                  <dl className="tw-companion-modal-details">
                    {details.map((detail) => (
                      <div key={detail.label}>
                        <dt>{detail.label}</dt>
                        <dd>{detail.value}</dd>
                      </div>
                    ))}
                  </dl>

                  {onDeleteInteractions && (
                    <button
                      type="button"
                      className="tw-companion-modal-delete"
                      onClick={() =>
                        handleDeleteInteraction(selectedInteraction.id)
                      }
                    >
                      <Trash2 />
                      Apagar esta interação
                    </button>
                  )}
                </>
              );
            })()}
          </article>
        </div>
      )}
    </section>
  );
}
