import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle,
  CircleDollarSign,
  Clock,
  Heart,
  ListFilter,
  Map,
  MapPin,
  Navigation,
  Moon,
  Sparkles,
  Sun,
  Sunset,
  X,
} from "lucide-react";

import "../estilo/ItineraryPage.css";

import { ItineraryMapModal } from "./ItineraryMapModal";

export type ItineraryBudget = "low" | "medium" | "high";

export type ItineraryItemStatus = "favorite" | "toVisit" | "visited";

export interface ItineraryItem {
  id: string;
  name: string;
  category: string;
  description: string;
  estimatedTime: string;
  budget: ItineraryBudget;
  interests: string[];
  reason?: string;
  tripId: string;
  addedAt: string;
  source: "smart" | "nearby";
  status?: ItineraryItemStatus;
  isFavorite?: boolean;
  imageUrl?: string;
  optimizedOrder?: number;
  optimizedPeriod?: "morning" | "afternoon" | "night";
  aiOptimizationReason?: string;
}

interface ItineraryTrip {
  id: string;
  name: string;
  destination?: string;
  startedAt?: string;
  endedAt?: string | null;
}

interface ItineraryPageProps {
  currentTrip: ItineraryTrip | null;
  items: ItineraryItem[];
  budgetLabels: Record<ItineraryBudget, string>;
  preferenceInterestLabels: Record<string, string>;
  onRemoveItem: (item: ItineraryItem) => void;
  onMoveToVisit: (item: ItineraryItem) => void;
  onMarkAsVisited: (item: ItineraryItem) => void;
  onRemoveFromVisit: (item: ItineraryItem) => void;
  onOptimizeItinerary: (items: ItineraryItem[]) => Promise<void>;
  onGoToRecommendations: () => void;
}

interface ItineraryPeriodGroup {
  key: "morning" | "afternoon" | "night";
  label: string;
  icon: ReactNode;
  items: ItineraryItem[];
}

const normalizeTripTitle = (name?: string | null) => {
  const trimmed = name?.trim();

  if (!trimmed || trimmed.toLowerCase() === "sem nome") {
    return "Porto";
  }

  return trimmed;
};

const getDestinationLabel = (trip: ItineraryTrip | null) => {
  const destination = trip?.destination?.split(",")[0]?.trim();
  return destination || normalizeTripTitle(trip?.name);
};

const formatShortDate = (value: string) => {
  if (!value) return "Agora";

  const [date] = value.split(",");
  return date.trim();
};

const formatAddedDate = (value: string) => {
  if (!value) return "Adicionado agora";

  const [date] = value.split(",");
  return `Adicionado: ${date.trim()}`;
};

const formatInterest = (
  interest: string,
  preferenceInterestLabels: Record<string, string>,
) => preferenceInterestLabels[interest] ?? interest;

const capitalize = (value: string) =>
  value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;

