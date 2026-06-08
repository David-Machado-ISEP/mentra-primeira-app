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
  Moon,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Trees,
  Utensils,
  X,
  type LucideIcon,
} from "lucide-react";

import type { Photo } from "../PhotoStream";
import type { CompanionInteraction } from "../CompanionPage";
import type { VisitedPlace } from "../VisitedPlacesPanel";
import type { Transcription } from "../TranscriptionFeed";
import { AlbumCard } from "./AlbumCard";
import { CollectionCard } from "./CollectionCard";
import { MemoryMapSection } from "./MemoryMapSection";
import { PhotoTimeline } from "./PhotoTimeline";

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
  tripId?: string;
  aiCategory?: MemoryAiCategory;
  aiTags?: string[];
  aiConfidence?: number;
}

interface ArchivedPhoto {
  id: string;
  timestamp: string;
  requestId?: string;
  tripId?: string;
  url?: string;
}

interface ArchivedVisualDiscovery {
  id: string;
  userId: string;
  photoRequestId: string;
  description: string;
  timestamp: string;
  source: VisualDiscoverySource;
  tripId?: string;
  photoDataUrl?: string;
  aiCategory?: MemoryAiCategory;
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
  interactionCount?: number;
  coverPhotoUrl?: string;
  archivedPhotos?: ArchivedPhoto[];
  archivedPlaces?: VisitedPlace[];
  archivedTranscriptions?: Transcription[];
  archivedVisualDiscoveries?: ArchivedVisualDiscovery[];
  archivedCompanionInteractions?: CompanionInteraction[];
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

type SmartCollectionId =
  | "favorites"
  | "food"
  | "outdoor"
  | "landmarks"
  | "city"
  | "shopping"
  | "nightlife"
  | "general";

type ClassifiedMemoryCategoryId = Exclude<SmartCollectionId, "favorites">;

type SmartMemoryKind =
  | "photo"
  | "place"
  | "interaction"
  | "visual"
  | "transcription";

interface SmartMemoryItem {
  id: string;
  originalId: string;
  kind: SmartMemoryKind;
  category: ClassifiedMemoryCategoryId;
  title: string;
  description: string;
  timestamp?: string;
  imageUrl?: string;
  placeName?: string;
  tripName?: string;
  evidence: string;
}

interface SmartCollectionDefinition {
  id: SmartCollectionId;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  icon: LucideIcon;
  accent: "blue" | "green" | "violet" | "amber";
  patterns: string[];
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

const SMART_COLLECTION_DEFINITIONS: SmartCollectionDefinition[] = [
  {
    id: "favorites",
    title: "Favoritos",
    description:
      "Momentos com imagem guardados nas viagens. Quando existir um estado real de favorito, esta coleção pode passar a usar esse campo.",
    emptyTitle: "Ainda sem momentos visuais",
    emptyDescription:
      "As fotos captadas e imagens AI aparecem aqui automaticamente.",
    icon: Heart,
    accent: "green",
    patterns: [],
  },
  {
    id: "food",
    title: "Comida",
    description:
      "Fotos, lugares e interações relacionadas com comida, menus, restaurantes e cafés.",
    emptyTitle: "Ainda sem memórias de comida",
    emptyDescription:
      "Quando a AI detetar pratos, menus ou restaurantes, esses momentos aparecem aqui.",
    icon: Utensils,
    accent: "amber",
    patterns: [
      "food",
      "meal",
      "dish",
      "restaurant",
      "cafe",
      "coffee",
      "menu",
      "breakfast",
      "lunch",
      "dinner",
      "dessert",
      "drink",
      "comida",
      "prato",
      "restaurante",
      "café",
      "cafetaria",
      "menu",
      "pequeno almoço",
      "almoço",
      "jantar",
      "sobremesa",
      "bebida",
      "gastronomia",
      "pastelaria",
      "padaria",
    ],
  },
  {
    id: "outdoor",
    title: "Ar livre",
    description:
      "Momentos em exterior, natureza, praias, parques, jardins, rios e miradouros.",
    emptyTitle: "Ainda sem memórias ao ar livre",
    emptyDescription:
      "Paisagens, parques, praias e miradouros aparecem aqui quando forem detetados.",
    icon: Trees,
    accent: "green",
    patterns: [
      "outdoor",
      "nature",
      "park",
      "garden",
      "beach",
      "sea",
      "river",
      "lake",
      "trail",
      "mountain",
      "viewpoint",
      "landscape",
      "sunset",
      "ar livre",
      "exterior",
      "natureza",
      "parque",
      "jardim",
      "praia",
      "mar",
      "rio",
      "lago",
      "trilho",
      "montanha",
      "miradouro",
      "paisagem",
      "pôr do sol",
    ],
  },
  {
    id: "landmarks",
    title: "Monumentos",
    description:
      "Museus, igrejas, castelos, palácios, estátuas e locais históricos.",
    emptyTitle: "Ainda sem monumentos",
    emptyDescription:
      "Locais históricos, museus e monumentos guardados aparecem aqui.",
    icon: Landmark,
    accent: "blue",
    patterns: [
      "landmark",
      "monument",
      "museum",
      "church",
      "cathedral",
      "castle",
      "palace",
      "statue",
      "historic",
      "history",
      "heritage",
      "bridge",
      "monumento",
      "museu",
      "igreja",
      "catedral",
      "castelo",
      "palácio",
      "estátua",
      "histórico",
      "história",
      "património",
      "ponte",
    ],
  },
  {
    id: "city",
    title: "Cidade",
    description:
      "Ruas, praças, arquitetura, edifícios e ambiente urbano.",
    emptyTitle: "Ainda sem memórias urbanas",
    emptyDescription:
      "Ruas, praças e arquitetura da cidade aparecem aqui.",
    icon: Building2,
    accent: "blue",
    patterns: [
      "city",
      "urban",
      "street",
      "square",
      "building",
      "architecture",
      "downtown",
      "neighbourhood",
      "neighborhood",
      "cidade",
      "urbano",
      "rua",
      "praça",
      "edifício",
      "arquitetura",
      "centro",
      "bairro",
      "avenida",
    ],
  },
  {
    id: "shopping",
    title: "Compras",
    description:
      "Lojas, mercados, centros comerciais, lembranças e zonas comerciais.",
    emptyTitle: "Ainda sem memórias de compras",
    emptyDescription:
      "Lojas, mercados e zonas comerciais aparecem aqui automaticamente.",
    icon: ShoppingBag,
    accent: "amber",
    patterns: [
      "shopping",
      "shop",
      "store",
      "market",
      "mall",
      "souvenir",
      "boutique",
      "compras",
      "loja",
      "mercado",
      "centro comercial",
      "lembrança",
      "souvenirs",
      "boutique",
    ],
  },
  {
    id: "nightlife",
    title: "Vida noturna",
    description:
      "Bares, zonas noturnas, eventos, música e momentos ao fim do dia.",
    emptyTitle: "Ainda sem memórias noturnas",
    emptyDescription:
      "Bares, eventos e momentos noturnos aparecem aqui quando forem detetados.",
    icon: Moon,
    accent: "violet",
    patterns: [
      "nightlife",
      "night",
      "bar",
      "club",
      "pub",
      "concert",
      "music",
      "party",
      "evening",
      "cocktail",
      "vida noturna",
      "noite",
      "bar",
      "discoteca",
      "concerto",
      "música",
      "festa",
      "fim do dia",
      "cocktail",
    ],
  },
  {
    id: "general",
    title: "Momentos gerais",
    description:
      "Memórias que ainda não encaixam claramente numa categoria específica.",
    emptyTitle: "Ainda sem momentos gerais",
    emptyDescription:
      "Memórias sem uma categoria forte aparecem aqui.",
    icon: Sparkles,
    accent: "blue",
    patterns: [],
  },
];

const MEMORY_CONFIDENCE_THRESHOLD = 0.55;

const mapAiCategoryToSmartCategory = (
  category?: string,
  confidence?: number,
): ClassifiedMemoryCategoryId | null => {
  if (!category) return null;
  if (typeof confidence === "number" && confidence < MEMORY_CONFIDENCE_THRESHOLD) {
    return "general";
  }

  switch (category) {
    case "food":
      return "food";
    case "outdoor":
      return "outdoor";
    case "landmark":
      return "landmarks";
    case "city":
      return "city";
    case "shopping":
      return "shopping";
    case "nightlife":
      return "nightlife";
    case "transport":
      return "city";
    case "people":
    case "general":
      return "general";
    default:
      return null;
  }
};

const formatAiEvidence = (category?: string, confidence?: number) => {
  const confidenceLabel =
    typeof confidence === "number" ? ` · ${Math.round(confidence * 100)}%` : "";

  if (!category) return "Classificada pela análise de contexto disponível";
  return `Classificada pela análise visual do Gemini${confidenceLabel}`;
};

const normalizeForSmartMatching = (value: string | undefined) =>
  (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const classifySmartMemory = (
  text: string,
  aiCategory?: string,
  aiConfidence?: number,
): ClassifiedMemoryCategoryId => {
  const directAiCategory = mapAiCategoryToSmartCategory(aiCategory, aiConfidence);

  if (directAiCategory) {
    return directAiCategory;
  }

  const normalizedText = normalizeForSmartMatching(text);

  const scoredCategories = SMART_COLLECTION_DEFINITIONS.filter(
    (definition) =>
      definition.id !== "favorites" && definition.id !== "general",
  ).map((definition) => ({
    id: definition.id as ClassifiedMemoryCategoryId,
    score: definition.patterns.reduce((total, pattern) => {
      const normalizedPattern = normalizeForSmartMatching(pattern);
      return normalizedPattern && normalizedText.includes(normalizedPattern)
        ? total + 1
        : total;
    }, 0),
  }));

  const bestCategory = scoredCategories.sort((first, second) => {
    if (second.score !== first.score) return second.score - first.score;
    return first.id.localeCompare(second.id);
  })[0];

  return bestCategory?.score ? bestCategory.id : "general";
};

const getSmartCollectionItems = (
  collectionId: SmartCollectionId,
  items: SmartMemoryItem[],
) => {
  if (collectionId === "favorites") {
    return items.filter((item) => Boolean(item.imageUrl));
  }

  return items.filter((item) => item.category === collectionId);
};

const getSmartItemImage = (item?: SmartMemoryItem) => item?.imageUrl;

const formatPlaceTimestamp = (timestamp?: number) => {
  if (!timestamp) return "";

  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return "";
  }
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

const formatTripDate = (trip: PastTrip) => {
  if (trip.startedAt && trip.endedAt) return `${trip.startedAt} - ${trip.endedAt}`;
  return trip.startedAt || trip.endedAt || "Sem datas";
};

const hasImageUrl = (photo: ArchivedPhoto): photo is ArchivedPhoto & { url: string } =>
  Boolean(photo.url);

const toPhotoItemsWithImages = (photosToConvert: ArchivedPhoto[]): Photo[] =>
  photosToConvert.filter(hasImageUrl).map((photo) => ({
    id: photo.id,
    url: photo.url,
    timestamp: photo.timestamp,
    requestId: photo.requestId ?? photo.id,
    tripId: photo.tripId,
  }));

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
  userId,
  onTogglePhoto,
  onClearPhotoSelection,
  onLog,
  onTogglePastTripSelection,
  onStartPastTripsDeleteMode,
  onCancelPastTripsDeleteMode,
  onDeleteSelectedPastTrips,
}: MemoriesPageProps) {
  const [customCollections, setCustomCollections] = useState<MemoryCollection[]>(
    () => loadStoredCollections(),
  );
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
  ) =>
    !currentTripId ||
    !item.tripId ||
    item.tripId === currentTripId ||
    item.tripId === "current-trip";
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
    ? companionInteractions.filter(
        (interaction) =>
          !currentTripId ||
          interaction.tripId === currentTripId ||
          interaction.tripId === "current-trip",
      )
    : [];
  const activeTripInteractionCount =
    activeTripCompanionInteractions.length +
    activeTripVisualDiscoveries.length +
    activeTripTranscriptions.length;
  const activeTripCoverUrl =
    activeTripPhotos[0]?.url ?? activeTripVisualDiscoveries[0]?.photoDataUrl;
  const activeTripDateLabel = currentTripStartedAt
    ? `Desde ${currentTripStartedAt}`
    : "Em curso";
  const smartMemoryItems = useMemo<SmartMemoryItem[]>(() => {
    const tripNamesById = new Map<string, string>();

    if (currentTripId) {
      tripNamesById.set(currentTripId, currentTripName || "Viagem atual");
      tripNamesById.set("current-trip", currentTripName || "Viagem atual");
    }

    pastTrips.forEach((trip) => tripNamesById.set(trip.id, trip.name));

    const getTripName = (tripId?: string) =>
      tripId ? tripNamesById.get(tripId) : undefined;

    const allPhotos: ArchivedPhoto[] = [
      ...photos,
      ...pastTrips.flatMap((trip) => trip.archivedPhotos ?? []),
    ];
    const allPlaces: VisitedPlace[] = [
      ...places,
      ...pastTrips.flatMap((trip) => trip.archivedPlaces ?? []),
    ];
    const allTranscriptions: Transcription[] = [
      ...finalTranscriptions,
      ...pastTrips.flatMap((trip) => trip.archivedTranscriptions ?? []),
    ];
    const allVisualDiscoveries: ArchivedVisualDiscovery[] = [
      ...visualDiscoveries,
      ...pastTrips.flatMap((trip) => trip.archivedVisualDiscoveries ?? []),
    ];
    const allCompanionInteractions: CompanionInteraction[] = [
      ...companionInteractions,
      ...pastTrips.flatMap((trip) => trip.archivedCompanionInteractions ?? []),
    ];

    const uniqueItems = new Map<string, SmartMemoryItem>();

    const addItem = (item: SmartMemoryItem) => {
      if (!uniqueItems.has(item.id)) {
        uniqueItems.set(item.id, item);
      }
    };

    allPhotos.forEach((photo) => {
      const relatedPlace = allPlaces.find(
        (place) =>
          Boolean(photo.requestId && place.photoRequestId === photo.requestId) ||
          Boolean(photo.id && place.photoRequestId === photo.id),
      );
      const relatedVisualDiscovery = allVisualDiscoveries.find(
        (discovery) =>
          Boolean(photo.requestId && discovery.photoRequestId === photo.requestId) ||
          Boolean(photo.id && discovery.photoRequestId === photo.id),
      );
      const relatedInteraction = allCompanionInteractions.find(
        (interaction) =>
          interaction.photoId === photo.id ||
          interaction.id === photo.requestId ||
          interaction.source === photo.requestId,
      );
      const matchingText = [
        relatedPlace?.name,
        relatedPlace?.category,
        relatedPlace?.description,
        relatedPlace?.address,
        relatedVisualDiscovery?.description,
        relatedVisualDiscovery?.aiCategory,
        relatedVisualDiscovery?.aiTags?.join(" "),
        relatedInteraction?.title,
        relatedInteraction?.content,
      ]
        .filter(Boolean)
        .join(" ");
      const category = classifySmartMemory(
        matchingText,
        relatedVisualDiscovery?.aiCategory,
        relatedVisualDiscovery?.aiConfidence,
      );
      const placeName = relatedPlace?.name;

      addItem({
        id: `photo-${photo.id}`,
        originalId: photo.id,
        kind: "photo",
        category,
        title: placeName ? `Foto em ${placeName}` : "Foto guardada",
        description:
          relatedVisualDiscovery?.description ||
          relatedPlace?.description ||
          "Fotografia captada durante a viagem.",
        timestamp: photo.timestamp,
        imageUrl: photo.url,
        placeName,
        tripName: getTripName(photo.tripId),
        evidence: relatedVisualDiscovery?.aiCategory
          ? formatAiEvidence(
              relatedVisualDiscovery.aiCategory,
              relatedVisualDiscovery.aiConfidence,
            )
          : relatedVisualDiscovery
            ? "Classificada pela descrição AI da imagem"
            : relatedPlace
              ? "Associada ao local detetado"
              : "Classificação por contexto disponível",
      });
    });

    allPlaces.forEach((place) => {
      const matchingText = [
        place.name,
        place.city,
        place.category,
        place.description,
        place.address,
      ]
        .filter(Boolean)
        .join(" ");

      addItem({
        id: `place-${place.id}`,
        originalId: place.id,
        kind: "place",
        category: classifySmartMemory(matchingText),
        title: place.name,
        description: place.description || `${place.city} · ${place.category}`,
        timestamp: formatPlaceTimestamp(place.timestamp),
        placeName: place.name,
        tripName: getTripName(place.tripId),
        evidence: "Classificado pela categoria e descrição do local",
      });
    });

    allVisualDiscoveries.forEach((discovery) => {
      addItem({
        id: `visual-${discovery.id}`,
        originalId: discovery.id,
        kind: "visual",
        category: classifySmartMemory(
          [discovery.description, discovery.aiCategory, discovery.aiTags?.join(" ")]
            .filter(Boolean)
            .join(" "),
          discovery.aiCategory,
          discovery.aiConfidence,
        ),
        title: "Descrição AI",
        description: discovery.description,
        timestamp: discovery.timestamp,
        imageUrl: discovery.photoDataUrl,
        tripName: getTripName(discovery.tripId),
        evidence: discovery.aiCategory
          ? formatAiEvidence(discovery.aiCategory, discovery.aiConfidence)
          : "Classificada pela descrição AI da imagem",
      });
    });

    allCompanionInteractions.forEach((interaction) => {
      const matchingText = [
        interaction.type,
        interaction.title,
        interaction.content,
        interaction.source,
      ]
        .filter(Boolean)
        .join(" ");

      addItem({
        id: `interaction-${interaction.id}`,
        originalId: interaction.id,
        kind: "interaction",
        category: classifySmartMemory(matchingText),
        title: interaction.title,
        description: interaction.content,
        timestamp: interaction.createdAt,
        imageUrl: interaction.imageUrl ?? interaction.photoDataUrl,
        tripName: getTripName(interaction.tripId),
        evidence: "Classificada pelo texto da interação do Companion",
      });
    });

    allTranscriptions.forEach((transcription) => {
      addItem({
        id: `transcription-${transcription.id}`,
        originalId: String(transcription.id),
        kind: "transcription",
        category: classifySmartMemory(transcription.text),
        title: transcription.time || "Transcrição",
        description: transcription.text,
        timestamp: transcription.time,
        tripName: getTripName(transcription.tripId),
        evidence: "Classificada pela transcrição final",
      });
    });

    return Array.from(uniqueItems.values());
  }, [
    companionInteractions,
    currentTripId,
    currentTripName,
    finalTranscriptions,
    pastTrips,
    photos,
    places,
    visualDiscoveries,
  ]);

