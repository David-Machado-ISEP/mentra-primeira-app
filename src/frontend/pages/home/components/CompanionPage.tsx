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
  SlidersHorizontal,
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
  | "itinerary"
  | "voice_question";

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
  userId?: string;
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

const isMenuTranslationInteraction = (interaction: CompanionInteraction) =>
  interaction.type === "translation" &&
  (interaction.source === "gemini_menu_translation" ||
    interaction.source === "long_press");

const isAudioRelatedInteraction = (interaction: CompanionInteraction) =>
  !isMenuTranslationInteraction(interaction) &&
  (interaction.type === "translation" ||
    interaction.type === "transcription" ||
    interaction.type === "long_press");

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
    featuredLabel: "Perguntaste através dos óculos",
    icon: Sparkles,
    tone: "purple",
  },
  photo: {
    label: "Momento captado",
    featuredLabel: "Momento captado pelos óculos",
    icon: Camera,
    tone: "amber",
  },
  translation: {
    label: "Tradução · Menu",
    featuredLabel: "Tradução através dos óculos",
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
    label: "Pergunta nos óculos",
    featuredLabel: "Perguntaste através dos óculos",
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
  voice_question: {
    label: "Pergunta por voz",
    featuredLabel: "Perguntaste por voz ao Companion",
    icon: Mic,
    tone: "teal",
  },
};

const mainInteractionFilterTypes: CompanionInteractionType[] = [
  "ai",
  "photo",
  "translation",
  "triple_tap",
  "recommendation",
  "itinerary",
  "voice_question",
];

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
    { label: "Data", value: interaction.createdAt || "Sem data" },
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
  userId,
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

const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

const [activeInteractionFilters, setActiveInteractionFilters] = useState<
  CompanionInteractionType[]
>(mainInteractionFilterTypes);

const [draftInteractionFilters, setDraftInteractionFilters] = useState<
  CompanionInteractionType[]
>(mainInteractionFilterTypes);


  const [isVoiceQuestionStarting, setIsVoiceQuestionStarting] = useState(false);

  const [voiceQuestionStatus, setVoiceQuestionStatus] = useState<string | null>(
    null,
  );

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

  const openFilterModal = () => {
  setDraftInteractionFilters(activeInteractionFilters);
  setIsFilterModalOpen(true);
};

const toggleDraftInteractionFilter = (type: CompanionInteractionType) => {
  setDraftInteractionFilters((previous) =>
    previous.includes(type)
      ? previous.filter((item) => item !== type)
      : [...previous, type],
  );
};

const selectAllInteractionFilters = () => {
  setDraftInteractionFilters(mainInteractionFilterTypes);
};

const applyInteractionFilters = () => {
  if (draftInteractionFilters.length === 0) return;

  setActiveInteractionFilters(draftInteractionFilters);
  setSelectedInteractionIds([]);
  setIsSelectionMode(false);
  setIsFilterModalOpen(false);
};

  const handleStartVoiceQuestion = async () => {
    if (!userId || isVoiceQuestionStarting) return;

    setIsVoiceQuestionStarting(true);
    setVoiceQuestionStatus("A ativar escuta nos óculos...");

    try {
      const response = await fetch("/api/voice-question/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível iniciar a pergunta.");
      }

      setVoiceQuestionStatus(
        data?.message || "A ouvir. Faz a pergunta através dos óculos.",
      );

      window.setTimeout(() => {
        setVoiceQuestionStatus(null);
      }, 12_000);
    } catch (error) {
      setVoiceQuestionStatus(
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar a pergunta por voz.",
      );
    } finally {
      setIsVoiceQuestionStarting(false);
    }
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

const filteredMainInteractions = useMemo(() => {
  return orderedMainInteractions.filter((interaction) =>
    activeInteractionFilters.includes(interaction.type),
  );
}, [activeInteractionFilters, orderedMainInteractions]);

const timelineInteractions = filteredMainInteractions;

const isInteractionFilterActive =
  activeInteractionFilters.length !== mainInteractionFilterTypes.length;

