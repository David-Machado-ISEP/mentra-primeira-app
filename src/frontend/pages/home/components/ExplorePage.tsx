import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Coffee,
  Compass,
  Landmark,
  MapPin,
  MoreHorizontal,
  Search,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trees,
  Utensils,
  Waves,
} from "lucide-react";

import type { TravelPreferences } from "./IntroPreferences";

interface ExplorePageProps {
  preferences: TravelPreferences;
  currentLocation: CurrentLocation | null;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  onAddToItinerary: (
    recommendation: RecommendationLikeItem,
    source: "smart" | "nearby",
  ) => void;
}

interface CurrentLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
  placeName?: string;
  displayName?: string;
  city?: string;
  country?: string;
}

interface SmartRecommendation {
  id: string;
  title: string;
  description: string;
  badge: string;
  image: string;
  actionLabel: string;
  estimatedTime: string;
  category: string;
  budget: "low" | "medium" | "high";
  interests: string[];
}

interface NearbyPlace {
  id: string;
  name: string;
  category: string;
  description: string;
  estimatedTime: string;
  budget: "low" | "medium" | "high";
  interests: string[];
  city: string;
  distance: string;
  rating: number;
  image: string;
  icon: "monument" | "viewpoint" | "cafe" | "nature" | "restaurant" | "museum";
}

interface AiNearbyRecommendation {
  id: string;
  name: string;
  category: string;
  description: string;
  estimatedTime: string;
  budget: "low" | "medium" | "high";
  interests: string[];
  reason?: string;
}

interface RecommendationLikeItem {
  id: string;
  name: string;
  category: string;
  description: string;
  estimatedTime: string;
  budget: "low" | "medium" | "high";
  interests: string[];
  reason?: string;
}

const LIKED_RECOMMENDATIONS_KEY = "travel-whisperer-liked-recommendations";
const DISMISSED_RECOMMENDATIONS_KEY =
  "travel-whisperer-dismissed-recommendations";
const LEARNED_INTEREST_SCORES_KEY =
  "travel-whisperer-learned-interest-scores";

const exploreFilters = [
  "Próximos",
  "Museus",
  "Restaurantes",
  "Praias",
  "Natureza",
  "Monumentos",
];

const interestLabels: Record<string, string> = {
  monuments: "história e arte",
  local_food: "gastronomia",
  nature: "natureza",
  architecture: "arquitetura",
  nightlife: "vida noturna",
  local_culture: "cultura local",
  shopping: "compras",
  photography: "fotografia",
  adventure: "aventura",
  beaches: "praias",
};

const smartRecommendations: SmartRecommendation[] = [
  {
    id: "azulejos-route",
    title: "Rota dos azulejos",
    description: "5 paragens em 2h, com sugestões feitas para si.",
    badge: "Feito para si",
    image:
      "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=900&q=80",
    actionLabel: "Ver rota",
    estimatedTime: "2h",
    category: "Rota personalizada",
    budget: "low",
    interests: ["architecture", "monuments", "photography", "local_culture"],
  },
  {
    id: "sunset-porto",
    title: "Porto ao pôr do sol",
    description: "Miradouros e ruas com as melhores vistas.",
    badge: "Recomendado",
    image:
      "https://images.unsplash.com/photo-1513735492246-483525079686?auto=format&fit=crop&w=900&q=80",
    actionLabel: "Explorar",
    estimatedTime: "1h30",
    category: "Miradouros",
    budget: "low",
    interests: ["nature", "photography", "local_culture"],
  },
  {
    id: "local-flavours",
    title: "Sabores locais",
    description: "Cafés, mercados e restaurantes escolhidos para si.",
    badge: "Com base nos teus gostos",
    image:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80",
    actionLabel: "Ver sugestão",
    estimatedTime: "2h30",
    category: "Gastronomia",
    budget: "medium",
    interests: ["local_food", "local_culture", "shopping"],
  },
];

