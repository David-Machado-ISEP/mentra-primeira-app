import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapPin,
  ThumbsDown,
  ThumbsUp,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Badge, Button } from "../../../components/ui";
import type { TravelPreferences } from "./IntroPreferences";


interface Recommendation {
  id: string;
  name: string;
  category: string;
  description: string;
  estimatedTime: string;
  budget: "low" | "medium" | "high";
  interests: string[];
  matchedInterests?: string[];
  behaviorScore?: number;
  exploration?: boolean;
  reason?: string;
}

interface CurrentLocation {
  lat?: number;
  lng?: number;
  accuracy?: number;
  placeName?: string;
  displayName?: string;
  address?: string;
  city?: string;
}

interface NearbyRecommendationsPanelProps {
  preferences: TravelPreferences;
  userId: string;
  currentLocation: CurrentLocation | null;
  onLog: (
    message: string,
    type?: "info" | "success" | "warning" | "error",
  ) => void;
}

const interestLabels: Record<string, string> = {
  monuments: "História",
  local_food: "Gastronomia",
  nature: "Natureza",
  architecture: "Arquitetura",
  nightlife: "Vida Noturna",
  local_culture: "Cultura Local",
  shopping: "Compras",
  photography: "Fotografia",
  adventure: "Aventura",
  beaches: "Praias",
  hidden_gems: "Tesouros escondidos",
};

const defaultNearbyRecommendations: Recommendation[] = [
{
    id: "rio-tinto-quinta-freixo",
    name: "Quinta das Freiras, Rio Tinto",
    category: "Património local",
    description:
      "Zona associada à história local de Rio Tinto, útil para uma visita calma e próxima.",
    estimatedTime: "30-45 min",
    budget: "low",
    interests: ["monuments", "hidden_gems"],
    reason: "É uma opção local para descobrir património fora dos circuitos turísticos principais.",
  },
  {
    id: "santo-tirso-mosteiro-sao-bento",
    name: "Mosteiro de São Bento, Santo Tirso",
    category: "Monumento",
    description:
      "Um dos pontos históricos mais importantes de Santo Tirso, ligado à identidade da cidade.",
    estimatedTime: "45-60 min",
    budget: "low",
    interests: ["monuments", "hidden_gems"],
    reason: "É uma atração histórica relevante para visitar em Santo Tirso.",
  },
];

