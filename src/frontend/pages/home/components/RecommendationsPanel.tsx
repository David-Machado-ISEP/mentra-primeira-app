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

import "../estilo/RecommendationsPanel.css";

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
}



const interestLabels: Record<string, string> = {
  monuments: "monumentos",
  local_food: "comida local",
  nature: "natureza",
  hidden_gems: "locais menos turísticos",
  nightlife: "vida noturna",
  shopping: "compras",
};

export function RecommendationsPanel({
  preferences,
  userId,
  onLog,
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

  const displayedRecommendations = aiRecommendations;
  const preferencesKey = useMemo(
    () => JSON.stringify(preferences),
    [preferences],
  );

  useEffect(() => {
    if (!preferences) return;

    void fetchAiRecommendations();
  }, [preferencesKey]);

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
