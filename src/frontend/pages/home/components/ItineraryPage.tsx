import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle,
  CircleDollarSign,
  Clock,
  Heart,
  Map,
  MapPin,
  Moon,
  Navigation,
  RefreshCw,
  Sparkles,
  Sun,
  Sunset,
  Trash2,
  X,
} from "lucide-react";

import azulejosRouteImage from "../../../assets/places/azulejos-route.webp";
import cafeMajesticImage from "../../../assets/places/cafe-majestic.webp";
import fozDouroImage from "../../../assets/places/foz-douro.webp";
import jardinsPalacioCristalImage from "../../../assets/places/jardins-palacio-cristal.webp";
import livrariaLelloImage from "../../../assets/places/livraria-lello.webp";
import localFlavoursImage from "../../../assets/places/local-flavours.webp";
import mercadoBolhaoImage from "../../../assets/places/mercado-bolhao.webp";
import museuSoaresDosReisImage from "../../../assets/places/museu-soares-dos-reis.webp";
import parqueOrientalPortoImage from "../../../assets/places/parque-oriental-porto.webp";
import parqueUrbanoRioTintoImage from "../../../assets/places/parque-urbano-rio-tinto.webp";
import ponteLuisImage from "../../../assets/places/ponte-luis-i.webp";
import quintaDasFreirasImage from "../../../assets/places/quinta-das-freiras.webp";
import ribeiraPortoImage from "../../../assets/places/ribeira-porto.webp";
import sunsetPortoImage from "../../../assets/places/sunset-porto.webp";

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
  lat?: number;
lng?: number;
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
  "azulejos-route": azulejosRouteImage,
  "rota-dos-azulejos": azulejosRouteImage,
  "sunset-porto": sunsetPortoImage,
  "porto-ao-por-do-sol": sunsetPortoImage,
  "local-flavours": localFlavoursImage,
  "sabores-locais": localFlavoursImage,
  "livraria-lello": livrariaLelloImage,
  "ribeira-porto": ribeiraPortoImage,
  "ribeira-do-porto": ribeiraPortoImage,
  "cais-da-ribeira": ribeiraPortoImage,
  "cafe-majestic": cafeMajesticImage,
  "ponte-luis-i": ponteLuisImage,
  "ponte-luis-1": ponteLuisImage,
  "mercado-bolhao": mercadoBolhaoImage,
  "mercado-do-bolhao": mercadoBolhaoImage,
  "jardins-palacio-cristal": jardinsPalacioCristalImage,
  "jardins-do-palacio-de-cristal": jardinsPalacioCristalImage,
  "museu-soares-dos-reis": museuSoaresDosReisImage,
  "museu-nacional-soares-dos-reis": museuSoaresDosReisImage,
  "foz-douro": fozDouroImage,
  "foz-do-douro": fozDouroImage,
  "parque-urbano-rio-tinto": parqueUrbanoRioTintoImage,
  "quinta-das-freiras": quintaDasFreirasImage,
  "parque-oriental-porto": parqueOrientalPortoImage,
  "parque-oriental-do-porto": parqueOrientalPortoImage,
};

const categoryFallbackImages: Record<string, string> = {
  local_food: localFlavoursImage,
  restaurant: localFlavoursImage,
  restaurante: localFlavoursImage,
  gastronomia: localFlavoursImage,
  cafe: cafeMajesticImage,
  nature: jardinsPalacioCristalImage,
  natureza: jardinsPalacioCristalImage,
  beaches: fozDouroImage,
  praia: fozDouroImage,
  museum: museuSoaresDosReisImage,
  museu: museuSoaresDosReisImage,
  monuments: ponteLuisImage,
  monumento: ponteLuisImage,
  architecture: ribeiraPortoImage,
  arquitetura: ribeiraPortoImage,
  photography: sunsetPortoImage,
  fotografia: sunsetPortoImage,
  default: sunsetPortoImage,
};