const nearbyPlaces: NearbyPlace[] = [
  {
    id: "livraria-lello",
    name: "Livraria Lello",
    category: "Monumento",
    description:
      "Uma das livrarias mais icónicas do Porto, com interiores históricos e muito bons detalhes para fotografia.",
    estimatedTime: "30-45 min",
    budget: "medium",
    interests: ["monuments", "architecture", "photography", "local_culture"],
    city: "Porto",
    distance: "0.4 km",
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1529148482759-b35b25c5f217?auto=format&fit=crop&w=220&q=80",
    icon: "monument",
  },
  {
    id: "ribeira-porto",
    name: "Ribeira do Porto",
    category: "Miradouro",
    description:
      "Zona ribeirinha perfeita para caminhar, fotografar o Douro e sentir a atmosfera local da cidade.",
    estimatedTime: "45-60 min",
    budget: "low",
    interests: ["local_culture", "photography", "architecture"],
    city: "Porto",
    distance: "0.9 km",
    rating: 4.9,
    image:
      "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=220&q=80",
    icon: "viewpoint",
  },
  {
    id: "cafe-majestic",
    name: "Café Majestic",
    category: "Café",
    description:
      "Café histórico com arquitetura marcante, ideal para uma pausa ligada à gastronomia e cultura local.",
    estimatedTime: "30-45 min",
    budget: "medium",
    interests: ["local_food", "architecture", "local_culture"],
    city: "Porto",
    distance: "1.2 km",
    rating: 4.6,
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=220&q=80",
    icon: "cafe",
  },
  {
    id: "ponte-luis-i",
    name: "Ponte Luís I",
    category: "Monumento",
    description:
      "Ponte emblemática com uma das vistas mais reconhecíveis sobre o Douro e o centro histórico.",
    estimatedTime: "30-45 min",
    budget: "low",
    interests: ["monuments", "architecture", "photography"],
    city: "Porto",
    distance: "1.5 km",
    rating: 4.9,
    image:
      "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=220&q=80",
    icon: "monument",
  },
  {
    id: "mercado-bolhao",
    name: "Mercado do Bolhão",
    category: "Restaurante",
    description:
      "Mercado histórico renovado, bom para provar sabores locais e descobrir produtos tradicionais.",
    estimatedTime: "45-60 min",
    budget: "medium",
    interests: ["local_food", "local_culture", "shopping"],
    city: "Porto",
    distance: "1.0 km",
    rating: 4.7,
    image:
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=220&q=80",
    icon: "restaurant",
  },
  {
    id: "jardins-palacio-cristal",
    name: "Jardins do Palácio de Cristal",
    category: "Natureza",
    description:
      "Jardins tranquilos com vistas sobre o Douro, perfeitos para uma visita relaxada e fotogénica.",
    estimatedTime: "45-60 min",
    budget: "low",
    interests: ["nature", "photography", "local_culture"],
    city: "Porto",
    distance: "1.6 km",
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=220&q=80",
    icon: "nature",
  },
  {
    id: "museu-soares-dos-reis",
    name: "Museu Soares dos Reis",
    category: "Museu",
    description:
      "Museu histórico com arte portuguesa, indicado para quem gosta de cultura, história e visitas calmas.",
    estimatedTime: "60-90 min",
    budget: "medium",
    interests: ["monuments", "local_culture"],
    city: "Porto",
    distance: "1.4 km",
    rating: 4.5,
    image:
      "https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=220&q=80",
    icon: "museum",
  },
  {
    id: "foz-douro",
    name: "Foz do Douro",
    category: "Praias",
    description:
      "Passeio junto ao mar, bom para fotografar, respirar e terminar o dia de forma mais calma.",
    estimatedTime: "60-90 min",
    budget: "low",
    interests: ["beaches", "nature", "photography"],
    city: "Porto",
    distance: "5.2 km",
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=220&q=80",
    icon: "nature",
  },
];

