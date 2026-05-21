/**
 * API Route Definitions
 */

import { Hono } from "hono";
import { getHealth } from "../api/health";
import {
  locationStream,
  photoStream,
  transcriptionStream,
  visitedPlacesStream,
  visualDiscoveriesStream,
} from "../api/stream";
import { speak, stopAudio } from "../api/audio";
import { getThemePreference, setThemePreference } from "../api/storage";
import { getLatestPhoto, getPhotoData, getPhotoBase64 } from "../api/photo";
import { translate } from "../api/translate";

import { askGeminiText } from "../api/gemini";

import { getAiRecommendations } from "../api/recommendations";

import { generateAlbumMemory } from "../api/albumMemory";

export const api = new Hono();

// Health
api.get("/health", getHealth);

// SSE streams
api.get("/photo-stream", photoStream);
api.get("/transcription-stream", transcriptionStream);
api.get("/visited-places-stream", visitedPlacesStream);
api.get("/location-stream", locationStream);
api.get("/visual-discoveries-stream", visualDiscoveriesStream);

// Audio
api.post("/speak", speak);
api.post("/stop-audio", stopAudio);

// Storage
api.get("/theme-preference", getThemePreference);
api.post("/theme-preference", setThemePreference);

// Photos
api.get("/latest-photo", getLatestPhoto);
api.get("/photo/:requestId", getPhotoData);
api.get("/photo-base64/:requestId", getPhotoBase64);

// Translation
api.post("/translate", translate);

// AI Recommendations
api.post("/recommendations", getAiRecommendations);

// Album memory
api.post("/album-memory", generateAlbumMemory);


// Gemini test
api.post("/gemini-test", async (c) => {
  try {
    const body = await c.req.json();
    const prompt = body.prompt || "Diz olá em português de Portugal.";

    const answer = await askGeminiText(prompt);

    return c.json({
      answer,
    });
  } catch (error) {
    console.error("Gemini test error:", error);

    return c.json(
      {
        error: "Erro ao testar o Gemini.",
      },
      500,
    );
  }
});