const findKnownExploreImage = (item: ItineraryItem) => {
  const candidates = [
    normalizeKey(item.id),
    normalizeKey(item.name),
    normalizeKey(item.name.replace(/^o |^a |^os |^as /i, "")),
  ];

  for (const candidate of candidates) {
    if (explorePlaceImages[candidate]) return explorePlaceImages[candidate];
  }

  const knownEntry = Object.entries(explorePlaceImages).find(([key]) => {
    const normalizedName = normalizeKey(item.name);
    return key.includes(normalizedName) || normalizedName.includes(key);
  });

  return knownEntry?.[1];
};

const getExploreFallbackImage = (item: ItineraryItem) => {
  const syncedImage = findKnownExploreImage(item);

  if (syncedImage) return syncedImage;

  const category = normalizeKey(item.category);
  const interests = item.interests.map(normalizeKey).join("|");

  if (
    interests.includes("local-food") ||
    category.includes("restaurante") ||
    category.includes("gastronomia")
  ) {
    return categoryFallbackImages.local_food;
  }

  if (category.includes("cafe")) return categoryFallbackImages.cafe;

  if (
    interests.includes("beaches") ||
    interests.includes("praias") ||
    category.includes("praia")
  ) {
    return categoryFallbackImages.beaches;
  }

  if (
    interests.includes("nature") ||
    interests.includes("natureza") ||
    category.includes("jardim") ||
    category.includes("parque") ||
    category.includes("natureza")
  ) {
    return categoryFallbackImages.nature;
  }

  if (category.includes("museu")) return categoryFallbackImages.museum;

  if (
    interests.includes("monuments") ||
    interests.includes("monumentos") ||
    category.includes("monumento") ||
    category.includes("historia")
  ) {
    return categoryFallbackImages.monuments;
  }

  if (
    interests.includes("architecture") ||
    interests.includes("arquitetura") ||
    category.includes("arquitetura")
  ) {
    return categoryFallbackImages.architecture;
  }

  if (
    interests.includes("photography") ||
    interests.includes("fotografia") ||
    category.includes("miradouro") ||
    category.includes("vista")
  ) {
    return categoryFallbackImages.photography;
  }

  return item.imageUrl || categoryFallbackImages.default;
};

const getPlaceLocation = (item: ItineraryItem, destination: string) => {
  if (item.source === "nearby") return "Perto de ti";
  if (destination) return destination;
  return "Roteiro";
};