  const baseCollections = useMemo(
    () =>
      SMART_COLLECTION_DEFINITIONS.map((definition) => {
        const collectionItems = getSmartCollectionItems(
          definition.id,
          smartMemoryItems,
        );
        const coverItem = collectionItems.find((item) => Boolean(item.imageUrl));
        const countLabel = `${collectionItems.length} ${
          collectionItems.length === 1 ? "memória" : "memórias"
        }`;

        return {
          title: definition.title,
          countLabel,
          icon: definition.icon,
          coverUrl: getSmartItemImage(coverItem ?? collectionItems[0]),
          accent: definition.accent,
          onClick: () => setSelectedSmartCollectionId(definition.id),
        };
      }),
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
      transcriptsCount: trip.interactionCount ?? 0,
      coverUrl:
        trip.coverPhotoUrl ??
        trip.archivedPhotos?.find(hasImageUrl)?.url ??
        trip.archivedVisualDiscoveries?.find((discovery) =>
          Boolean(discovery.photoDataUrl),
        )?.photoDataUrl,
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
  const selectedSmartCollection = useMemo(
    () =>
      SMART_COLLECTION_DEFINITIONS.find(
        (definition) => definition.id === selectedSmartCollectionId,
      ) ?? null,
    [selectedSmartCollectionId],
  );
  const selectedSmartCollectionItems = useMemo(
    () =>
      selectedSmartCollectionId
        ? getSmartCollectionItems(selectedSmartCollectionId, smartMemoryItems)
        : [],
    [selectedSmartCollectionId, smartMemoryItems],
  );
  const selectedSmartCollectionPhotoItems = selectedSmartCollectionItems.filter(
    (item) => item.imageUrl,
  );
  const selectedSmartCollectionContextItems = selectedSmartCollectionItems.filter(
    (item) => !item.imageUrl,
  );
  const isActiveTripSelected =
    hasActiveTrip && selectedTripId === ACTIVE_TRIP_MEMORY_ID;

  const getTripPhotos = (tripId: string) =>
    photos.filter((photo) => photo.tripId === tripId);
  const getTripPlaces = (tripId: string) =>
    places.filter((place) => place.tripId === tripId);
  const getTripTranscriptions = (tripId: string) =>
    finalTranscriptions.filter((transcription) => transcription.tripId === tripId);
  const getTripVisualDiscoveries = (tripId: string) =>
    visualDiscoveries.filter((discovery) => discovery.tripId === tripId);
  const getTripCompanionInteractions = (tripId: string) =>
    companionInteractions.filter((interaction) => interaction.tripId === tripId);

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

    onLog("Abre o Companion pelo botão central para ver as interações da viagem.", "info");
  };

