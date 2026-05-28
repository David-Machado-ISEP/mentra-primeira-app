import { useEffect, useMemo, useState } from "react";
import { MapPin, ThumbsUp, ThumbsDown, Sparkles, Volume2 } from "lucide-react";
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
interface ScoredRecommendation extends Recommendation {
  score: number;
  matchedInterests: string[];
  behaviorScore: number;
}
interface RecommendationsPanelProps {
  preferences: TravelPreferences;
  userId: string;
  onLog: (
    message: string,
    type?: "info" | "success" | "warning" | "error",
  ) => void;
  onAddToItinerary?: (recommendation: Recommendation) => void;
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

const defaultPortoRecommendations: Recommendation[] = [
  {
    id: "porto-torre-clerigos",
    name: "Torre dos Clérigos",
    category: "Monumento",
    description:
      "Um dos símbolos mais conhecidos do Porto, com uma vista panorâmica sobre a cidade.",
    estimatedTime: "30-45 min",
    budget: "low",
    interests: ["monuments", "hidden_gems"],
  },
  {
    id: "porto-mercado-bolhao",
    name: "Mercado do Bolhão",
    category: "Comida local",
    description:
      "Mercado histórico com produtos tradicionais, sabores locais e ambiente típico portuense.",
    estimatedTime: "45-60 min",
    budget: "medium",
    interests: ["local_food", "hidden_gems"],
  },
  {
    id: "porto-jardins-palacio-cristal",
    name: "Jardins do Palácio de Cristal",
    category: "Natureza",
    description:
      "Jardins tranquilos com miradouros sobre o Douro, ideais para uma pausa relaxada.",
    estimatedTime: "45-60 min",
    budget: "low",
    interests: ["nature", "hidden_gems"],
  },
  {
    id: "porto-rua-flores",
    name: "Rua das Flores",
    category: "Passeio",
    description:
      "Rua histórica no centro do Porto com comércio, cafés e edifícios tradicionais.",
    estimatedTime: "30-45 min",
    budget: "low",
    interests: ["shopping", "hidden_gems"],
  },
];

export function RecommendationsPanel({
  preferences,
  userId,
  onLog,
  onAddToItinerary,
}: RecommendationsPanelProps) {

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

  const recommendations = useMemo<ScoredRecommendation[]>(() => {
    return defaultPortoRecommendations
      .filter((place) => !dismissedIds.includes(place.id))
      .map((place) => {
        const interestScore = place.interests.filter((interest) =>
          preferences.interests.includes(interest),
        ).length;

        const budgetScore = place.budget === preferences.budget ? 1 : 0;

        const behaviorScore = place.interests.reduce((total, interest) => {
          return total + (learnedInterestScores[interest] || 0);
        }, 0);

        return {
          ...place,
          score: interestScore * 2 + budgetScore + behaviorScore * 2,
          matchedInterests: place.interests.filter((interest) =>
            preferences.interests.includes(interest),
          ),
          behaviorScore,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [preferences, dismissedIds, learnedInterestScores]);

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

  const displayedRecommendations =
    aiRecommendations.length > 0 ? aiRecommendations : recommendations;

  const preferencesKey = useMemo(
    () => JSON.stringify(preferences),
    [preferences],
  );

  // Desligado durante testes para evitar gastar o Gemini
  // AI recommendations so sao geradas quando carrego no botao
  /*useEffect(() => {
    if (!preferences) return;

    void fetchAiRecommendations();
  }, [preferencesKey]);*/

  const fetchAiRecommendations = async () => {
    try {
      setIsLoadingAiRecommendations(true);
      setAiRecommendationsError(null);

      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          city: "Porto",
          preferences,
          learnedInterestScores,
          likedPlaces: likedIds,
          dismissedPlaces: dismissedIds,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch AI recommendations");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "AI recommendations failed");
      }

      setAiRecommendations(data.recommendations || []);

      onLog("AI recommendations updated", "success");
    } catch (error) {
      console.error(
        "[Recommendations] Failed to fetch AI recommendations",
        error,
      );

      setAiRecommendationsError(
        "Não foi possível gerar recomendações com IA neste momento.",
      );

      onLog("Failed to update AI recommendations", "error");
    } finally {
      setIsLoadingAiRecommendations(false);
    }
  };
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
          ? "Tenho uma sugestão para visitar."
          : `Tenho ${recommendationCount} sugestões para visitar.`;

      const textToSpeak = [
        intro,
        ...topRecommendations.map((place, index) => {
          return `${index + 1}. ${place.name}.`;
        }),
        "Podes abrir a aplicação para veres mais detalhes.",
      ].join(" ");

      console.log("[Recommendations] Speaking text:", textToSpeak);

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

      onLog("Recommendations spoken by audio", "success");
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

    onAddToItinerary?.(place);

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
            <h2 className="tw-card-title">Smart Recommendations</h2>

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
              {isCollapsed ? "+" : "−"}
            </button>
          </div>

          <p className="tw-card-description">
            Sugestões baseadas nas preferências atuais da viagem.
          </p>
        </div>

        <div className="tw-recommendations-header-actions">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={speakRecommendations}
            disabled={
              displayedRecommendations.length === 0 || isSpeakingRecommendations
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
            onClick={fetchAiRecommendations}
            disabled={isLoadingAiRecommendations}
          >
            {isLoadingAiRecommendations ? "A gerar..." : "Gerar com IA"}
          </Button>

          <Badge variant="outline">
            {displayedRecommendations.length} sugestões
          </Badge>
        </div>
      </div>

      {isCollapsed ? null : displayedRecommendations.length === 0 ? (
        <div className="tw-recommendations-empty">
          Ainda não há recomendações para estas preferências.
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
    <p className="tw-recommendation-mini-category">{place.category}</p>

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
