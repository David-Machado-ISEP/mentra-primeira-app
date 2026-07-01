import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpenText,
  Building2,
  Camera,
  ChevronRight,
  FileText,
  Heart,
  Image as ImageIcon,
  Landmark,
  Map as MapIcon,
  MapPin,
  Music2,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Trees,
  Utensils,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Photo } from "../PhotoStream";
import type { CompanionInteraction } from "../CompanionPage";
import type { VisitedPlace } from "../VisitedPlacesPanel";
import type { Transcription } from "../TranscriptionFeed";
import { AlbumCard } from "./AlbumCard";
import { CollectionCard } from "./CollectionCard";
import { MemoryMapSection } from "./MemoryMapSection";
import { PhotoTimeline } from "./PhotoTimeline";

interface VisualDiscovery {
  id: string;
  userId: string;
  photoRequestId: string;
  photoDataUrl: string;
  description: string;
  timestamp: string;
  source: "single_tap" | "single_press" | "double_press" | "triple_tap";
  tripId?: string;
  aiCategory?: string;
  aiTags?: string[];
  aiConfidence?: number;
}

interface PastTrip {
  id: string;
  name: string;
  locationLabel: string;
  startedAt: string;
  endedAt: string;
  photoCount: number;
  visitedPlacesCount: number;
  coverPhotoUrl?: string;
  photos?: Photo[];
  places?: VisitedPlace[];
}

interface MemoryCollection {
  id: string;
  title: string;
  count: number;
  coverImage?: string;
  createdAt: string;
}

interface MemoryTrip {
  id: string;
  title: string;
  dateLabel: string;
  locationLabel: string;
  photoCount: number;
  placeCount: number;
  transcriptsCount: number;
  coverUrl?: string;
}

interface MemoriesPageProps {
  photos: Photo[];
  places: VisitedPlace[];
  transcriptions: Transcription[];
  visualDiscoveries: VisualDiscovery[];
  companionInteractions?: CompanionInteraction[];
  pastTrips: PastTrip[];
  currentTripId?: string;
  currentTripName: string;
  currentTripLocation: string;
  currentTripStartedAt?: string;
  isTripActive: boolean;
  onOpenCompanion?: () => void;
  selectedPhotoIds: string[];
  selectedPastTripIds: string[];
  isDeletingPastTrips: boolean;
  userId: string;
  onTogglePhoto: (photoId: string) => void;
  onClearPhotoSelection: () => void;
  onLog: (
    message: string,
    type?: "info" | "success" | "warning" | "error",
  ) => void;
  onTogglePastTripSelection: (tripId: string) => void;
  onStartPastTripsDeleteMode: () => void;
  onCancelPastTripsDeleteMode: () => void;
  onDeleteSelectedPastTrips: () => void;
}

const COLLECTION_STORAGE_KEY = "travel-whisperer-memory-collections";
const ACTIVE_TRIP_MEMORY_ID = "active-trip-memory";

const matchesText = (value: string | undefined, patterns: string[]) => {
  const normalizedValue = value?.toLowerCase() ?? "";
  return patterns.some((pattern) => normalizedValue.includes(pattern));
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `collection-${Date.now()}`;
};

const loadStoredCollections = (): MemoryCollection[] => {
  try {
    const saved = localStorage.getItem(COLLECTION_STORAGE_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => typeof item?.title === "string")
      .map((item) => ({
        id: typeof item.id === "string" ? item.id : createId(),
        title: item.title,
        count: typeof item.count === "number" ? item.count : 0,
        coverImage:
          typeof item.coverImage === "string" ? item.coverImage : undefined,
        createdAt:
          typeof item.createdAt === "string"
            ? item.createdAt
            : new Date().toISOString(),
      }));
  } catch {
    return [];
  }
};

const getTripCalendarDate = (value?: string) => {
  if (!value) return null;

  const europeanDate = value.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (europeanDate) {
    const [, day, month, year] = europeanDate;

    return {
      key: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
      label: `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`,
    };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const dateOnly = value.split(",")[0]?.trim();
    return dateOnly ? { key: dateOnly, label: dateOnly } : null;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return {
    key: `${year}-${month}-${day}`,
    label: `${day}/${month}/${year}`,
  };
};

const formatTripDate = (trip: PastTrip) => {
  const start = getTripCalendarDate(trip.startedAt);
  const end = getTripCalendarDate(trip.endedAt);

  if (start && end) {
    return start.key === end.key
      ? start.label
      : `${start.label} - ${end.label}`;
  }

  return start?.label || end?.label || "Sem datas";
};

const formatFriendlyTripStart = (value?: string) => {
  if (!value) return "Em curso";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return `Desde ${value}`;

  const today = new Date();
  const isToday = parsed.toDateString() === today.toDateString();
  const time = parsed.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) return `Iniciada hoje às ${time}`;

  return `Iniciada em ${parsed.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
  })} às ${time}`;
};

type SmartCollectionId =
  | "favorites"
  | "food"
  | "outdoor"
  | "landmark"
  | "city"
  | "shopping"
  | "nightlife"
  | "general";

type SmartMemoryKind =
  "photo" | "place" | "visual" | "companion" | "transcription";

interface SmartMemoryItem {
  id: string;
  kind: SmartMemoryKind;
  category: SmartCollectionId;
  title: string;
  description: string;
  timestamp?: string;
  location?: string;
  imageUrl?: string;
  reason: string;
  sourceKey: string;
}

