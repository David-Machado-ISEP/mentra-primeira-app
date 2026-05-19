import { useEffect, useMemo, useState } from "react";
import {
  MapPin,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Badge, Button } from "../../../components/ui";
import type { TravelPreferences } from "./IntroPreferences";

import "../estilo/NearbyRecommendationsPanel.css";

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
interface NearbyRecommendationsPanelProps {
  preferences: TravelPreferences;
  userId: string;
  currentLocation: any;
  onLog: (
    message: string,
    type?: "info" | "success" | "warning" | "error",
  ) => void;
}

const mockRecommendations: Recommendation[] = [
  {
    id: "castelo-sao-jorge",
    name: "Castelo de São Jorge",
    category: "Monumento",
    description:
      "Um dos locais históricos mais conhecidos de Lisboa, com vista panorâmica sobre a cidade.",
    estimatedTime: "1h 30min",
    budget: "medium",
    interests: ["monuments"],
  },
  {
    id: "time-out-market",
    name: "Time Out Market",
    category: "Comida local",
    description:
      "Mercado gastronómico com várias opções de comida portuguesa e internacional.",
    estimatedTime: "1h",
    budget: "medium",
    interests: ["local_food"],
  },
  {
    id: "miradouro-senhora-monte",
    name: "Miradouro da Senhora do Monte",
    category: "Miradouro",
    description:
      "Um dos melhores miradouros para ver Lisboa, ideal para uma pausa durante o passeio.",
    estimatedTime: "30min",
    budget: "low",
    interests: ["nature"],
  },
  {
    id: "lx-factory",
    name: "LX Factory",
    category: "Hidden gem",
    description:
      "Zona criativa com lojas, arte urbana, restaurantes e espaços culturais.",
    estimatedTime: "1h 30min",
    budget: "medium",
    interests: ["hidden_gems", "shopping", "local_food"],
  },
  {
    id: "bairro-alto",
    name: "Bairro Alto",
    category: "Vida noturna",
    description:
      "Área conhecida pelos bares, ambiente noturno e ruas movimentadas.",
    estimatedTime: "2h",
    budget: "medium",
    interests: ["nightlife"],
  },
  {
    id: "avenida-liberdade",
    name: "Avenida da Liberdade",
    category: "Compras",
    description: "Avenida elegante com lojas, cafés e arquitetura histórica.",
    estimatedTime: "1h",
    budget: "high",
    interests: ["shopping"],
  },
];

const interestLabels: Record<string, string> = {
  monuments: "monumentos",
  local_food: "comida local",
  nature: "natureza",
  hidden_gems: "locais menos turísticos",
  nightlife: "vida noturna",
  shopping: "compras",
};

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

  const [isCollapsed, setIsCollapsed] = useState(false);

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

  const recommendations = useMemo<ScoredRecommendation[]>(() => {
    const likedPlaces = mockRecommendations.filter((place) =>
      likedIds.includes(place.id),
    );

    const likedInterests = likedPlaces.flatMap((place) => place.interests);

    return mockRecommendations
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
      .filter((place) => place.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [preferences, dismissedIds, likedIds, learnedInterestScores]);

  const displayedRecommendations =
    aiRecommendations.length > 0 ? aiRecommendations : recommendations;

  const getCurrentLocationLabel = () => {
  if (!currentLocation) return "Porto";

  if (currentLocation.displayName) return currentLocation.displayName;

  if (currentLocation.address) return currentLocation.address;

  if (currentLocation.placeName) return currentLocation.placeName;

  if (currentLocation.city) return currentLocation.city;

  if (currentLocation.lat && currentLocation.lng) {
    return `${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}`;
  }

  return "Porto";
};
  
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
            mode: "nearby",
            city: getCurrentLocationLabel(),
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
              {isCollapsed ? "+" : "−"}
            </button>
          </div>

          <p className="tw-card-description">
            Locais próximos sugeridos com base na tua localização atual.
          </p>
        </div>

        <div className="tw-recommendations-header-actions">
        <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={speakRecommendations}
        disabled={displayedRecommendations.length === 0 || isSpeakingRecommendations}
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
            {isLoadingAiRecommendations ? "A Procurar..." : "Procurar por Perto"}
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
            <article key={place.id} className="tw-recommendation-item">
              <div className="tw-recommendation-main">
                <div className="tw-recommendation-title-row">
                  <h3 className="tw-recommendation-name">{place.name}</h3>

                  {likedIds.includes(place.id) && (
                    <Badge variant="outline">Gostaste</Badge>
                  )}
                </div>

                <div className="tw-recommendation-meta">
                  <span>
                    <MapPin className="tw-recommendation-meta-icon" />
                    {place.category}
                  </span>

                  <span>{place.estimatedTime}</span>

                  <span>Budget: {place.budget}</span>
                </div>

                <p className="tw-recommendation-description">
                  {place.description}
                </p>
                <p className="tw-recommendation-reason">
                  {place.reason ? (
                    <>
                      Recomendado porque <strong>{place.reason}</strong>
                    </>
                  ) : (
                    <>
                      Recomendado porque{" "}
                      {(place.matchedInterests ?? []).length > 0 && (
                        <>
                          combina com{" "}
                          <strong>
                            {(place.matchedInterests ?? [])
                              .map(
                                (interest) =>
                                  interestLabels[interest] || interest,
                              )
                              .join(", ")}
                          </strong>
                        </>
                      )}
                      {(place.matchedInterests ?? []).length > 0 &&
                        place.budget === preferences.budget && <> e </>}
                      {place.budget === preferences.budget && (
                        <>
                          corresponde ao orçamento{" "}
                          <strong>{preferences.budget}</strong>
                        </>
                      )}
                      {(place.behaviorScore ?? 0) > 0 && (
                        <> e é parecido com locais de que gostaste</>
                      )}
                      .
                    </>
                  )}
                </p>
              </div>

              <div className="tw-recommendation-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleLike(place)}
                >
                  <ThumbsUp className="tw-recommendation-action-icon" />
                  Gosto
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDismiss(place)}
                >
                  <ThumbsDown className="tw-recommendation-action-icon" />
                  Ignorar
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
