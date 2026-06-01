/**
 * API Route Definitions
 */

import { Hono } from "hono";
import { getHealth } from "../api/health";
import {
  companionStream,
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
import { getPlacePhoto } from "../api/places";

import { generateAlbumMemory } from "../api/albumMemory";

import { sessions } from "../manager/SessionManager";

export const api = new Hono();

// Health
api.get("/health", getHealth);

// SSE streams
api.get("/photo-stream", photoStream);
api.get("/transcription-stream", transcriptionStream);
api.get("/visited-places-stream", visitedPlacesStream);
api.get("/location-stream", locationStream);
api.get("/visual-discoveries-stream", visualDiscoveriesStream);
api.get("/companion-stream", companionStream);

// temporario rota só para testar o Companion sem óculos.
// Remover antes da versão final
api.post("/companion-test", async (c) => {
  const body = await c.req.json().catch(() => null);

  const userId = body?.userId;

  if (!userId) {
    return c.json({ error: "userId is required" }, 400);
  }

  const user = sessions.getOrCreate(userId);

  const interaction = user.companion.addInteraction({
    type: "ai",
    title: body?.title || "Teste do Companion",
    content:
      body?.content ||
      "Este evento foi criado manualmente para testar o Companion sem os óculos.",
    source: "manual_test",
  });

  return c.json({
    success: true,
    interaction,
  });
});

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
api.get("/place-photo", getPlacePhoto);

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