const smartCollectionDefinitions: Array<{
  id: SmartCollectionId;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  icon: LucideIcon;
  accent: "blue" | "green" | "violet" | "amber";
}> = [
  {
    id: "favorites",
    title: "Favoritos",
    description: "Momentos visuais captados durante as viagens.",
    emptyTitle: "Ainda sem fotos favoritas",
    emptyDescription: "As fotos guardadas e selecionadas aparecem aqui.",
    icon: Heart,
    accent: "green",
  },
  {
    id: "food",
    title: "Comida",
    description:
      "Restaurantes, pratos, cafés, menus e experiências gastronómicas.",
    emptyTitle: "Ainda sem fotos de comida",
    emptyDescription:
      "Fotografias e interações gastronómicas aparecem aqui quando forem detetadas.",
    icon: Utensils,
    accent: "amber",
  },
  {
    id: "outdoor",
    title: "Ar livre",
    description: "Natureza, parques, praia, miradouros e paisagens.",
    emptyTitle: "Ainda sem fotos ao ar livre",
    emptyDescription: "Praias, jardins, parques e paisagens aparecem aqui.",
    icon: Trees,
    accent: "green",
  },
  {
    id: "landmark",
    title: "Monumentos",
    description: "Museus, igrejas, castelos, estátuas e património histórico.",
    emptyTitle: "Ainda sem monumentos",
    emptyDescription:
      "Locais históricos e culturais aparecem aqui quando forem detetados.",
    icon: Landmark,
    accent: "blue",
  },
  {
    id: "city",
    title: "Cidade",
    description: "Ruas, praças, arquitetura, zonas urbanas e pontos da cidade.",
    emptyTitle: "Ainda sem momentos urbanos",
    emptyDescription: "Ruas, praças e edifícios aparecem aqui.",
    icon: Building2,
    accent: "blue",
  },
  {
    id: "shopping",
    title: "Compras",
    description: "Lojas, mercados, centros comerciais e lembranças.",
    emptyTitle: "Ainda sem memórias de compras",
    emptyDescription: "Lojas, mercados e compras aparecem aqui.",
    icon: ShoppingBag,
    accent: "amber",
  },
  {
    id: "nightlife",
    title: "Vida noturna",
    description:
      "Bares, zonas noturnas, eventos, música e momentos ao fim do dia.",
    emptyTitle: "Ainda sem fotos nesta coleção",
    emptyDescription:
      "As fotografias classificadas como vida noturna aparecem aqui.",
    icon: Music2,
    accent: "violet",
  },
  {
    id: "general",
    title: "Momentos gerais",
    description:
      "Memórias que não encaixam claramente numa categoria específica.",
    emptyTitle: "Ainda sem momentos gerais",
    emptyDescription: "Memórias sem categoria forte aparecem aqui.",
    icon: Sparkles,
    accent: "blue",
  },
];

const keywordGroups: Record<
  Exclude<SmartCollectionId, "favorites" | "general">,
  string[]
> = {
  food: [
    "food",
    "meal",
    "dish",
    "restaurant",
    "cafe",
    "coffee",
    "menu",
    "comida",
    "prato",
    "restaurante",
    "café",
    "cafetaria",
    "almoço",
    "jantar",
    "sobremesa",
    "pastelaria",
    "padaria",
    "bebida",
  ],
  outdoor: [
    "outdoor",
    "nature",
    "park",
    "garden",
    "beach",
    "sea",
    "river",
    "viewpoint",
    "landscape",
    "ar livre",
    "natureza",
    "parque",
    "jardim",
    "praia",
    "mar",
    "rio",
    "miradouro",
    "paisagem",
    "trilho",
  ],
  landmark: [
    "museum",
    "church",
    "castle",
    "palace",
    "statue",
    "historic",
    "monument",
    "monumento",
    "museu",
    "igreja",
    "castelo",
    "palácio",
    "estátua",
    "histórico",
    "património",
  ],
  city: [
    "street",
    "square",
    "building",
    "architecture",
    "urban",
    "city",
    "rua",
    "praça",
    "edifício",
    "arquitetura",
    "cidade",
    "urbano",
    "avenida",
  ],
  shopping: [
    "shopping",
    "shop",
    "store",
    "market",
    "mall",
    "souvenir",
    "compras",
    "loja",
    "mercado",
    "centro comercial",
    "lembrança",
  ],
  nightlife: [
    "nightlife",
    "bar",
    "club",
    "pub",
    "cocktail",
    "concert",
    "live music",
    "party",
    "festival",
    "vida noturna",
    "bar",
    "discoteca",
    "concerto",
    "música ao vivo",
    "festa",
    "evento noturno",
    "zona noturna",
  ],
};

const normalizeSmartText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const getCategoryFromAi = (value?: string): SmartCollectionId | null => {
  const category = normalizeSmartText(value ?? "");

  if (
    [
      "food",
      "outdoor",
      "landmark",
      "city",
      "shopping",
      "nightlife",
      "general",
    ].includes(category)
  ) {
    return category as SmartCollectionId;
  }

  if (category === "transport" || category === "people") return "general";

  return null;
};