const activeFilterLabel = isInteractionFilterActive
  ? `${activeInteractionFilters.length} filtros`
  : "Filtrar";

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
    const isPhotoInteraction = interaction.type === "photo";
    const isPhotoMoment = isPhotoInteraction && Boolean(image);

    return (
      <article
        key={interaction.id}
        className={`tw-companion-timeline-item tw-companion-tone-${meta.tone} ${
          isSelected ? "tw-companion-timeline-item-selected" : ""
        } ${isPhotoMoment ? "tw-companion-timeline-item-photo" : ""}`}
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
                className={
                  isPhotoMoment
                    ? "tw-companion-timeline-photo-preview"
                    : "tw-companion-timeline-thumb"
                }
                style={{ backgroundImage: `url(${image})` }}
                aria-hidden="true"
              />
            )}

            <div>
              <h3>
                {isPhotoInteraction ? "Momento captado" : interaction.title}
              </h3>
              <p>
                {isPhotoInteraction
                  ? "Fotografia guardada nesta viagem."
                  : interaction.content}
              </p>
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

        {onEndTrip && (
          <button
            type="button"
            className="tw-companion-end-trip-button tw-companion-header-end-trip"
            onClick={onEndTrip}
            aria-label="Terminar viagem"
            title="Terminar viagem"
          >
            <Power />
          </button>
        )}
      </header>

      <section className="tw-companion-preferences-card">
        <div className="tw-companion-preferences-card-header">
          <span>Preferências da viagem</span>
          {onEditStyle && (
            <button
              type="button"
              className="tw-companion-preferences-edit-button"
              onClick={onEditStyle}
            >
              <Edit3 />
              Editar
            </button>
          )}
        </div>
        <p>{preferenceSummary.join(" · ")}</p>
      </section>

      <section className="tw-companion-glasses-card">
        <span className="tw-companion-glasses-icon" aria-hidden="true">
          <Glasses />
          <span className="tw-companion-online-dot" />
        </span>

        <div className="tw-companion-glasses-copy">
          <h2>Óculos ligados</h2>
          <p>Toca nos óculos para perguntar, traduzir ou captar momentos.</p>

          {voiceQuestionStatus && (
            <p className="tw-companion-voice-status">{voiceQuestionStatus}</p>
          )}
        </div>

        <button
          type="button"
          className="tw-companion-voice-question-button"
          onClick={handleStartVoiceQuestion}
          disabled={isVoiceQuestionStarting || !userId}
        >
          <Mic />
          {isVoiceQuestionStarting ? "A ativar..." : "Perguntar"}
        </button>
      </section>

      {onOpenAudioPage && (
        <button
          type="button"
          className="tw-companion-audio-shortcut"
          onClick={onOpenAudioPage}
          aria-label="Abrir áudio, traduções e transcrições"
        >
          <span className="tw-companion-audio-shortcut-icon" aria-hidden="true">
            <Mic />
          </span>
          <span className="tw-companion-audio-shortcut-copy">
            <strong>Áudios da viagem</strong>
            <small>Transcrições, traduções e interações por voz</small>
          </span>
          <ChevronRight />
        </button>
      )}

      <section className="tw-companion-timeline-section">
        <div className="tw-companion-section-header">
          <div>
            <h2>Últimas interações</h2>
            <p>
  {isInteractionFilterActive
    ? `${timelineInteractions.length} de ${orderedMainInteractions.length} interações`
    : `${timelineInteractions.length} interações guardadas`}
  {audioInteractionCount > 0
    ? ` · ${audioInteractionCount} em áudio`
    : ""}
</p>
          </div>

          <div className="tw-companion-section-actions">
  {orderedMainInteractions.length > 0 && (
    <button
      type="button"
      className={`tw-companion-filter-button ${
        isInteractionFilterActive ? "tw-companion-filter-button-active" : ""
      }`}
      onClick={openFilterModal}
      aria-label="Filtrar interações"
    >
      <SlidersHorizontal />
      {activeFilterLabel}
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
      {isSelectionMode ? "Cancelar" : "Gerir"}
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

      {isFilterModalOpen && (
  <div
    className="tw-companion-filter-backdrop"
    onClick={() => setIsFilterModalOpen(false)}
    role="presentation"
  >
    <article
      className="tw-companion-filter-modal"
      onClick={(event) => event.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Filtrar interações"
    >
      <div className="tw-companion-filter-header">
        <div>
          <span>Filtros</span>
          <h2>Tipos de interação</h2>
        </div>

        <button
          type="button"
          className="tw-companion-filter-close"
          onClick={() => setIsFilterModalOpen(false)}
          aria-label="Fechar filtros"
        >
          <X />
        </button>
      </div>

      <p className="tw-companion-filter-description">
        Escolhe os tipos de interação que queres ver no Companion.
      </p>

      <div className="tw-companion-filter-options">
        {mainInteractionFilterTypes.map((type) => {
          const meta = interactionMeta[type];
          const Icon = meta.icon;
          const isActive = draftInteractionFilters.includes(type);

          return (
            <button
              key={type}
              type="button"
              className={`tw-companion-filter-option ${
                isActive ? "tw-companion-filter-option-active" : ""
              }`}
              onClick={() => toggleDraftInteractionFilter(type)}
            >
              <span
                className={`tw-companion-filter-option-icon tw-companion-modal-icon-${meta.tone}`}
              >
                <Icon />
              </span>

              <span>{meta.label}</span>

              <span className="tw-companion-filter-option-check">
                {isActive ? <Check /> : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="tw-companion-filter-actions">
        <button
          type="button"
          className="tw-companion-filter-secondary"
          onClick={selectAllInteractionFilters}
        >
          Mostrar tudo
        </button>

        <button
          type="button"
          className="tw-companion-filter-primary"
          onClick={applyInteractionFilters}
          disabled={draftInteractionFilters.length === 0}
        >
          Confirmar
        </button>
      </div>
    </article>
  </div>
)}
      
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