const splitItemsByPeriod = (items: ItineraryItem[]): ItineraryPeriodGroup[] => {
  const emptyGroups: ItineraryPeriodGroup[] = [
    { key: "morning", label: "Manhã", icon: <Sun size={18} />, items: [] },
    {
      key: "afternoon",
      label: "Tarde",
      icon: <Sunset size={18} />,
      items: [],
    },
    { key: "night", label: "Noite", icon: <Moon size={18} />, items: [] },
  ];

  if (items.length === 0) return emptyGroups;

  const hasOptimizedPeriods = items.some((item) => item.optimizedPeriod);

  if (hasOptimizedPeriods) {
    const periodFallbacks: Array<ItineraryPeriodGroup["key"]> = [
      "morning",
      "afternoon",
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
  const [optimizationMessage, setOptimizationMessage] = useState<string | null>(
    null,
  );

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

  const renderCardAction = (item: ItineraryItem) => {
    if (activeList === "favorite") {
      const isAlreadyPlanned =
        item.status === "toVisit" || item.status === "visited";
      const isToVisit = item.status === "toVisit";

      return (
        <button
          type="button"
          className={`tw-itinerary-card-action tw-itinerary-card-action--favorite ${
            isAlreadyPlanned ? "tw-itinerary-card-action--done" : ""
          } ${isToVisit ? "tw-itinerary-card-action--to-visit" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            if (!isAlreadyPlanned) onMoveToVisit(item);
          }}
          aria-label={
            isAlreadyPlanned
              ? `${item.name} já foi adicionado ao roteiro`
              : `Adicionar ${item.name} a visitar`
          }
          title={
            isAlreadyPlanned ? "Já está no roteiro" : "Adicionar a visitar"
          }
        >
          <Heart size={20} />
        </button>
      );
    }

    if (activeList === "toVisit") {
      return (
        <button
          type="button"
          className="tw-itinerary-card-action tw-itinerary-card-action--toVisit"
          onClick={(event) => {
            event.stopPropagation();
            onMarkAsVisited(item);
          }}
          aria-label={`Marcar ${item.name} como visitado`}
          title="Marcar como visitado"
        >
          <Check size={20} />
        </button>
      );
    }

    return (
      <button
        type="button"
        className="tw-itinerary-card-action tw-itinerary-card-action--visited"
        onClick={(event) => {
          event.stopPropagation();
          onRemoveFromVisit(item);
        }}
        aria-label={`Remover ${item.name} dos visitados`}
        title="Remover dos visitados"
      >
        <Trash2 size={20} />
      </button>
    );
  };

  const renderPlaceCard = (item: ItineraryItem) => (
    <article key={item.id} className="tw-itinerary-place-card">
      <button
        type="button"
        className="tw-itinerary-place-main"
        onClick={() => setSelectedItem(item)}
        aria-label={`Abrir detalhes de ${item.name}`}
      >
        <div className="tw-itinerary-place-thumb" aria-hidden="true">
          <img src={getExploreFallbackImage(item)} alt="" />
        </div>

        <div className="tw-itinerary-place-copy">
          <h3>{item.name}</h3>

          <p className="tw-itinerary-place-category">
            <span>{item.category}</span>
            <span aria-hidden="true">·</span>
            <span>
              {item.interests[0]
                ? formatInterest(item.interests[0], preferenceInterestLabels)
                : item.source === "smart"
                  ? "Smart"
                  : "Nearby"}
            </span>
          </p>

          <p className="tw-itinerary-place-location">
            <MapPin size={14} />
            <span>{getPlaceLocation(item, tripDestination)}</span>
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
            {item.optimizedPeriod && activeList === "toVisit" && (
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

      {renderCardAction(item)}
    </article>
  );

  const renderItemPrimaryAction = (item: ItineraryItem) => {
    const status = item.status ?? "favorite";

    if (status === "visited") {
      return (
        <div className="tw-itinerary-modal-status">
          <CheckCircle size={16} />
          <span>Visitado</span>
        </div>
      );
    }

    if (activeList === "favorite") {
      if (status === "toVisit") {
        return (
          <div className="tw-itinerary-modal-status">
            <Navigation size={16} />
            <span>Adicionado a visitar</span>
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
            <p>
              {tripDestination} · {tripDuration}
            </p>
          </div>
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
              <Heart size={22} />
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
              <CalendarDays size={22} />
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
              <CheckCircle size={22} />
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
                <h2>Hoje</h2>
                <p>{getTodayLabel()}</p>
              </div>

              <div className="tw-itinerary-day-actions">
                {activeList === "toVisit" && (
                  <button
                    type="button"
                    className="tw-itinerary-optimize-button"
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
                    <RefreshCw size={16} />
                    <span>
                      {isOptimizingItinerary ? "A otimizar" : "Otimizar"}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  className="tw-itinerary-map-button"
                  onClick={() => setIsMapOpen(true)}
                >
                  <Map size={18} />
                  <span>Ver mapa</span>
                </button>
              </div>
            </div>

            {activeList === "toVisit" && optimizationMessage && (
              <p className="tw-itinerary-ai-feedback">{optimizationMessage}</p>
            )}

            {activeList === "toVisit" ? (
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
                      {group.items.map(renderPlaceCard)}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="tw-itinerary-plain-list">
                {activeItems.map(renderPlaceCard)}
              </div>
            )}
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
              <img src={getExploreFallbackImage(selectedItemData)} alt="" />
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