const getNearbyIcon = (icon: NearbyPlace["icon"]) => {
  if (icon === "cafe") return Coffee;
  if (icon === "museum") return Landmark;
  if (icon === "nature") return Trees;
  if (icon === "restaurant") return Utensils;
  if (icon === "viewpoint") return MapPin;
  return Landmark;
};

const readStringArray = (key: string) => {
  if (typeof window === "undefined") return [];

  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as string[]) : [];
  } catch {
    return [];
  }
};

const readInterestScores = () => {
  if (typeof window === "undefined") return {};

  try {
    const value = localStorage.getItem(LEARNED_INTEREST_SCORES_KEY);
    return value ? (JSON.parse(value) as Record<string, number>) : {};
  } catch {
    return {};
  }
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const isNearPorto = (location: CurrentLocation | null) => {
  if (!location) return true;

  const label = normalizeText(
    [location.city, location.placeName, location.displayName, location.country]
      .filter(Boolean)
      .join(" "),
  );

  if (
    label.includes("porto") ||
    label.includes("rio tinto") ||
    label.includes("baguim") ||
    label.includes("gondomar") ||
    label.includes("maia")
  ) {
    return true;
  }

  return (
    location.lat >= 41.05 &&
    location.lat <= 41.3 &&
    location.lng >= -8.75 &&
    location.lng <= -8.45
  );
};

const getLocationCity = (location: CurrentLocation | null) => {
  if (!location) return "Porto";
  if (isNearPorto(location)) return "Porto";

  return (
    location.city ||
    location.placeName?.split(",")[0] ||
    location.displayName?.split(",")[0] ||
    "a tua localização"
  );
};

const getLocationLabel = (location: CurrentLocation | null) => {
  if (!location) return "Porto";

  return (
    location.displayName ||
    location.placeName ||
    location.city ||
    `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
  );
};

const getMatchedInterests = (
  itemInterests: string[],
  preferences: TravelPreferences,
) =>
  itemInterests.filter((interest) =>
    preferences.interests.includes(interest),
  );

const scoreRecommendation = (
  item: Pick<NearbyPlace | SmartRecommendation, "budget" | "interests" | "estimatedTime">,
  preferences: TravelPreferences,
  learnedInterestScores: Record<string, number>,
) => {
  const matchedInterests = getMatchedInterests(item.interests, preferences);
  const interestScore = matchedInterests.length * 10;
  const budgetScore = item.budget === preferences.budget ? 5 : 0;
  const behaviorScore = item.interests.reduce(
    (score, interest) => score + (learnedInterestScores[interest] ?? 0),
    0,
  );

  const paceScore =
    preferences.travelPace === "fast" && item.estimatedTime.includes("30")
      ? 2
      : preferences.travelPace === "relaxed" &&
          (item.estimatedTime.includes("60") || item.estimatedTime.includes("90"))
        ? 2
        : preferences.travelPace === "balanced"
          ? 1
          : 0;

  return interestScore + budgetScore + behaviorScore * 3 + paceScore;
};

const buildReason = (
  itemInterests: string[],
  preferences: TravelPreferences,
  city: string,
) => {
  const matchedInterests = getMatchedInterests(itemInterests, preferences);

  if (matchedInterests.length > 0) {
    return `Sugerido em ${city} porque combina com ${matchedInterests
      .map((interest) => interestLabels[interest] ?? interest)
      .slice(0, 2)
      .join(" e ")}.`;
  }

  return `Sugerido perto de ${city} para ajudar a variar a viagem.`;
};

const placeMatchesFilter = (place: NearbyPlace, activeFilter: string) => {
  if (activeFilter === "Próximos") return true;

  const category = normalizeText(place.category);
  const filter = normalizeText(activeFilter);

  if (filter === "restaurantes") {
    return category.includes("restaurante") || category.includes("cafe");
  }

  if (filter === "monumentos") {
    return category.includes("monumento") || category.includes("miradouro");
  }

  return category.includes(filter.slice(0, -1)) || category.includes(filter);
};

const getPlaceImageForRecommendation = (recommendation: AiNearbyRecommendation) => {
  const category = normalizeText(recommendation.category);
  const interests = recommendation.interests.join("|");

  if (interests.includes("local_food") || category.includes("cafe")) {
    return "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=220&q=80";
  }

  if (interests.includes("nature") || interests.includes("beaches")) {
    return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=220&q=80";
  }

  if (category.includes("museu")) {
    return "https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=220&q=80";
  }

  return "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=220&q=80";
};

const getPlaceIconForRecommendation = (
  recommendation: AiNearbyRecommendation,
): NearbyPlace["icon"] => {
  const category = normalizeText(recommendation.category);
  const interests = recommendation.interests.join("|");

  if (category.includes("museu")) return "museum";
  if (category.includes("cafe")) return "cafe";
  if (category.includes("restaurante") || interests.includes("local_food")) {
    return "restaurant";
  }
  if (interests.includes("nature") || interests.includes("beaches")) {
    return "nature";
  }
  if (category.includes("miradouro")) return "viewpoint";

  return "monument";
};

const mapAiRecommendationToNearbyPlace = (
  recommendation: AiNearbyRecommendation,
  city: string,
): NearbyPlace => ({
  id: recommendation.id,
  name: recommendation.name,
  category: recommendation.category,
  description: recommendation.description,
  estimatedTime: recommendation.estimatedTime,
  budget: recommendation.budget,
  interests: recommendation.interests,
  city,
  distance: recommendation.estimatedTime,
  rating: 4.8,
  image: getPlaceImageForRecommendation(recommendation),
  icon: getPlaceIconForRecommendation(recommendation),
});

const toItineraryRecommendation = (
  place: NearbyPlace,
  preferences: TravelPreferences,
  city: string,
): RecommendationLikeItem => ({
  id: place.id,
  name: place.name,
  category: place.category,
  description: place.description,
  estimatedTime: place.estimatedTime,
  budget: place.budget,
  interests: place.interests,
  reason: buildReason(place.interests, preferences, city),
});

export function ExplorePage({
  preferences,
  currentLocation,
  onLog,
  onAddToItinerary,
}: ExplorePageProps) {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const latestNearbyRequestIdRef = useRef(0);
  const fetchedNearbyKeyRef = useRef<string | null>(null);
  const [activeFilter, setActiveFilter] = useState(exploreFilters[0]);
  const [activeRecommendation, setActiveRecommendation] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [aiNearbyPlaces, setAiNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [isLoadingNearbyPlaces, setIsLoadingNearbyPlaces] = useState(false);
  const [nearbyPlacesError, setNearbyPlacesError] = useState<string | null>(null);
  const [likedRecommendations, setLikedRecommendations] = useState<string[]>(
    () => readStringArray(LIKED_RECOMMENDATIONS_KEY),
  );
  const [dismissedRecommendations, setDismissedRecommendations] = useState<
    string[]
  >(() => readStringArray(DISMISSED_RECOMMENDATIONS_KEY));
  const [learnedInterestScores, setLearnedInterestScores] = useState<
    Record<string, number>
  >(() => readInterestScores());

  const locationCity = useMemo(
    () => getLocationCity(currentLocation),
    [currentLocation],
  );
  const locationLabel = useMemo(
    () => getLocationLabel(currentLocation),
    [currentLocation],
  );

  useEffect(() => {
    localStorage.setItem(
      LIKED_RECOMMENDATIONS_KEY,
      JSON.stringify(likedRecommendations),
    );
  }, [likedRecommendations]);

  useEffect(() => {
    localStorage.setItem(
      DISMISSED_RECOMMENDATIONS_KEY,
      JSON.stringify(dismissedRecommendations),
    );
  }, [dismissedRecommendations]);

  useEffect(() => {
    localStorage.setItem(
      LEARNED_INTEREST_SCORES_KEY,
      JSON.stringify(learnedInterestScores),
    );
  }, [learnedInterestScores]);

  const personalizedSmartRecommendations = useMemo(() => {
    return [...smartRecommendations].sort(
      (firstRecommendation, secondRecommendation) =>
        scoreRecommendation(
          secondRecommendation,
          preferences,
          learnedInterestScores,
        ) -
        scoreRecommendation(
          firstRecommendation,
          preferences,
          learnedInterestScores,
        ),
    );
  }, [learnedInterestScores, preferences]);

  const fetchNearbyPlaces = useCallback(
    async ({ refresh = false }: { refresh?: boolean } = {}) => {
      if (!currentLocation) return;

      const requestId = ++latestNearbyRequestIdRef.current;

      try {
        setIsLoadingNearbyPlaces(true);
        setNearbyPlacesError(null);

        const response = await fetch("/api/recommendations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "nearby",
            city: locationLabel,
            location: currentLocation,
            preferences,
            learnedInterestScores,
            likedPlaces: likedRecommendations,
            dismissedPlaces: dismissedRecommendations,
            refreshSeed: refresh ? Date.now() : undefined,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch nearby recommendations");
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Nearby recommendations failed");
        }

        if (requestId !== latestNearbyRequestIdRef.current) return;

        const recommendations = (data.recommendations ||
          []) as AiNearbyRecommendation[];

        setAiNearbyPlaces(
          recommendations.map((recommendation) =>
            mapAiRecommendationToNearbyPlace(recommendation, locationCity),
          ),
        );

        onLog(
          refresh
            ? "Nearby recommendations refreshed"
            : "Nearby recommendations updated from location and preferences",
          "success",
        );
      } catch (error) {
        console.error("[Explore] Failed to fetch nearby recommendations", error);

        if (requestId !== latestNearbyRequestIdRef.current) return;

        setNearbyPlacesError(
          "Não foi possível gerar locais por perto agora. Mostro sugestões locais enquanto isso.",
        );
      } finally {
        if (requestId === latestNearbyRequestIdRef.current) {
          setIsLoadingNearbyPlaces(false);
        }
      }
    },
    [
      currentLocation,
      dismissedRecommendations,
      learnedInterestScores,
      likedRecommendations,
      locationCity,
      locationLabel,
      onLog,
      preferences,
    ],
  );

  const nearbyFetchKey = useMemo(() => {
    if (!currentLocation) return null;

    return `${currentLocation.lat.toFixed(4)},${currentLocation.lng.toFixed(
      4,
    )}|${JSON.stringify(preferences)}`;
  }, [currentLocation, preferences]);

  useEffect(() => {
    if (!nearbyFetchKey) return;
    if (fetchedNearbyKeyRef.current === nearbyFetchKey) return;

    fetchedNearbyKeyRef.current = nearbyFetchKey;
    void fetchNearbyPlaces();
  }, [fetchNearbyPlaces, nearbyFetchKey]);

  const filteredNearbyPlaces = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sourcePlaces = aiNearbyPlaces.length > 0 ? aiNearbyPlaces : nearbyPlaces;

    return sourcePlaces
      .filter((place) => {
        const matchesLocation = isNearPorto(currentLocation)
          ? place.city === "Porto"
          : true;
        const matchesSearch =
          !query ||
          place.name.toLowerCase().includes(query) ||
          place.category.toLowerCase().includes(query) ||
          place.description.toLowerCase().includes(query);

        return (
          matchesLocation &&
          matchesSearch &&
          placeMatchesFilter(place, activeFilter) &&
          !dismissedRecommendations.includes(place.id)
        );
      })
      .sort(
        (firstPlace, secondPlace) =>
          scoreRecommendation(secondPlace, preferences, learnedInterestScores) -
          scoreRecommendation(firstPlace, preferences, learnedInterestScores),
      );
  }, [
    activeFilter,
    aiNearbyPlaces,
    currentLocation,
    dismissedRecommendations,
    learnedInterestScores,
    preferences,
    searchQuery,
  ]);

  const handleCarouselScroll = () => {
    const carousel = carouselRef.current;
    const firstCard = carousel?.querySelector<HTMLElement>(".ep-smart-card");

    if (!carousel || !firstCard) return;

    const gap = 14;
    const cardStep = firstCard.offsetWidth + gap;
    const nextIndex = Math.round(carousel.scrollLeft / cardStep);

    setActiveRecommendation(
      Math.max(
        0,
        Math.min(personalizedSmartRecommendations.length - 1, nextIndex),
      ),
    );
  };

  const openSmartRecommendation = (recommendation: SmartRecommendation) => {
    onLog(
      `Smart recommendation opened: ${recommendation.title} (${preferences.interests.length} interests, ${locationCity})`,
      "info",
    );
  };

  const openNearbyPlace = (place: NearbyPlace) => {
    onLog(`Nearby place opened: ${place.name} (${locationCity})`, "info");
  };

  const likeNearbyPlace = (place: NearbyPlace) => {
    const wasAlreadyLiked = likedRecommendations.includes(place.id);

    setLikedRecommendations((currentLikedRecommendations) =>
      currentLikedRecommendations.includes(place.id)
        ? currentLikedRecommendations
        : [...currentLikedRecommendations, place.id],
    );
    setDismissedRecommendations((currentDismissedRecommendations) =>
      currentDismissedRecommendations.filter((id) => id !== place.id),
    );

    if (!wasAlreadyLiked) {
      setLearnedInterestScores((currentScores) => {
        const nextScores = { ...currentScores };

        place.interests.forEach((interest) => {
          nextScores[interest] = (nextScores[interest] ?? 0) + 1;
        });

        return nextScores;
      });
    }

    onAddToItinerary(
      toItineraryRecommendation(place, preferences, locationCity),
      "nearby",
    );
  };

  const dismissNearbyPlace = (place: NearbyPlace) => {
    setDismissedRecommendations((currentDismissedRecommendations) =>
      currentDismissedRecommendations.includes(place.id)
        ? currentDismissedRecommendations
        : [...currentDismissedRecommendations, place.id],
    );
    setLikedRecommendations((currentLikedRecommendations) =>
      currentLikedRecommendations.filter((id) => id !== place.id),
    );

    onLog(`Sugestão ignorada: ${place.name}`, "info");
  };

  return (
    <section className="ep-shell" aria-label="Explorar lugares">
      <header className="ep-header">
        <h1>Explorar</h1>

        <button
          type="button"
          className="ep-more-button"
          aria-label="Abrir opções de exploração"
          onClick={() => onLog("Explore options opened", "info")}
        >
          <MoreHorizontal />
        </button>
      </header>

      <label className="ep-search">
        <Search className="ep-search-icon" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Procurar lugares..."
        />
      </label>

      <div className="ep-filter-row" aria-label="Filtros de exploração">
        {exploreFilters.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`ep-filter-chip ${
              filter === activeFilter ? "ep-filter-chip-active" : ""
            }`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      <section className="ep-section">
        <div className="ep-section-header">
          <h2>Smart recommendations</h2>

          <button
            type="button"
            className="ep-link-button"
            onClick={() => onLog("All smart recommendations requested", "info")}
          >
            Ver tudo
            <ChevronRight />
          </button>
        </div>

        <div
          ref={carouselRef}
          className="ep-smart-carousel"
          onScroll={handleCarouselScroll}
        >
          {personalizedSmartRecommendations.map((recommendation) => (
            <article
              key={recommendation.id}
              className="ep-smart-card"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(7, 23, 33, 0.08) 0%, rgba(8, 121, 135, 0.86) 100%), url(${recommendation.image})`,
              }}
              onClick={() => openSmartRecommendation(recommendation)}
            >
              <span className="ep-smart-badge">
                <Sparkles />
                {recommendation.badge}
              </span>

              <div className="ep-smart-copy">
                <h3>{recommendation.title}</h3>
                <p>{recommendation.description}</p>

                <button
                  type="button"
                  className="ep-smart-action"
                  onClick={(event) => {
                    event.stopPropagation();
                    openSmartRecommendation(recommendation);
                  }}
                >
                  <Compass />
                  {recommendation.actionLabel}
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="ep-carousel-dots" aria-hidden="true">
          {personalizedSmartRecommendations.map((recommendation, index) => (
            <button
              key={recommendation.id}
              type="button"
              className={index === activeRecommendation ? "ep-dot-active" : ""}
              onClick={() => {
                const card = carouselRef.current?.children[index] as
                  | HTMLElement
                  | undefined;

                card?.scrollIntoView({
                  behavior: "smooth",
                  inline: "center",
                  block: "nearest",
                });
              }}
              aria-label={`Ver recomendação ${index + 1}`}
            />
          ))}
        </div>
      </section>

      <section className="ep-section ep-nearby-section">
        <div className="ep-section-header">
          <h2>Perto de si</h2>

          <button
            type="button"
            className="ep-link-button"
            onClick={() => fetchNearbyPlaces({ refresh: true })}
            disabled={isLoadingNearbyPlaces || !currentLocation}
          >
            {isLoadingNearbyPlaces ? "A procurar" : "Ver todos"}
            <ChevronRight />
          </button>
        </div>

        {(isLoadingNearbyPlaces || nearbyPlacesError) && (
          <div className="ep-nearby-status">
            {isLoadingNearbyPlaces
              ? "A atualizar com a tua localização e preferências..."
              : nearbyPlacesError}
          </div>
        )}

        <div className="ep-nearby-list">
          {filteredNearbyPlaces.map((place) => {
            const Icon = getNearbyIcon(place.icon);
            const isLiked = likedRecommendations.includes(place.id);
            const reason = buildReason(place.interests, preferences, locationCity);

            return (
              <article
                key={place.id}
                className="ep-nearby-card"
              >
                <button
                  type="button"
                  className="ep-nearby-open"
                  onClick={() => openNearbyPlace(place)}
                >
                  <img src={place.image} alt="" className="ep-nearby-image" />

                  <span className="ep-nearby-copy">
                    <strong>{place.name}</strong>

                    <span className="ep-nearby-meta">
                      <Icon />
                      {place.category}
                      <span aria-hidden="true">•</span>
                      {place.distance}
                    </span>

                    <span className="ep-nearby-reason">{reason}</span>
                  </span>

                  <span className="ep-nearby-rating">
                    <Star />
                    {place.rating.toFixed(1)}
                  </span>

                  <ChevronRight className="ep-nearby-chevron" />
                </button>

                <div className="ep-nearby-actions" aria-label={`Feedback para ${place.name}`}>
                  <button
                    type="button"
                    className={`ep-feedback-button ${
                      isLiked ? "ep-feedback-button-liked" : ""
                    }`}
                    aria-label={`Gostei de ${place.name}`}
                    onClick={() => likeNearbyPlace(place)}
                  >
                    <ThumbsUp />
                  </button>

                  <button
                    type="button"
                    className="ep-feedback-button ep-feedback-button-dismiss"
                    aria-label={`Ignorar ${place.name}`}
                    onClick={() => dismissNearbyPlace(place)}
                  >
                    <ThumbsDown />
                  </button>
                </div>
              </article>
            );
          })}

          {filteredNearbyPlaces.length === 0 && (
            <div className="ep-nearby-empty">
              <strong>Sem sugestões neste filtro</strong>
              <span>Experimenta outro filtro ou limpa a pesquisa.</span>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