const getTodayLabel = () => {
  const formatted = new Intl.DateTimeFormat("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return capitalize(formatted);
};

const parseDate = (value?: string | null) => {
  if (!value) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getTripDurationLabel = (trip: ItineraryTrip | null) => {
  const startedAt = parseDate(trip?.startedAt);
  const endedAt = parseDate(trip?.endedAt ?? null) ?? new Date();

  if (!startedAt) return "3 dias";

  const diffMs = endedAt.getTime() - startedAt.getTime();
  const days = Math.max(1, Math.ceil(diffMs / 86_400_000) + 1);

  return `${days} ${days === 1 ? "dia" : "dias"}`;
};

const normalizeKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const explorePlaceImages: Record<string, string> = {
  "livraria-lello":
    "https://images.unsplash.com/photo-1529148482759-b35b25c5f217?auto=format&fit=crop&w=520&q=80",
  "ribeira-porto":
    "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=520&q=80",
  "ribeira-do-porto":
    "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=520&q=80",
  "cais-da-ribeira":
    "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=520&q=80",
  "cafe-majestic":
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=520&q=80",
  "ponte-luis-i":
    "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=520&q=80",
  "mercado-bolhao":
    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=520&q=80",
  "jardins-palacio-cristal":
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=520&q=80",
  "jardins-do-palacio-de-cristal":
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=520&q=80",
  "museu-soares-dos-reis":
    "https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=520&q=80",
  "foz-douro":
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=520&q=80",
  "foz-do-douro":
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=520&q=80",
  "parque-urbano-rio-tinto":
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=520&q=80",
  "quinta-das-freiras":
    "https://images.unsplash.com/photo-1513735492246-483525079686?auto=format&fit=crop&w=520&q=80",
  "parque-oriental-porto":
    "https://images.unsplash.com/photo-1476611338391-6f395a0ebc7b?auto=format&fit=crop&w=520&q=80",
  "parque-oriental-do-porto":
    "https://images.unsplash.com/photo-1476611338391-6f395a0ebc7b?auto=format&fit=crop&w=520&q=80",
};

const getExploreFallbackImage = (item: ItineraryItem, width = 520) => {
  if (item.imageUrl) return item.imageUrl;

  const idKey = normalizeKey(item.id);
  const nameKey = normalizeKey(item.name);
  const syncedImage = explorePlaceImages[idKey] ?? explorePlaceImages[nameKey];

  if (syncedImage) return syncedImage.replace(/w=\d+/, `w=${width}`);

  const category = normalizeKey(item.category);
  const interests = item.interests.map(normalizeKey).join("|");

  if (
    interests.includes("local-food") ||
    category.includes("cafe") ||
    category.includes("restaurante") ||
    category.includes("gastronomia")
  ) {
    return `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=${width}&q=80`;
  }

  if (
    interests.includes("nature") ||
    interests.includes("natureza") ||
    interests.includes("beaches") ||
    interests.includes("praias") ||
    category.includes("natureza") ||
    category.includes("praia")
  ) {
    return `https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=${width}&q=80`;
  }

  if (category.includes("museu")) {
    return `https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=${width}&q=80`;
  }

  if (
    interests.includes("architecture") ||
    interests.includes("arquitetura") ||
    interests.includes("monuments") ||
    interests.includes("monumentos") ||
    category.includes("monumento") ||
    category.includes("historia") ||
    category.includes("arquitetura")
  ) {
    return `https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=${width}&q=80`;
  }

  return `https://images.unsplash.com/photo-1513735492246-483525079686?auto=format&fit=crop&w=${width}&q=80`;
};

const getPlaceLocation = (item: ItineraryItem, destination: string) => {
  if (item.source === "nearby") return "Perto de ti";
  if (destination) return destination;
  return "Roteiro";
};

const splitItemsByPeriod = (items: ItineraryItem[]): ItineraryPeriodGroup[] => {
  const emptyGroups: ItineraryPeriodGroup[] = [
    { key: "morning", label: "Manhã", icon: <Sun size={35} />, items: [] },
    {
      key: "afternoon",
      label: "Tarde",
      icon: <Sunset size={35} />,
      items: [],
    },
    { key: "night", label: "Noite", icon: <Moon size={32} />, items: [] },
  ];

  if (items.length === 0) return emptyGroups;

  const hasOptimizedPeriods = items.some((item) => item.optimizedPeriod);

  if (hasOptimizedPeriods) {
    const periodFallbacks: Array<ItineraryPeriodGroup["key"]> = [
      "morning",
      "afternoon",
      "night",
    ];

    return emptyGroups.map((group) => ({
      ...group,
      items: items.filter((item, index) => {
        const fallbackPeriod = periodFallbacks[index % periodFallbacks.length];
        return (item.optimizedPeriod ?? fallbackPeriod) === group.key;
      }),
    }));
  }

  const morningCount = items.length >= 6 ? 3 : Math.ceil(items.length / 2);
  const afternoonCount =
    items.length >= 6 ? 3 : Math.ceil((items.length - morningCount) / 2);

  return [
    {
      ...emptyGroups[0],
      items: items.slice(0, morningCount),
    },
    {
      ...emptyGroups[1],
      items: items.slice(morningCount, morningCount + afternoonCount),
    },
    {
      ...emptyGroups[2],
      items: items.slice(morningCount + afternoonCount),
    },
  ];
};

export function ItineraryPage({
  currentTrip,
  items,
  budgetLabels,
  preferenceInterestLabels,
  onRemoveItem,
  onMoveToVisit,
  onMarkAsVisited,
  onRemoveFromVisit,
  onOptimizeItinerary,
  onGoToRecommendations,
}: ItineraryPageProps) {
  const [activeList, setActiveList] = useState<ItineraryItemStatus>("toVisit");
  const [selectedItem, setSelectedItem] = useState<ItineraryItem | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isOptimizingItinerary, setIsOptimizingItinerary] = useState(false);
  const [optimizationMessage, setOptimizationMessage] = useState<string | null>(null);

  const normalizedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        status: item.status ?? "favorite",
        isFavorite: item.isFavorite ?? true,
      })),
    [items],
  );

  const favoriteItems = normalizedItems.filter(
    (item) => item.isFavorite !== false,
  );

  const toVisitItems = normalizedItems.filter(
    (item) => item.status === "toVisit",
  );

  const visitedItems = normalizedItems.filter(
    (item) => item.status === "visited",
  );

  const unsortedActiveItems =
    activeList === "favorite"
      ? favoriteItems
      : activeList === "toVisit"
        ? toVisitItems
        : visitedItems;

  const activeItems =
    activeList === "toVisit"
      ? [...unsortedActiveItems].sort(
          (a, b) =>
            (a.optimizedOrder ?? Number.MAX_SAFE_INTEGER) -
            (b.optimizedOrder ?? Number.MAX_SAFE_INTEGER),
        )
      : unsortedActiveItems;

  const selectedItemData = selectedItem
    ? (normalizedItems.find((item) => item.id === selectedItem.id) ??
      selectedItem)
    : null;

  useEffect(() => {
    if (!selectedItem) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedItem(null);
      }
    };

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [selectedItem]);

  const tripDestination = getDestinationLabel(currentTrip);
  const tripDuration = getTripDurationLabel(currentTrip);
  const periodGroups = splitItemsByPeriod(activeItems);

  const emptyListCopy = {
    favorite: {
      title: "Ainda não tens favoritos",
      description:
        "Vai às recomendações e carrega em “Gostei” para guardares locais para decidir mais tarde.",
    },
    toVisit: {
      title: "Ainda não escolheste locais para visitar",
      description:
        "Abre os favoritos e adiciona à lista a visitar os locais que queres mesmo incluir no roteiro.",
    },
    visited: {
      title: "Ainda não marcaste locais como visitados",
      description:
        "Quando visitares um local da lista a visitar, marca-o como visitado para ficar registado no roteiro.",
    },
  }[activeList];

  const getCompactStatusLabel = (item: ItineraryItem) => {
    if (item.status === "visited") return "Visitado";
    if (item.status === "toVisit") return "A visitar";
    return "Favorito";
  };

  const handleFavoriteToggle = (item: ItineraryItem) => {
    if (item.isFavorite !== false) {
      onRemoveItem(item);
    }
  };

  const handleOptimizeItinerary = async () => {
    if (toVisitItems.length < 2 || isOptimizingItinerary) return;

    setIsOptimizingItinerary(true);
    setOptimizationMessage(null);

    try {
      await onOptimizeItinerary(toVisitItems);
      setActiveList("toVisit");
      setOptimizationMessage("Roteiro otimizado com IA.");
    } catch (error) {
      console.error("[Itinerary] Failed to optimize itinerary", error);
      setOptimizationMessage("Não foi possível otimizar agora.");
    } finally {
      setIsOptimizingItinerary(false);
    }
  };

  const renderItemPrimaryAction = (item: ItineraryItem) => {
    const status = item.status ?? "favorite";

    if (activeList === "favorite") {
      if (status === "toVisit") {
        return (
          <div className="tw-itinerary-modal-status">
            <Navigation size={16} />
            <span>Adicionado a visitar</span>
          </div>
        );
      }

      if (status === "visited") {
        return (
          <div className="tw-itinerary-modal-status">
            <CheckCircle size={16} />
            <span>Já foi visitado</span>
          </div>
        );
      }

      return (
        <button
          type="button"
          className="tw-itinerary-modal-primary tw-itinerary-modal-primary--visit"
          onClick={() => onMoveToVisit(item)}
        >
          <Navigation size={17} />
          <span>Adicionar a visitar</span>
        </button>
      );
    }

    if (activeList === "toVisit") {
      return (
        <button
          type="button"
          className="tw-itinerary-modal-primary tw-itinerary-modal-primary--visited"
          onClick={() => onMarkAsVisited(item)}
        >
          <CheckCircle size={17} />
          <span>Marcar como visitado</span>
        </button>
      );
    }

    return (
      <div className="tw-itinerary-modal-status">
        <CheckCircle size={16} />
        <span>Visitado</span>
      </div>
    );
  };

  const renderItemSecondaryAction = (item: ItineraryItem) => {
    const isFavoriteTab = activeList === "favorite";
    const isVisitedTab = activeList === "visited";

    return (
      <button
        type="button"
        className={`tw-itinerary-modal-secondary ${
          isVisitedTab ? "tw-itinerary-modal-secondary--neutral" : ""
        }`}
        onClick={() => {
          if (isFavoriteTab) {
            onRemoveItem(item);
          } else {
            onRemoveFromVisit(item);
          }

          setSelectedItem(null);
        }}
      >
        <span>
          {isFavoriteTab
            ? "Remover dos favoritos"
            : isVisitedTab
              ? "Remover dos visitados"
              : "Remover de A visitar"}
        </span>
      </button>
    );
  };

  return (
    <>
      <section className="tw-itinerary-shell" aria-label="Roteiro da viagem">
        <header className="tw-itinerary-topbar">
          <div className="tw-itinerary-title-block">
            <h1>Roteiro</h1>
            <p>{tripDestination} · {tripDuration}</p>
          </div>

          {activeList === "toVisit" && (
            <div
              className="tw-itinerary-header-actions"
              aria-label="Ações do roteiro"
            >
              <button
                type="button"
                className="tw-itinerary-header-button"
                aria-label="Otimizar rota dos locais a visitar"
                title={
                  toVisitItems.length < 2
                    ? "Adiciona pelo menos dois locais para otimizar a rota"
                    : "Otimizar rota"
                }
                onClick={handleOptimizeItinerary}
                disabled={toVisitItems.length < 2 || isOptimizingItinerary}
                aria-busy={isOptimizingItinerary}
              >
                <ListFilter size={20} />
              </button>
            </div>
          )}
        </header>

        <div className="tw-itinerary-stat-board" aria-label="Resumo do roteiro">
          <button
            type="button"
            className={`tw-itinerary-stat ${
              activeList === "favorite" ? "tw-itinerary-stat--active" : ""
            }`}
            onClick={() => setActiveList("favorite")}
          >
            <span className="tw-itinerary-stat-icon">
              <Heart size={24} />
            </span>
            <span className="tw-itinerary-stat-copy">
              <span>Favoritos</span>
              <strong>{favoriteItems.length}</strong>
            </span>
          </button>

          <button
            type="button"
            className={`tw-itinerary-stat ${
              activeList === "toVisit" ? "tw-itinerary-stat--active" : ""
            }`}
            onClick={() => setActiveList("toVisit")}
          >
            <span className="tw-itinerary-stat-icon">
              <CalendarDays size={24} />
            </span>
            <span className="tw-itinerary-stat-copy">
              <span>A visitar</span>
              <strong>{toVisitItems.length}</strong>
            </span>
          </button>

          <button
            type="button"
            className={`tw-itinerary-stat ${
              activeList === "visited" ? "tw-itinerary-stat--active" : ""
            }`}
            onClick={() => setActiveList("visited")}
          >
            <span className="tw-itinerary-stat-icon">
              <CheckCircle size={24} />
            </span>
            <span className="tw-itinerary-stat-copy">
              <span>Visitados</span>
              <strong>{visitedItems.length}</strong>
            </span>
          </button>
        </div>

        {!currentTrip ? (
          <div className="tw-itinerary-empty">
            <div className="tw-itinerary-empty-icon">
              <MapPin size={22} />
            </div>

            <h2>Não há nenhuma viagem ativa</h2>

            <p>
              Cria ou ativa uma viagem para começares a guardar locais no teu
              roteiro.
            </p>
          </div>
        ) : normalizedItems.length === 0 ? (
          <div className="tw-itinerary-empty">
            <div className="tw-itinerary-empty-icon">
              <MapPin size={22} />
            </div>

            <h2>Ainda não há locais no roteiro</h2>

            <p>
              Vai às recomendações e carrega em “Gostei” para adicionares locais
              automaticamente aos favoritos da viagem.
            </p>

            <button
              type="button"
              className="tw-itinerary-empty-action"
              onClick={onGoToRecommendations}
            >
              Ver recomendações
            </button>
          </div>
        ) : activeItems.length === 0 ? (
          <div className="tw-itinerary-empty">
            <div className="tw-itinerary-empty-icon">
              <MapPin size={22} />
            </div>

            <h2>{emptyListCopy.title}</h2>

            <p>{emptyListCopy.description}</p>
          </div>
        ) : (
          <main className="tw-itinerary-day">
            <div className="tw-itinerary-day-heading">
              <div className="tw-itinerary-day-left">
                <div>
                  <h2>Hoje</h2>
                  <p>{getTodayLabel()}</p>
                </div>
              </div>

              <div className="tw-itinerary-day-actions">
                <button
                  type="button"
                  className="tw-itinerary-map-button"
                  onClick={() => setIsMapOpen(true)}
                >
                  <Map size={22} />
                  <span>Ver mapa</span>
                </button>
              </div>
            </div>

            {activeList === "toVisit" && optimizationMessage && (
              <p className="tw-itinerary-ai-feedback">{optimizationMessage}</p>
            )}

            <div className="tw-itinerary-timeline">
              {periodGroups.map((group) => (
                <section
                  key={group.key}
                  className={`tw-itinerary-period tw-itinerary-period--${group.key}`}
                >
                  <aside
                    className="tw-itinerary-period-aside"
                    aria-hidden="true"
                  >
                    <span className="tw-itinerary-period-label">
                      {group.label}
                    </span>
                    <span className="tw-itinerary-period-icon">
                      {group.icon}
                    </span>
                  </aside>

                  <div className="tw-itinerary-period-list">
                    {group.items.map((item) => (
                      <article
                        key={item.id}
                        className="tw-itinerary-place-card"
                      >
                        <button
                          type="button"
                          className="tw-itinerary-place-main"
                          onClick={() => setSelectedItem(item)}
                          aria-label={`Abrir detalhes de ${item.name}`}
                        >
                          <div
                            className="tw-itinerary-place-thumb"
                            aria-hidden="true"
                          >
                            <img
                              src={getExploreFallbackImage(item, 520)}
                              alt=""
                            />
                          </div>

                          <div className="tw-itinerary-place-copy">
                            <h3>{item.name}</h3>

                            <p className="tw-itinerary-place-category">
                              <span>{item.category}</span>
                              <span aria-hidden="true">·</span>
                              <span>
                                {item.interests[0]
                                  ? formatInterest(
                                      item.interests[0],
                                      preferenceInterestLabels,
                                    )
                                  : item.source === "smart"
                                    ? "Smart"
                                    : "Nearby"}
                              </span>
                            </p>

                            <p className="tw-itinerary-place-location">
                              <MapPin size={14} />
                              <span>
                                {getPlaceLocation(item, tripDestination)}
                              </span>
                            </p>

                            <div className="tw-itinerary-place-meta">
                              <span>
                                <Clock size={15} />
                                {item.estimatedTime}
                              </span>
                              <span>
                                <CircleDollarSign size={15} />
                                {budgetLabels[item.budget] ?? item.budget}
                              </span>
                              <span>
                                <CalendarDays size={15} />
                                {formatShortDate(item.addedAt)}
                              </span>
                              {item.optimizedPeriod && (
                                <span className="tw-itinerary-ai-period-chip">
                                  <Sparkles size={14} />
                                  {item.optimizedPeriod === "morning"
                                    ? "Manhã"
                                    : item.optimizedPeriod === "afternoon"
                                      ? "Tarde"
                                      : "Noite"}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          className={`tw-itinerary-fav-button ${
                            item.isFavorite !== false
                              ? "tw-itinerary-fav-button--active"
                              : ""
                          }`}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleFavoriteToggle(item);
                          }}
                          aria-label={
                            item.isFavorite !== false
                              ? `Remover ${item.name} dos favoritos`
                              : `${item.name} não está nos favoritos`
                          }
                        >
                          <Heart size={24} />
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </main>
        )}
      </section>

      <ItineraryMapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        places={activeItems}
      />

      {selectedItemData && (
        <div
          className="tw-itinerary-modal-backdrop"
          role="presentation"
          onClick={() => setSelectedItem(null)}
        >
          <section
            className="tw-itinerary-modal tw-itinerary-modal--pro"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tw-itinerary-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="tw-itinerary-modal-handle" aria-hidden="true" />

            <button
              type="button"
              className="tw-itinerary-modal-close"
              onClick={() => setSelectedItem(null)}
              aria-label="Fechar detalhes do local"
            >
              <X size={18} />
            </button>

            <div className="tw-itinerary-modal-hero">
              <img
                src={getExploreFallbackImage(selectedItemData, 900)}
                alt=""
              />
            </div>

            <div className="tw-itinerary-modal-content">
              <div className="tw-itinerary-modal-kicker">
                <span
                  className={`tw-itinerary-source-badge tw-itinerary-source-badge--${selectedItemData.source}`}
                >
                  {selectedItemData.source === "smart" ? "Smart" : "Nearby"}
                </span>

                <span className="tw-itinerary-category-badge">
                  {selectedItemData.category}
                </span>

                <span
                  className={`tw-itinerary-compact-status tw-itinerary-compact-status--${
                    selectedItemData.status ?? "favorite"
                  }`}
                >
                  {getCompactStatusLabel(selectedItemData)}
                </span>
              </div>

              <h2 id="tw-itinerary-modal-title">{selectedItemData.name}</h2>

              <p className="tw-itinerary-modal-description">
                {selectedItemData.description}
              </p>

              <div
                className="tw-itinerary-modal-detail-grid"
                aria-label="Detalhes rápidos do local"
              >
                <div className="tw-itinerary-modal-detail-card">
                  <Clock size={16} />
                  <span>Duração</span>
                  <strong>{selectedItemData.estimatedTime}</strong>
                </div>

                <div className="tw-itinerary-modal-detail-card">
                  <CircleDollarSign size={16} />
                  <span>Orçamento</span>
                  <strong>
                    {budgetLabels[selectedItemData.budget] ??
                      selectedItemData.budget}
                  </strong>
                </div>

                <div className="tw-itinerary-modal-detail-card">
                  <MapPin size={16} />
                  <span>Zona</span>
                  <strong>
                    {getPlaceLocation(selectedItemData, tripDestination)}
                  </strong>
                </div>

                <div className="tw-itinerary-modal-detail-card">
                  <CalendarDays size={16} />
                  <span>Adicionado</span>
                  <strong>{formatShortDate(selectedItemData.addedAt)}</strong>
                </div>
              </div>

              {selectedItemData.reason && (
                <section className="tw-itinerary-modal-section tw-itinerary-modal-insight">
                  <Sparkles size={17} />
                  <div>
                    <h3>Porque aparece no roteiro</h3>
                    <p>{selectedItemData.reason}</p>
                  </div>
                </section>
              )}

              {selectedItemData.aiOptimizationReason && (
                <section className="tw-itinerary-modal-section tw-itinerary-modal-insight">
                  <Sparkles size={17} />
                  <div>
                    <h3>Sugestão da IA</h3>
                    <p>{selectedItemData.aiOptimizationReason}</p>
                  </div>
                </section>
              )}

              {selectedItemData.interests.length > 0 && (
                <section className="tw-itinerary-modal-section">
                  <h3>Interesses associados</h3>

                  <div className="tw-itinerary-modal-tags">
                    {selectedItemData.interests.map((interest) => (
                      <span key={interest}>
                        {formatInterest(interest, preferenceInterestLabels)}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="tw-itinerary-modal-actions">
              {renderItemPrimaryAction(selectedItemData)}
              {renderItemSecondaryAction(selectedItemData)}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