export function NearbyRecommendationsPanel({
  preferences,
  userId,
  currentLocation,
  onLog,
}: NearbyRecommendationsPanelProps) {
  const [likedIds, setLikedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(
        "travel-whisperer-liked-recommendations",
      );
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(
        "travel-whisperer-dismissed-recommendations",
      );
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [aiRecommendations, setAiRecommendations] = useState<Recommendation[]>(
    [],
  );
  const [isLoadingAiRecommendations, setIsLoadingAiRecommendations] =
    useState(false);
  const [aiRecommendationsError, setAiRecommendationsError] = useState<
    string | null
  >(null);
const [isCollapsed, setIsCollapsed] = useState(true);
  const [isSpeakingRecommendations, setIsSpeakingRecommendations] =
    useState(false);
  const [learnedInterestScores, setLearnedInterestScores] = useState<
    Record<string, number>
  >(() => {
    try {
      const saved = localStorage.getItem(
        "travel-whisperer-learned-interest-scores",
      );
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const latestRequestIdRef = useRef(0);
  const fetchedLocationKeyRef = useRef<string | null>(null);

  useEffect(() => {
    localStorage.setItem(
      "travel-whisperer-liked-recommendations",
      JSON.stringify(likedIds),
    );
  }, [likedIds]);

  useEffect(() => {
    localStorage.setItem(
      "travel-whisperer-dismissed-recommendations",
      JSON.stringify(dismissedIds),
    );
  }, [dismissedIds]);

  useEffect(() => {
    localStorage.setItem(
      "travel-whisperer-learned-interest-scores",
      JSON.stringify(learnedInterestScores),
    );
  }, [learnedInterestScores]);

  const locationLabel = useMemo(() => {
    if (!currentLocation) return "";
    if (currentLocation.displayName) return currentLocation.displayName;
    if (currentLocation.address) return currentLocation.address;
    if (currentLocation.placeName) return currentLocation.placeName;
    if (currentLocation.city) return currentLocation.city;

    if (
      typeof currentLocation.lat === "number" &&
      typeof currentLocation.lng === "number"
    ) {
      return `${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(
        5,
      )}`;
    }

    return "";
  }, [currentLocation]);

  const locationKey = useMemo(() => {
    if (!currentLocation) return null;

    if (
      typeof currentLocation.lat === "number" &&
      typeof currentLocation.lng === "number"
    ) {
      return `${currentLocation.lat.toFixed(4)},${currentLocation.lng.toFixed(
        4,
      )}`;
    }

    return locationLabel || null;
  }, [currentLocation, locationLabel]);

  const preferencesKey = useMemo(
    () => JSON.stringify(preferences),
    [preferences],
  );

  const autoFetchKey = useMemo(() => {
    if (!locationKey) return null;

    return `${locationKey}|${preferencesKey}`;
  }, [locationKey, preferencesKey]);

  const displayedRecommendations = useMemo(() => {
  const sourceRecommendations =
    aiRecommendations.length > 0
      ? aiRecommendations
      : defaultNearbyRecommendations;

  return sourceRecommendations.filter(
    (place) => !dismissedIds.includes(place.id),
  );
}, [aiRecommendations, dismissedIds]);
  const fetchAiRecommendations = useCallback(
    async ({ refresh = false }: { refresh?: boolean } = {}) => {
      if (!currentLocation || !locationLabel) {
        setAiRecommendationsError(
          "Ainda estou à espera da localização para sugerir locais por perto.",
        );
        return;
      }

      const requestId = ++latestRequestIdRef.current;
      const currentSuggestionNames = refresh
        ? aiRecommendations.flatMap((place) => [place.id, place.name])
        : [];

      try {
        setIsLoadingAiRecommendations(true);
        setAiRecommendationsError(null);

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
            likedPlaces: likedIds,
            dismissedPlaces: [...dismissedIds, ...currentSuggestionNames],
            refreshSeed: refresh ? Date.now() : undefined,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch AI recommendations");
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "AI recommendations failed");
        }

        if (requestId !== latestRequestIdRef.current) return;

        setAiRecommendations(data.recommendations || []);
        onLog(
          refresh
            ? "Nearby AI recommendations refreshed"
            : "Nearby AI recommendations updated",
          "success",
        );
      } catch (error) {
        console.error(
          "[Nearby Recommendations] Failed to fetch AI recommendations",
          error,
        );

        if (requestId !== latestRequestIdRef.current) return;

        setAiRecommendationsError(
          "Não foi possível gerar recomendações por perto com IA neste momento.",
        );
        onLog("Failed to update nearby AI recommendations", "error");
      } finally {
        if (requestId === latestRequestIdRef.current) {
          setIsLoadingAiRecommendations(false);
        }
      }
    },
    [
      aiRecommendations,
      currentLocation,
      dismissedIds,
      learnedInterestScores,
      likedIds,
      locationLabel,
      onLog,
      preferences,
    ],
  );

  //Desligado durante a fase de testes já que temos um limite baixo de requests á API do gemini
  /*useEffect(() => {
    if (!autoFetchKey) return;
    if (fetchedLocationKeyRef.current === autoFetchKey) return;

    fetchedLocationKeyRef.current = autoFetchKey;
    void fetchAiRecommendations();
  }, [autoFetchKey, fetchAiRecommendations]);*/

  const speakRecommendations = async () => {
    if (isSpeakingRecommendations) {
      onLog("Audio already playing recommendations", "warning");
      return;
    }

    try {
      setIsSpeakingRecommendations(true);

      if (displayedRecommendations.length === 0) {
        onLog("No recommendations to speak", "warning");
        return;
      }

      const topRecommendations = displayedRecommendations.slice(0, 4);
      const recommendationCount = topRecommendations.length;
      const intro =
        recommendationCount === 1
          ? "Tenho uma sugestão perto de ti."
          : `Tenho ${recommendationCount} sugestões perto de ti.`;

      const textToSpeak = [
        intro,
        ...topRecommendations.map((place, index) => {
          return `${index + 1}. ${place.name}.`;
        }),
        "Podes abrir a aplicação para veres mais detalhes.",
      ].join(" ");

      const response = await fetch("/api/speak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: textToSpeak,
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to speak recommendations");
      }

      onLog("Nearby recommendations spoken by audio", "success");
    } catch (error) {
      console.error("[Recommendations] Failed to speak recommendations", error);
      onLog(`Failed to speak recommendations: ${error}`, "error");
    } finally {
      setIsSpeakingRecommendations(false);
    }
  };

  const handleLike = (place: Recommendation) => {
    setLikedIds((prev) =>
      prev.includes(place.id) ? prev : [...prev, place.id],
    );

    setLearnedInterestScores((prev) => {
      const next = { ...prev };

      place.interests.forEach((interest) => {
        next[interest] = (next[interest] || 0) + 1;
      });

      return next;
    });

    onLog(`Recommendation liked: ${place.name}`, "success");
  };

  const handleDismiss = (place: Recommendation) => {
    setDismissedIds((prev) =>
      prev.includes(place.id) ? prev : [...prev, place.id],
    );

    onLog(`Recommendation dismissed: ${place.name}`, "info");
  };

  return (
    <section className="tw-recommendations-card">
      <div className="tw-recommendations-header">
        <div>
          <div className="tw-recommendations-title-row">
            <Sparkles className="tw-recommendations-icon" />
            <h2 className="tw-card-title">Nearby Attractions</h2>

            <button
              type="button"
              className="tw-recommendations-collapse-button"
              onClick={() => setIsCollapsed((prev) => !prev)}
              aria-label={
                isCollapsed
                  ? "Mostrar recomendações"
                  : "Minimizar recomendações"
              }
              title={
                isCollapsed
                  ? "Mostrar recomendações"
                  : "Minimizar recomendações"
              }
            >
              {isCollapsed ? "+" : "-"}
            </button>
          </div>

          <p className="tw-card-description">
            {locationLabel
              ? `Locais próximos de ${locationLabel}.`
              : "A aguardar localização para gerar sugestões por perto."}
          </p>
        </div>

        <div className="tw-recommendations-header-actions">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={speakRecommendations}
            disabled={
              displayedRecommendations.length === 0 ||
              isSpeakingRecommendations
            }
            aria-label="Ouvir sugestões"
            title="Ouvir sugestões"
          >
            <Volume2 className="tw-recommendations-audio-icon" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchAiRecommendations({ refresh: true })}
            disabled={isLoadingAiRecommendations || !currentLocation}
          >
            {isLoadingAiRecommendations ? "A procurar..." : "Procurar por perto"}
          </Button>

          <Badge variant="outline">
            {displayedRecommendations.length} sugestões
          </Badge>
        </div>
      </div>

      {isCollapsed ? null : displayedRecommendations.length === 0 ? (
        <div className="tw-recommendations-empty">
          {isLoadingAiRecommendations
            ? "A gerar sugestões por perto com IA..."
            : aiRecommendationsError ??
              "Assim que a localização estiver disponível, as sugestões aparecem aqui."}
        </div>
      ) : (
        <div className="tw-recommendations-list">
          {displayedRecommendations.map((place) => (
            <article key={place.id} className="tw-recommendation-mini-card">
  <div className="tw-recommendation-mini-image">
    <MapPin className="tw-recommendation-mini-image-icon" />
  </div>

  <div className="tw-recommendation-mini-content">
    <h3 className="tw-recommendation-mini-name">{place.name}</h3>

    <p className="tw-recommendation-mini-category">
      {place.category}
    </p>

    <div className="tw-recommendation-mini-meta">
      <span>📍 {place.estimatedTime}</span>
      <span>⭐ 4.8</span>
    </div>
  </div>

  <div className="tw-recommendation-mini-actions">
    <button
      type="button"
      className={`tw-mini-feedback-button ${
        likedIds.includes(place.id) ? "is-liked" : ""
      }`}
      onClick={() => handleLike(place)}
      title="Gostei"
      aria-label={`Gostei de ${place.name}`}
    >
      <ThumbsUp />
    </button>

    <button
      type="button"
      className={`tw-mini-feedback-button ${
        dismissedIds.includes(place.id) ? "is-disliked" : ""
      }`}
      onClick={() => handleDismiss(place)}
      title="Não gostei"
      aria-label={`Não gostei de ${place.name}`}
    >
      <ThumbsDown />
    </button>
  </div>
</article>
          ))}
        </div>
      )}
    </section>
  );
}