const classifySmartText = (
  text: string,
  aiCategory?: string,
): SmartCollectionId => {
  const directCategory = getCategoryFromAi(aiCategory);
  if (directCategory && directCategory !== "favorites") return directCategory;

  const normalized = normalizeSmartText(text);

  for (const [category, keywords] of Object.entries(keywordGroups)) {
    if (
      keywords.some((keyword) =>
        normalized.includes(normalizeSmartText(keyword)),
      )
    ) {
      return category as SmartCollectionId;
    }
  }

  return "general";
};

const createDedupeKey = (
  item: Pick<
    SmartMemoryItem,
    "kind" | "description" | "sourceKey" | "timestamp"
  >,
) => {
  const descriptionKey = normalizeSmartText(item.description)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 90);
  return (
    item.sourceKey || `${item.kind}-${descriptionKey}-${item.timestamp ?? ""}`
  );
};

export function MemoriesPage({
  photos,
  places,
  transcriptions,
  visualDiscoveries,
  companionInteractions = [],
  pastTrips,
  currentTripId,
  currentTripName,
  currentTripLocation,
  currentTripStartedAt,
  isTripActive,
  onOpenCompanion,
  selectedPhotoIds,
  selectedPastTripIds,
  isDeletingPastTrips,
  onTogglePhoto,
  onClearPhotoSelection,
  onLog,
  onTogglePastTripSelection,
  onStartPastTripsDeleteMode,
  onCancelPastTripsDeleteMode,
  onDeleteSelectedPastTrips,
}: MemoriesPageProps) {
  const [customCollections, setCustomCollections] = useState<
    MemoryCollection[]
  >(() => loadStoredCollections());
  const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [collectionError, setCollectionError] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedSmartCollectionId, setSelectedSmartCollectionId] =
    useState<SmartCollectionId | null>(null);

  const finalTranscriptions = transcriptions.filter((item) => item.isFinal);
  const hasActiveTrip = isTripActive;
  const belongsToCurrentTrip = <Item extends { tripId?: string | null }>(
    item: Item,
  ) => Boolean(currentTripId && item.tripId === currentTripId);
  const activeTripPhotos = hasActiveTrip
    ? photos.filter(belongsToCurrentTrip)
    : [];
  const activeTripPlaces = hasActiveTrip
    ? places.filter(belongsToCurrentTrip)
    : [];
  const activeTripTranscriptions = hasActiveTrip
    ? finalTranscriptions.filter(belongsToCurrentTrip)
    : [];
  const activeTripVisualDiscoveries = hasActiveTrip
    ? visualDiscoveries.filter(belongsToCurrentTrip)
    : [];
  const activeTripCompanionInteractions = hasActiveTrip
    ? companionInteractions.filter((interaction) =>
        Boolean(currentTripId && interaction.tripId === currentTripId),
      )
    : [];
  const activeTripInteractionCount =
    activeTripCompanionInteractions.length +
    activeTripVisualDiscoveries.length +
    activeTripTranscriptions.length;
  const activeTripCoverUrl =
    activeTripPhotos[0]?.url ?? activeTripVisualDiscoveries[0]?.photoDataUrl;
  const activeTripDateLabel = formatFriendlyTripStart(currentTripStartedAt);
  const photoByRequestId = useMemo(() => {
    const map = new Map<string, Photo>();
    photos.forEach((photo) => {
      map.set(photo.requestId, photo);
      map.set(photo.id, photo);
    });
    return map;
  }, [photos]);

  const smartMemoryItems = useMemo<SmartMemoryItem[]>(() => {
    const items: SmartMemoryItem[] = [];
    const seenKeys = new Set<string>();

    const addItem = (item: SmartMemoryItem) => {
      const key = createDedupeKey(item);
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      items.push(item);
    };

    photos.forEach((photo) => {
      const linkedPlace = places.find(
        (place) =>
          place.photoRequestId === photo.requestId ||
          place.id === photo.requestId,
      );
      const linkedDiscovery = visualDiscoveries.find(
        (discovery) => discovery.photoRequestId === photo.requestId,
      );
      const linkedInteraction = companionInteractions.find(
        (interaction) =>
          interaction.photoId === photo.requestId ||
          interaction.id === `photo-${photo.requestId}`,
      );
      const interactionWithAi = linkedInteraction as
        | (CompanionInteraction & {
            aiCategory?: string;
            aiTags?: string[];
            aiConfidence?: number;
          })
        | undefined;
      const text = [
        linkedDiscovery?.description,
        linkedPlace?.name,
        linkedPlace?.category,
        linkedPlace?.description,
        linkedInteraction?.title,
        linkedInteraction?.content,
        interactionWithAi?.aiTags?.join(" "),
      ]
        .filter(Boolean)
        .join(" ");

      const category = classifySmartText(
        text || "fotografia da viagem",
        linkedDiscovery?.aiCategory ?? interactionWithAi?.aiCategory,
      );

      addItem({
        id: `photo-${photo.id}`,
        kind: "photo",
        category,
        title: linkedPlace
          ? `Foto em ${linkedPlace.name}`
          : "Fotografia da viagem",
        description:
          linkedDiscovery?.description ??
          linkedInteraction?.content ??
          "Fotografia captada com os óculos durante a viagem.",
        timestamp: photo.timestamp,
        location: linkedPlace?.city ?? currentTripLocation,
        imageUrl: photo.url,
        reason: linkedDiscovery?.aiCategory
          ? `Classificada pela análise AI da imagem (${linkedDiscovery.aiCategory})`
          : linkedPlace
            ? "Associada ao local detetado na viagem"
            : "Classificada pelo contexto disponível da foto",
        sourceKey: `photo-${photo.requestId}`,
      });
    });

    places.forEach((place) => {
      const text = `${place.name} ${place.city} ${place.category} ${place.description}`;
      addItem({
        id: `place-${place.id}`,
        kind: "place",
        category: classifySmartText(text),
        title: place.name,
        description: place.description || `${place.city} · ${place.category}`,
        timestamp: new Date(
          place.firstVisitedAt ?? place.timestamp,
        ).toLocaleTimeString("pt-PT", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        location: place.city,
        imageUrl: photoByRequestId.get(place.photoRequestId ?? "")?.url,
        reason: "Classificada pela categoria e descrição do local",
        sourceKey: `place-${place.id}`,
      });
    });

    visualDiscoveries.forEach((discovery) => {
      const linkedPhoto = photoByRequestId.get(discovery.photoRequestId);

      if (linkedPhoto) return;

      addItem({
        id: `visual-${discovery.id}`,
        kind: "visual",
        category: classifySmartText(
          discovery.description,
          discovery.aiCategory,
        ),
        title: "Descrição visual gerada",
        description: discovery.description,
        timestamp: discovery.timestamp,
        location: currentTripLocation,
        imageUrl: discovery.photoDataUrl,
        reason: discovery.aiCategory
          ? `Classificada pela análise AI da imagem (${discovery.aiCategory})`
          : "Classificada pela descrição visual gerada",
        sourceKey: discovery.photoRequestId
          ? `visual-${discovery.photoRequestId}`
          : `visual-${discovery.id}`,
      });
    });

    companionInteractions.forEach((interaction) => {
      const interactionWithAi = interaction as CompanionInteraction & {
        aiCategory?: string;
        aiTags?: string[];
        aiConfidence?: number;
      };
      const hasMatchingVisualDiscovery = Boolean(
        interaction.photoId &&
        visualDiscoveries.some(
          (discovery) => discovery.photoRequestId === interaction.photoId,
        ),
      );

      if (hasMatchingVisualDiscovery && interaction.type !== "photo") return;

      const text = `${interaction.title} ${interaction.content} ${interaction.source ?? ""} ${
        interactionWithAi.aiTags?.join(" ") ?? ""
      }`;
      const linkedPhoto = interaction.photoId
        ? photoByRequestId.get(interaction.photoId)
        : undefined;

      addItem({
        id: `interaction-${interaction.id}`,
        kind: "companion",
        category: classifySmartText(text, interactionWithAi.aiCategory),
        title: interaction.title,
        description: interaction.content,
        timestamp: interaction.createdAt,
        location: currentTripLocation,
        imageUrl:
          linkedPhoto?.url ?? interaction.photoDataUrl ?? interaction.imageUrl,
        reason: interactionWithAi.aiCategory
          ? `Classificada pela análise AI (${interactionWithAi.aiCategory})`
          : "Classificada pelo texto da interação do Companion",
        sourceKey: interaction.photoId
          ? `interaction-${interaction.photoId}`
          : `interaction-${interaction.id}`,
      });
    });

    finalTranscriptions.forEach((transcription) => {
      addItem({
        id: `transcription-${transcription.id}`,
        kind: "transcription",
        category: classifySmartText(transcription.text),
        title: transcription.time || "Transcrição",
        description: transcription.text,
        timestamp: transcription.time,
        location: currentTripLocation,
        reason: "Classificada pelo texto transcrito durante a viagem",
        sourceKey: `transcription-${transcription.id}`,
      });
    });

    return items;
  }, [
    companionInteractions,
    currentTripLocation,
    finalTranscriptions,
    photoByRequestId,
    photos,
    places,
    visualDiscoveries,
  ]);

  const getCollectionItems = (collectionId: SmartCollectionId) => {
    if (collectionId === "favorites") {
      return smartMemoryItems.filter((item) => Boolean(item.imageUrl));
    }

    return smartMemoryItems.filter((item) => item.category === collectionId);
  };

  const getCollectionCover = (collectionId: SmartCollectionId) =>
    getCollectionItems(collectionId).find((item) => item.imageUrl)?.imageUrl;

  const baseCollections = useMemo(
    () =>
      smartCollectionDefinitions.map((collection) => ({
        title: collection.title,
        countLabel: String(getCollectionItems(collection.id).length),
        icon: collection.icon,
        coverUrl: getCollectionCover(collection.id),
        accent: collection.accent,
        onClick: () => setSelectedSmartCollectionId(collection.id),
      })),
    [smartMemoryItems],
  );

  const userCollections = useMemo(
    () =>
      customCollections.map((collection) => ({
        title: collection.title,
        countLabel: String(collection.count),
        icon: ImageIcon,
        coverUrl: collection.coverImage,
        accent: "blue" as const,
      })),
    [customCollections],
  );

  const memoryTrips = useMemo<MemoryTrip[]>(() => {
    const archivedTrips = pastTrips.map((trip) => ({
      id: trip.id,
      title: trip.name,
      dateLabel: formatTripDate(trip),
      locationLabel: trip.locationLabel,
      photoCount: trip.photoCount,
      placeCount: trip.visitedPlacesCount,
      transcriptsCount: 0,
      coverUrl: trip.coverPhotoUrl,
    }));

    return archivedTrips;
  }, [pastTrips]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredTrips = useMemo(() => {
    if (!normalizedSearch) return memoryTrips;

    return memoryTrips.filter((trip) =>
      `${trip.title} ${trip.locationLabel} ${trip.dateLabel}`
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [memoryTrips, normalizedSearch]);

  const selectedTrip = useMemo(
    () => memoryTrips.find((trip) => trip.id === selectedTripId) ?? null,
    [memoryTrips, selectedTripId],
  );
  const selectedPastTrip = useMemo(
    () => pastTrips.find((trip) => trip.id === selectedTripId) ?? null,
    [pastTrips, selectedTripId],
  );
  const isActiveTripSelected =
    hasActiveTrip && selectedTripId === ACTIVE_TRIP_MEMORY_ID;

  const getTripTranscriptions = (tripId: string) =>
    finalTranscriptions.filter(
      (transcription) => transcription.tripId === tripId,
    );
  const getTripVisualDiscoveries = (tripId: string) =>
    visualDiscoveries.filter((discovery) => discovery.tripId === tripId);
  const getTripCompanionInteractions = (tripId: string) =>
    companionInteractions.filter(
      (interaction) => interaction.tripId === tripId,
    );

  useEffect(() => {
    localStorage.setItem(
      COLLECTION_STORAGE_KEY,
      JSON.stringify(customCollections),
    );
  }, [customCollections]);

  const closeCollectionSheet = () => {
    setIsCreateCollectionOpen(false);
    setCollectionName("");
    setCollectionError("");
  };

  const createCollection = () => {
    const trimmedName = collectionName.trim();

    if (!trimmedName) {
      setCollectionError("Escreve um nome para a coleção.");
      return;
    }

    setCustomCollections((prev) => [
      {
        id: createId(),
        title: trimmedName,
        count: 0,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);

    closeCollectionSheet();
    onLog(`Coleção criada: ${trimmedName}`, "success");
  };

  const handleOpenCompanion = () => {
    if (onOpenCompanion) {
      onOpenCompanion();
      return;
    }

    onLog(
      "Abre o Companion pelo botão central para ver as interações da viagem.",
      "info",
    );
  };

  if (selectedSmartCollectionId) {
    const collection = smartCollectionDefinitions.find(
      (item) => item.id === selectedSmartCollectionId,
    );
    const collectionItems = getCollectionItems(selectedSmartCollectionId);
    const visualItems = collectionItems.filter((item) =>
      Boolean(item.imageUrl),
    );
    const contextItems = collectionItems.filter((item) => !item.imageUrl);
    const Icon = collection?.icon ?? Sparkles;

    return (
      <section
        className="mp-page mp-collection-detail-page"
        aria-label="Detalhe da coleção"
      >
        <header className="mp-trip-detail-header">
          <button
            type="button"
            className="mp-back-button"
            onClick={() => setSelectedSmartCollectionId(null)}
            aria-label="Voltar às memórias"
          >
            <ArrowLeft className="mp-back-button-icon" />
          </button>

          <div>
            <p>Classificação inteligente</p>
            <h1>{collection?.title ?? "Coleção"}</h1>
            <span>{collection?.description}</span>
            <strong className="mp-trip-state-badge is-active">
              {collectionItems.length}{" "}
              {collectionItems.length === 1 ? "memória" : "memórias"}
            </strong>
          </div>
        </header>

        <article className="mp-smart-info-card">
          <div className="mp-smart-info-icon">
            <Sparkles className="mp-companion-shortcut-svg" />
          </div>
          <div>
            <h2>Organização automática</h2>
            <p>
              A coleção usa descrições AI, texto do Companion, categorias de
              locais e transcrições para agrupar as memórias sem precisares de
              as mover manualmente.
            </p>
          </div>
        </article>

        <section className="mp-detail-list-section">
          <div className="mp-section-heading">
            <div>
              <p className="mp-section-kicker">Fotos</p>
              <h2>Momentos visuais</h2>
              <span className="mp-section-description">
                Fotos e imagens AI que encaixam nesta coleção.
              </span>
            </div>
          </div>

          {visualItems.length === 0 ? (
            <div className="mp-empty-state">
              <Camera className="mp-empty-state-icon" />
              <h3>
                {collection?.emptyTitle ?? "Ainda sem fotos nesta coleção"}
              </h3>
              <p>
                {collection?.emptyDescription ??
                  "As fotografias classificadas aparecem aqui."}
              </p>
            </div>
          ) : (
            <div className="mp-smart-visual-grid">
              {visualItems.map((item) => (
                <article key={item.id} className="mp-smart-visual-card">
                  <img src={item.imageUrl} alt={item.title} loading="lazy" />
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <span>{item.reason}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mp-detail-list-section">
          <div className="mp-section-heading">
            <div>
              <p className="mp-section-kicker">Contexto</p>
              <h2>Locais e interações relacionadas</h2>
              <span className="mp-section-description">
                Informação usada para ajudar a classificar esta coleção.
              </span>
            </div>
          </div>

          {contextItems.length === 0 ? (
            <div className="mp-empty-state">
              <Icon className="mp-empty-state-icon" />
              <h3>Sem contexto adicional</h3>
              <p>
                Quando existirem locais ou interações sem imagem, aparecem aqui.
              </p>
            </div>
          ) : (
            <div className="mp-detail-list">
              {contextItems.map((item) => (
                <article key={item.id} className="mp-detail-list-card">
                  <Icon className="mp-detail-list-icon" />
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <div className="mp-memory-meta-row">
                      {item.timestamp && <span>{item.timestamp}</span>}
                      {item.location && <span>{item.location}</span>}
                    </div>
                    <small>{item.reason}</small>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    );
  }

  if (isActiveTripSelected || selectedTrip) {
    const detailTripId = isActiveTripSelected
      ? ACTIVE_TRIP_MEMORY_ID
      : selectedTrip?.id;

    const detailPhotos = isActiveTripSelected
      ? activeTripPhotos
      : (selectedPastTrip?.photos ?? []);

    const detailPlaces = isActiveTripSelected
      ? activeTripPlaces
      : (selectedPastTrip?.places ?? []);

    const detailTranscriptions = isActiveTripSelected
      ? activeTripTranscriptions
      : detailTripId
        ? getTripTranscriptions(detailTripId)
        : [];

    const detailVisualDiscoveries = isActiveTripSelected
      ? activeTripVisualDiscoveries
      : detailTripId
        ? getTripVisualDiscoveries(detailTripId)
        : [];

    const detailCompanionInteractions = isActiveTripSelected
      ? activeTripCompanionInteractions
      : detailTripId
        ? getTripCompanionInteractions(detailTripId)
        : [];
    const detailInteractionCount =
      detailCompanionInteractions.length +
      detailVisualDiscoveries.length +
      detailTranscriptions.length;

    const detailTitle = isActiveTripSelected
      ? currentTripName || "Viagem atual"
      : (selectedTrip?.title ?? "Viagem");

    const detailDateLabel = isActiveTripSelected
      ? activeTripDateLabel
      : (selectedTrip?.dateLabel ?? "");

    const detailLocationLabel = isActiveTripSelected
      ? currentTripLocation
      : (selectedTrip?.locationLabel ?? "");

    const detailCoverUrl = isActiveTripSelected
      ? activeTripCoverUrl
      : (detailPhotos[0]?.url ??
        detailVisualDiscoveries[0]?.photoDataUrl ??
        selectedPastTrip?.coverPhotoUrl ??
        selectedTrip?.coverUrl);

    const summaryPhotoCount = isActiveTripSelected
      ? activeTripPhotos.length
      : detailPhotos.length ||
        selectedPastTrip?.photoCount ||
        selectedTrip?.photoCount ||
        0;

    const summaryPlaceCount = isActiveTripSelected
      ? activeTripPlaces.length
      : detailPlaces.length ||
        selectedPastTrip?.visitedPlacesCount ||
        selectedTrip?.placeCount ||
        0;
    const summaryInteractionCount = isActiveTripSelected
      ? activeTripInteractionCount
      : detailInteractionCount || selectedTrip?.transcriptsCount || 0;

    return (
      <section
        className="mp-page mp-trip-detail-page"
        aria-label="Detalhe da viagem"
      >
        <header className="mp-trip-detail-header">
          <button
            type="button"
            className="mp-back-button"
            onClick={() => setSelectedTripId(null)}
            aria-label="Voltar às memórias"
          >
            <ArrowLeft className="mp-back-button-icon" />
          </button>

          <div>
            <p>{detailDateLabel}</p>
            <h1>{detailTitle}</h1>
            <span>{detailLocationLabel}</span>
            <strong
              className={`mp-trip-state-badge ${
                isActiveTripSelected ? "is-active" : "is-completed"
              }`}
            >
              {isActiveTripSelected ? "Em curso" : "Finalizada"}
            </strong>
          </div>
        </header>

        <section className="mp-trip-cover-card">
          {detailCoverUrl ? (
            <img src={detailCoverUrl} alt={detailTitle} />
          ) : (
            <div className="mp-trip-cover-empty">
              <ImageIcon className="mp-trip-cover-empty-icon" />
            </div>
          )}
        </section>

        <section className="mp-trip-summary-grid" aria-label="Resumo da viagem">
          <article>
            <Camera className="mp-trip-summary-icon" />
            <strong>{summaryPhotoCount}</strong>
            <span>Fotos</span>
          </article>
          <article>
            <MapPin className="mp-trip-summary-icon" />
            <strong>{summaryPlaceCount}</strong>
            <span>Lugares</span>
          </article>
          <article>
            <FileText className="mp-trip-summary-icon" />
            <strong>{summaryInteractionCount}</strong>
            <span>Interações</span>
          </article>
        </section>

        {isActiveTripSelected ? (
          <>
            <section className="mp-timeline-section">
              <div className="mp-section-heading">
                <div>
                  <p className="mp-section-kicker">Fotos</p>
                  <h2>Fotos da viagem</h2>
                  <span className="mp-section-description">
                    Momentos registados com os óculos durante esta viagem.
                  </span>
                </div>
              </div>

              {activeTripPhotos.length === 0 ? (
                <div className="mp-empty-state">
                  <Camera className="mp-empty-state-icon" />
                  <h3>Ainda não captaste fotos nesta viagem.</h3>
                  <p>Usa um toque nos óculos para guardar momentos.</p>
                </div>
              ) : (
                <PhotoTimeline
                  photos={activeTripPhotos}
                  selectedPhotoIds={selectedPhotoIds}
                  onTogglePhoto={onTogglePhoto}
                  onClearPhotoSelection={onClearPhotoSelection}
                  onLog={onLog}
                />
              )}
            </section>

            <section className="mp-companion-shortcut-card">
              <div className="mp-companion-shortcut-icon">
                <Sparkles className="mp-companion-shortcut-svg" />
              </div>

              <div className="mp-companion-shortcut-copy">
                <h2>Interações com o Companion</h2>
                <p>
                  As perguntas, traduções e respostas da AI desta viagem estão
                  no Companion enquanto a viagem está em curso.
                </p>
              </div>

              <button
                type="button"
                className="mp-companion-shortcut-button"
                onClick={handleOpenCompanion}
              >
                Abrir Companion
              </button>
            </section>
          </>
        ) : (
          <>
            <section className="mp-timeline-section">
              <div className="mp-section-heading">
                <div>
                  <p className="mp-section-kicker">Fotos</p>
                  <h2>Fotos</h2>
                  <span className="mp-section-description">
                    Fotos normais e imagens captadas durante interações AI.
                  </span>
                </div>
              </div>

              {detailPhotos.length === 0 &&
              detailVisualDiscoveries.length === 0 ? (
                <div className="mp-empty-state">
                  <Camera className="mp-empty-state-icon" />
                  <h3>Sem fotos associadas</h3>
                  <p>Este álbum mantém as contagens guardadas da viagem.</p>
                </div>
              ) : (
                <>
                  {detailPhotos.length > 0 && (
                    <PhotoTimeline
                      photos={detailPhotos}
                      selectedPhotoIds={selectedPhotoIds}
                      onTogglePhoto={onTogglePhoto}
                      onClearPhotoSelection={onClearPhotoSelection}
                      onLog={onLog}
                    />
                  )}

                  {detailVisualDiscoveries.length > 0 && (
                    <div className="mp-completed-photo-grid">
                      {detailVisualDiscoveries.map((discovery) => (
                        <img
                          key={discovery.id}
                          src={discovery.photoDataUrl}
                          alt="Foto usada numa interação AI"
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>

            <section className="mp-detail-list-section">
              <div className="mp-section-heading">
                <div>
                  <p className="mp-section-kicker">Lugares</p>
                  <h2>Lugares</h2>
                </div>
              </div>

              {detailPlaces.length === 0 ? (
                <div className="mp-empty-state">
                  <MapPin className="mp-empty-state-icon" />
                  <h3>Sem lugares associados</h3>
                  <p>Os lugares guardados desta viagem aparecem aqui.</p>
                </div>
              ) : (
                <div className="mp-detail-list">
                  {detailPlaces.map((place) => (
                    <article key={place.id} className="mp-detail-list-card">
                      <MapPin className="mp-detail-list-icon" />
                      <div>
                        <h3>{place.name}</h3>
                        <p>
                          {place.city} · {place.category}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="mp-detail-list-section">
              <div className="mp-section-heading">
                <div>
                  <p className="mp-section-kicker">Companion</p>
                  <h2>Interações e contexto</h2>
                </div>
              </div>

              {detailCompanionInteractions.length === 0 &&
              detailVisualDiscoveries.length === 0 &&
              detailTranscriptions.length === 0 ? (
                <div className="mp-empty-state">
                  <BookOpenText className="mp-empty-state-icon" />
                  <h3>Sem interações arquivadas</h3>
                  <p>Perguntas, traduções e respostas AI aparecem aqui.</p>
                </div>
              ) : (
                <div className="mp-detail-list">
                  {detailCompanionInteractions.map((interaction) => (
                    <article
                      key={interaction.id}
                      className="mp-detail-list-card"
                    >
                      <Sparkles className="mp-detail-list-icon" />
                      <div>
                        <h3>{interaction.title}</h3>
                        <p>{interaction.content}</p>
                      </div>
                    </article>
                  ))}

                  {detailVisualDiscoveries.map((discovery) => (
                    <article key={discovery.id} className="mp-detail-list-card">
                      <Sparkles className="mp-detail-list-icon" />
                      <div>
                        <h3>O que estou a ver</h3>
                        <p>{discovery.description}</p>
                      </div>
                    </article>
                  ))}

                  {detailTranscriptions.map((transcription) => (
                    <article
                      key={transcription.id}
                      className="mp-detail-list-card"
                    >
                      <FileText className="mp-detail-list-icon" />
                      <div>
                        <h3>{transcription.time}</h3>
                        <p>{transcription.text}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <MemoryMapSection places={detailPlaces} photos={detailPhotos} />
          </>
        )}
      </section>
    );
  }

  return (
    <section
      className="mp-page mp-gallery-page"
      aria-label="Memórias da viagem"
    >
      <header className="mp-gallery-header">
        <h1>Memórias</h1>

        <div className="mp-header-actions">
          <button
            type="button"
            className="mp-icon-button"
            aria-label="Criar coleção"
            onClick={() => setIsCreateCollectionOpen(true)}
          >
            <Plus className="mp-icon-button-svg" />
          </button>
          <button
            type="button"
            className={`mp-icon-button ${isSearchOpen ? "is-active" : ""}`}
            aria-label="Pesquisar memórias"
            onClick={() => setIsSearchOpen((value) => !value)}
          >
            <Search className="mp-icon-button-svg" />
          </button>
        </div>
      </header>

      {isSearchOpen && (
        <label className="mp-search-field">
          <Search className="mp-search-field-icon" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Pesquisar viagens..."
          />
        </label>
      )}

      <section className="mp-collections-section">
        <div className="mp-section-heading">
          <h2>Coleções</h2>
        </div>

        <div className="mp-collections-scroll-wrap">
          <div className="mp-collections-row">
            {[...userCollections, ...baseCollections].map(
              (collection, index) => (
                <CollectionCard
                  key={`${collection.title}-${index}`}
                  {...collection}
                />
              ),
            )}
          </div>

          <span className="mp-collections-scroll-hint" aria-hidden="true">
            <ChevronRight className="mp-collections-scroll-hint-icon" />
          </span>
        </div>
      </section>

      {hasActiveTrip && (
        <section className="mp-current-trip-section">
          <div className="mp-section-heading">
            <h2>Viagem em curso</h2>
          </div>

          <button
            type="button"
            className="mp-current-trip-card"
            onClick={() => setSelectedTripId(ACTIVE_TRIP_MEMORY_ID)}
          >
            <span className="mp-current-trip-cover" aria-hidden="true">
              {activeTripCoverUrl ? (
                <img src={activeTripCoverUrl} alt="" />
              ) : (
                <MapIcon className="mp-current-trip-cover-icon" />
              )}
            </span>

            <span className="mp-current-trip-copy">
              <span className="mp-current-trip-badge">Em curso</span>
              <strong>{currentTripName || "Viagem atual"}</strong>
              <span>{activeTripDateLabel}</span>
              <small>
                {activeTripPhotos.length} fotos · {activeTripPlaces.length}{" "}
                lugares · {activeTripInteractionCount} interações
              </small>
            </span>

            <ChevronRight className="mp-current-trip-chevron" />
          </button>
        </section>
      )}

      <section className="mp-albums-section">
        <div className="mp-section-heading">
          <h2>Viagens</h2>

          {pastTrips.length > 0 && (
            <button
              type="button"
              className={`mp-text-button ${isDeletingPastTrips ? "is-danger" : ""}`}
              onClick={
                isDeletingPastTrips
                  ? onCancelPastTripsDeleteMode
                  : onStartPastTripsDeleteMode
              }
            >
              {isDeletingPastTrips ? "Cancelar" : "Gerir"}
            </button>
          )}
        </div>

        {filteredTrips.length === 0 ? (
          <div className="mp-empty-state">
            <ImageIcon className="mp-empty-state-icon" />
            <h3>Ainda sem viagens</h3>
            <p>As viagens aparecem aqui quando houver memórias guardadas.</p>
          </div>
        ) : (
          <div className="mp-albums-grid">
            {filteredTrips.map((trip) => {
              const isPastTripSelected = selectedPastTripIds.includes(trip.id);
              const canSelectPastTrip = pastTrips.some(
                (item) => item.id === trip.id,
              );

              return (
                <div
                  key={trip.id}
                  className={`mp-album-select-wrap ${
                    isPastTripSelected ? "is-selected" : ""
                  }`}
                >
                  {isDeletingPastTrips && canSelectPastTrip && (
                    <button
                      type="button"
                      className="mp-album-select-control"
                      onClick={() => onTogglePastTripSelection(trip.id)}
                      aria-label={`Selecionar ${trip.title}`}
                    >
                      {isPastTripSelected ? "✓" : ""}
                    </button>
                  )}

                  <AlbumCard
                    title={trip.title}
                    dateLabel={trip.dateLabel}
                    photoCount={trip.photoCount}
                    placeCount={trip.placeCount}
                    coverUrl={trip.coverUrl}
                    onClick={() => {
                      if (isDeletingPastTrips && canSelectPastTrip) {
                        onTogglePastTripSelection(trip.id);
                        return;
                      }

                      setSelectedTripId(trip.id);
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {isDeletingPastTrips && (
          <div className="mp-delete-actions">
            <button
              type="button"
              className="mp-delete-secondary"
              onClick={onCancelPastTripsDeleteMode}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="mp-delete-primary"
              onClick={onDeleteSelectedPastTrips}
              disabled={selectedPastTripIds.length === 0}
            >
              Apagar selecionadas ({selectedPastTripIds.length})
            </button>
          </div>
        )}
      </section>

      <MemoryMapSection
        places={hasActiveTrip ? activeTripPlaces : []}
        photos={hasActiveTrip ? activeTripPhotos : []}
      />

      {isCreateCollectionOpen && (
        <div
          className="mp-sheet-backdrop"
          role="presentation"
          onClick={closeCollectionSheet}
        >
          <section
            className="mp-create-collection-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Criar coleção"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="mp-sheet-close"
              onClick={closeCollectionSheet}
              aria-label="Fechar"
            >
              <X className="mp-sheet-close-icon" />
            </button>

            <div>
              <p className="mp-section-kicker">Coleção</p>
              <h2>Criar coleção</h2>
              <p className="mp-sheet-description">
                Junta momentos, fotos e lugares num álbum temático.
              </p>
            </div>

            <label className="mp-create-field">
              <span>Nome da coleção</span>
              <input
                value={collectionName}
                onChange={(event) => {
                  setCollectionName(event.target.value);
                  setCollectionError("");
                }}
                placeholder="Ex: Cafés favoritos"
                autoFocus
              />
            </label>

            {collectionError && (
              <p className="mp-create-error">{collectionError}</p>
            )}

            <div className="mp-create-actions">
              <button
                type="button"
                className="mp-create-secondary"
                onClick={closeCollectionSheet}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="mp-create-primary"
                onClick={createCollection}
              >
                Criar coleção
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
