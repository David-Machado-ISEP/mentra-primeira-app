import type { Context } from "hono";
import { generateRecommendationsWithGemini } from "./gemini";

export async function getAiRecommendations(c: Context) {
  try {
    const body = await c.req.json();

    const mode = body.mode || "personalized";
    const city = body.city || "localização atual do utilizador";
    const preferences = body.preferences;
    const learnedInterestScores = body.learnedInterestScores || {};
    const likedPlaces = body.likedPlaces || [];
    const dismissedPlaces = body.dismissedPlaces || [];

    if (!preferences) {
      return c.json(
        {
          success: false,
          error: "Preferences are required.",
          recommendations: [],
        },
        400,
      );
    }

    console.log(`[Recommendations] Generating AI recommendations for ${city}`);

    const recommendations = await generateRecommendationsWithGemini({
    mode,
    city,
    preferences,
    learnedInterestScores,
    likedPlaces,
    dismissedPlaces,
  });

    return c.json({
      success: true,
      recommendations,
    });
  } catch (error) {
    console.error("[Recommendations] Failed:", error);

    return c.json(
      {
        success: false,
        error: "Failed to generate recommendations.",
        recommendations: [],
      },
      500,
    );
  }
}