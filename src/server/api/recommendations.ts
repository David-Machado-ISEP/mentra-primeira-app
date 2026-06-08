import type { Context } from "hono";
import { generateRecommendationsWithGemini } from "./gemini";
import { enrichRecommendationsWithPlaceImages } from "./places";

export async function getAiRecommendations(c: Context) {
  try {
    const body = await c.req.json();

    const mode = body.mode || "personalized";
    const city = body.city || "localização atual do utilizador";
    const preferences = body.preferences;
    const learnedInterestScores = body.learnedInterestScores || {};
    const likedPlaces = body.likedPlaces || [];
    const dismissedPlaces = body.dismissedPlaces || [];
    const location = body.location || null;
    const userProfile = body.userProfile || {};
    const selectedCategory = body.selectedCategory || null;
    const alreadyShownRecommendations = body.alreadyShownRecommendations || [];
    const currentTripId = body.currentTripId || null;
    const visitedPlaces = body.visitedPlaces || [];
    const refreshSeed = body.refreshSeed;

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

    const recommendationInput = {
      mode,
      city,
      preferences,
      learnedInterestScores,
      likedPlaces,
      dismissedPlaces,
      location,
      userProfile,
      selectedCategory,
      alreadyShownRecommendations,
      currentTripId,
      visitedPlaces,
      refreshSeed,
    };
    const recommendations =
      await generateRecommendationsWithGemini(recommendationInput);
    const recommendationsWithImages =
      await enrichRecommendationsWithPlaceImages(
        recommendations,
        recommendationInput,
      );

    return c.json({
      success: true,
      recommendations: recommendationsWithImages,
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