  if (selectedSmartCollection) {
    return (
      <section
        className="mp-page mp-trip-detail-page mp-collection-detail-page"
        aria-label={`Coleção ${selectedSmartCollection.title}`}
      >
        <header className="mp-trip-detail-header">
          <button
            type="button"
            className="mp-back-button"
            onClick={() => setSelectedSmartCollectionId(null)}
            aria-label="Voltar às coleções"
          >
            <ArrowLeft className="mp-back-button-icon" />
          </button>

          <div>
            <p>Classificação inteligente</p>
            <h1>{selectedSmartCollection.title}</h1>
            <span>{selectedSmartCollection.description}</span>
            <strong className="mp-trip-state-badge is-active">
              {selectedSmartCollectionItems.length} {selectedSmartCollectionItems.length === 1 ? "memória" : "memórias"}
            </strong>
          </div>
        </header>

        <section className="mp-ai-collection-note">
          <div className="mp-ai-collection-icon">
            <Sparkles className="mp-ai-collection-icon-svg" />
          </div>
          <div>
            <h2>Organização automática</h2>
            <p>
              A coleção usa descrições AI, texto do Companion, categorias de locais
              e transcrições para agrupar as memórias sem precisares de as mover manualmente.
            </p>
          </div>
        </section>

        <section className="mp-timeline-section">
          <div className="mp-section-heading">
            <div>
              <p className="mp-section-kicker">Fotos</p>
              <h2>Momentos visuais</h2>
              <span className="mp-section-description">
                Fotos e imagens AI que encaixam nesta coleção.
              </span>
            </div>
          </div>

          {selectedSmartCollectionPhotoItems.length === 0 ? (
            <div className="mp-empty-state">
              <Camera className="mp-empty-state-icon" />
              <h3>{selectedSmartCollection.emptyTitle}</h3>
              <p>{selectedSmartCollection.emptyDescription}</p>
            </div>
          ) : (
            <div className="mp-smart-photo-grid">
              {selectedSmartCollectionPhotoItems.map((item) => (
                <article key={item.id} className="mp-smart-photo-card">
                  <div className="mp-smart-photo-preview">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} />
                    ) : (
                      <Camera className="mp-smart-photo-empty-icon" />
                    )}
                  </div>

                  <div className="mp-smart-photo-copy">
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>

                    <div className="mp-smart-memory-meta-row">
                      {item.placeName && <span>{item.placeName}</span>}
                      {item.tripName && <span>{item.tripName}</span>}
                    </div>

                    <small>{item.evidence}</small>
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

          {selectedSmartCollectionContextItems.length === 0 ? (
            <div className="mp-empty-state">
              <BookOpenText className="mp-empty-state-icon" />
              <h3>Sem contexto adicional</h3>
              <p>Quando existirem locais, interações ou transcrições relacionadas, aparecem aqui.</p>
            </div>
          ) : (
            <div className="mp-detail-list">
              {selectedSmartCollectionContextItems.map((item) => (
                <article key={item.id} className="mp-detail-list-card">
                  {item.kind === "place" ? (
                    <MapPin className="mp-detail-list-icon" />
                  ) : item.kind === "transcription" ? (
                    <FileText className="mp-detail-list-icon" />
                  ) : (
                    <Sparkles className="mp-detail-list-icon" />
                  )}

                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <div className="mp-smart-memory-meta-row">
                      {item.timestamp && <span>{item.timestamp}</span>}
                      {item.tripName && <span>{item.tripName}</span>}
                    </div>
                    <small>{item.evidence}</small>
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
    const liveTripPhotos = detailTripId ? getTripPhotos(detailTripId) : [];
    const liveTripPlaces = detailTripId ? getTripPlaces(detailTripId) : [];
    const liveTripTranscriptions = detailTripId
      ? getTripTranscriptions(detailTripId)
      : [];
    const liveTripVisualDiscoveries = detailTripId
      ? getTripVisualDiscoveries(detailTripId)
      : [];
    const liveTripCompanionInteractions = detailTripId
      ? getTripCompanionInteractions(detailTripId)
      : [];

    const detailPhotos: ArchivedPhoto[] = isActiveTripSelected
      ? activeTripPhotos
      : liveTripPhotos.length > 0
        ? liveTripPhotos
        : selectedPastTrip?.archivedPhotos ?? [];
    const detailPlaces = isActiveTripSelected
      ? activeTripPlaces
      : liveTripPlaces.length > 0
        ? liveTripPlaces
        : selectedPastTrip?.archivedPlaces ?? [];
    const detailTranscriptions = isActiveTripSelected
      ? activeTripTranscriptions
      : liveTripTranscriptions.length > 0
        ? liveTripTranscriptions
        : selectedPastTrip?.archivedTranscriptions ?? [];
    const detailVisualDiscoveries: ArchivedVisualDiscovery[] = isActiveTripSelected
      ? activeTripVisualDiscoveries
      : liveTripVisualDiscoveries.length > 0
        ? liveTripVisualDiscoveries
        : selectedPastTrip?.archivedVisualDiscoveries ?? [];
    const detailCompanionInteractions = isActiveTripSelected
      ? activeTripCompanionInteractions
      : liveTripCompanionInteractions.length > 0
        ? liveTripCompanionInteractions
        : selectedPastTrip?.archivedCompanionInteractions ?? [];
    const detailInteractionCount =
      detailCompanionInteractions.length +
      detailVisualDiscoveries.length +
      detailTranscriptions.length;
    const detailTitle = isActiveTripSelected
      ? currentTripName || "Viagem atual"
      : selectedTrip?.title ?? "Viagem";
    const detailDateLabel = isActiveTripSelected
      ? activeTripDateLabel
      : selectedTrip?.dateLabel ?? "";
    const detailLocationLabel = isActiveTripSelected
      ? currentTripLocation
      : selectedTrip?.locationLabel ?? "";
    const detailCoverUrl = isActiveTripSelected
      ? activeTripCoverUrl
      : detailPhotos.find(hasImageUrl)?.url ??
        detailVisualDiscoveries.find((discovery) => discovery.photoDataUrl)
          ?.photoDataUrl ??
        selectedTrip?.coverUrl;
    const summaryPhotoCount = isActiveTripSelected
      ? activeTripPhotos.length
      : selectedTrip?.photoCount || detailPhotos.length || 0;
    const summaryPlaceCount = isActiveTripSelected
      ? activeTripPlaces.length
      : selectedTrip?.placeCount || detailPlaces.length || 0;
    const summaryInteractionCount = isActiveTripSelected
      ? activeTripInteractionCount
      : selectedTrip?.transcriptsCount || detailInteractionCount || 0;
    const mapPhotos = toPhotoItemsWithImages(detailPhotos);

    return (
      <section className="mp-page mp-trip-detail-page" aria-label="Detalhe da viagem">
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
                    Fotos captadas com single tap durante esta viagem.
                  </span>
                </div>
              </div>

              {activeTripPhotos.length === 0 ? (
                <div className="mp-empty-state">
                  <Camera className="mp-empty-state-icon" />
                  <h3>Ainda não captaste fotos nesta viagem.</h3>
                  <p>Usa um single tap nos óculos para guardar momentos.</p>
                </div>
              ) : (
                <PhotoTimeline
                  photos={activeTripPhotos}
                  selectedPhotoIds={selectedPhotoIds}
                  onTogglePhoto={onTogglePhoto}
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

              {detailPhotos.length === 0 && detailVisualDiscoveries.length === 0 ? (
                <div className="mp-empty-state">
                  <Camera className="mp-empty-state-icon" />
                  <h3>Sem fotos associadas</h3>
                  <p>Este álbum mantém as contagens guardadas da viagem.</p>
                </div>
              ) : (
                <div className="mp-completed-photo-grid">
                  {detailPhotos.map((photo) =>
                    photo.url ? (
                      <img key={photo.id} src={photo.url} alt="Foto da viagem" />
                    ) : (
                      <article key={photo.id} className="mp-completed-photo-placeholder">
                        <Camera className="mp-completed-photo-placeholder-icon" />
                        <span>Foto guardada</span>
                        <small>{photo.timestamp || "Sem hora"}</small>
                      </article>
                    ),
                  )}

                  {detailVisualDiscoveries.map((discovery) =>
                    discovery.photoDataUrl ? (
                      <img
                        key={discovery.id}
                        src={discovery.photoDataUrl}
                        alt="Foto usada numa interação AI"
                      />
                    ) : (
                      <article
                        key={discovery.id}
                        className="mp-completed-photo-placeholder"
                      >
                        <Sparkles className="mp-completed-photo-placeholder-icon" />
                        <span>Imagem AI guardada</span>
                        <small>{discovery.timestamp || "Sem hora"}</small>
                      </article>
                    ),
                  )}
                </div>
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
                    <article key={interaction.id} className="mp-detail-list-card">
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
                    <article key={transcription.id} className="mp-detail-list-card">
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

            <MemoryMapSection places={detailPlaces} photos={mapPhotos} />
          </>
        )}
      </section>
    );
  }

  return (
    <section className="mp-page mp-gallery-page" aria-label="Memórias da viagem">
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
            {[...userCollections, ...baseCollections].map((collection, index) => (
              <CollectionCard key={`${collection.title}-${index}`} {...collection} />
            ))}
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
                {activeTripPhotos.length} fotos · {activeTripPlaces.length} lugares ·{" "}
                {activeTripInteractionCount} interações
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
              const canSelectPastTrip = pastTrips.some((item) => item.id === trip.id);

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

      <section className="mp-map-overview-section">
        <div className="mp-section-heading">
          <h2>Mapa</h2>
        </div>

        <article className="mp-map-overview-card">
          <div className="mp-map-overview-canvas" aria-label="Mapa de lugares">
            <span className="mp-map-overview-route mp-map-overview-route-one" />
            <span className="mp-map-overview-route mp-map-overview-route-two" />

            {places.slice(0, 5).map((place, index) => (
              <span
                key={place.id}
                className="mp-map-overview-pin"
                style={{
                  left: `${[22, 58, 73, 35, 48][index] ?? 50}%`,
                  top: `${[36, 28, 56, 68, 44][index] ?? 50}%`,
                }}
                title={place.name}
              >
                {photos[index]?.url ? (
                  <img src={photos[index].url} alt={place.name} />
                ) : (
                  <MapPin className="mp-map-overview-pin-icon" />
                )}
              </span>
            ))}

            {places.length === 0 && (
              <div className="mp-map-overview-empty">
                <MapIcon className="mp-map-overview-empty-icon" />
              </div>
            )}
          </div>

          <div className="mp-map-overview-copy">
            <h3>Lugares</h3>
            <p>{places.length}</p>
          </div>
        </article>
      </section>

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
