/**
 * API Routes (Hono)
 *
 * All API endpoints for the camera application, converted from Express to Hono.
 *
 * Routes:
 * - GET  /photo-stream          - SSE for real-time photo updates
 * - GET  /transcription-stream  - SSE for real-time transcriptions
 * - POST /play-audio            - Play audio to MentraOS glasses
 * - POST /speak                 - Text-to-speech to MentraOS glasses
 * - POST /stop-audio            - Stop audio playback
 * - GET  /theme-preference      - Get user's theme preference
 * - POST /theme-preference      - Set user's theme preference
 * - GET  /latest-photo          - Get metadata for latest photo
 * - GET  /photo/:requestId      - Get photo image data
 * - GET  /photo-base64/:requestId - Get photo as base64 JSON
 * - GET  /health                - Health check
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import {
  getThemePreference,
  setThemePreference,
} from "../modules/simple-storage";

// Store active sessions for audio playback
const activeSessions: Map<string, any> = new Map();

// Store SSE writers for broadcasting
interface SSEWriter {
  write: (data: string) => void;
  userId: string;
  close: () => void;
}

const photoSSEClients: Set<SSEWriter> = new Set();
const transcriptionSSEClients: Set<SSEWriter> = new Set();

// The photos map is passed from the CameraApp
let photosMapRef: Map<string, StoredPhoto> | null = null;

interface StoredPhoto {
  requestId: string;
  buffer: Buffer;
  timestamp: Date;
  userId: string;
  mimeType: string;
  filename: string;
  size: number;
}

/** Set the photos map reference (called from index.ts) */
export function setPhotosMap(map: Map<string, StoredPhoto>): void {
  photosMapRef = map;
}

/** Register an active session for audio playback */
export function registerSession(userId: string, session: any): void {
  activeSessions.set(userId, session);
}

/** Unregister a session */
export function unregisterSession(userId: string): void {
  activeSessions.delete(userId);
}

/** Broadcast photo to specific user's SSE clients */
export function broadcastPhotoToClients(photo: StoredPhoto): void {
  const base64Data = photo.buffer.toString("base64");
  const photoData = JSON.stringify({
    requestId: photo.requestId,
    timestamp: photo.timestamp.getTime(),
    mimeType: photo.mimeType,
    filename: photo.filename,
    size: photo.size,
    userId: photo.userId,
    base64: base64Data,
    dataUrl: `data:${photo.mimeType};base64,${base64Data}`,
  });

  for (const client of photoSSEClients) {
    if (client.userId === photo.userId) {
      try {
        client.write(photoData);
      } catch {
        photoSSEClients.delete(client);
      }
    }
  }
}

/** Broadcast transcription to specific user's SSE clients */
export function broadcastTranscriptionToClients(
  text: string,
  isFinal: boolean,
  userId: string,
): void {
  const data = JSON.stringify({
    text,
    isFinal,
    timestamp: Date.now(),
    userId,
  });

  for (const client of transcriptionSSEClients) {
    if (client.userId === userId) {
      try {
        client.write(data);
      } catch {
        transcriptionSSEClients.delete(client);
      }
    }
  }
}

// Create the Hono router
export const api = new Hono();

// Health check
api.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// SSE: Real-time photo stream
api.get("/photo-stream", (c) => {
  const userId = c.req.query("userId");
  if (!userId) {
    return c.json({ error: "userId is required" }, 400);
  }

  console.log(`[SSE Photo] Client connected for user: ${userId}`);

  return streamSSE(c, async (stream) => {
    const client: SSEWriter = {
      write: (data: string) => {
        stream.writeSSE({ data });
      },
      userId,
      close: () => stream.close(),
    };

    photoSSEClients.add(client);

    // Send initial connection message
    await stream.writeSSE({
      data: JSON.stringify({ type: "connected", userId }),
    });

    // Send existing photos for this user
    if (photosMapRef) {
      for (const photo of photosMapRef.values()) {
        if (photo.userId === userId) {
          const base64Data = photo.buffer.toString("base64");
          await stream.writeSSE({
            data: JSON.stringify({
              requestId: photo.requestId,
              timestamp: photo.timestamp.getTime(),
              mimeType: photo.mimeType,
              filename: photo.filename,
              size: photo.size,
              userId: photo.userId,
              base64: base64Data,
              dataUrl: `data:${photo.mimeType};base64,${base64Data}`,
            }),
          });
        }
      }
    }

    // Keep connection open until client disconnects
    stream.onAbort(() => {
      console.log(`[SSE Photo] Client disconnected for user: ${userId}`);
      photoSSEClients.delete(client);
    });

    // Keep the stream alive
    while (true) {
      await stream.sleep(30000);
    }
  });
});

// SSE: Real-time transcription stream
api.get("/transcription-stream", (c) => {
  const userId = c.req.query("userId");
  if (!userId) {
    return c.json({ error: "userId is required" }, 400);
  }

  console.log(`[SSE Transcription] Client connected for user: ${userId}`);

  return streamSSE(c, async (stream) => {
    const client: SSEWriter = {
      write: (data: string) => {
        stream.writeSSE({ data });
      },
      userId,
      close: () => stream.close(),
    };

    transcriptionSSEClients.add(client);

    // Send initial connection message
    await stream.writeSSE({
      data: JSON.stringify({ type: "connected", userId }),
    });

    stream.onAbort(() => {
      console.log(
        `[SSE Transcription] Client disconnected for user: ${userId}`,
      );
      transcriptionSSEClients.delete(client);
    });

    // Keep the stream alive
    while (true) {
      await stream.sleep(30000);
    }
  });
});

// Play audio from URL
api.post("/play-audio", async (c) => {
  const { audioUrl, userId } = await c.req.json();

  if (!audioUrl) return c.json({ error: "audioUrl is required" }, 400);
  if (!userId) return c.json({ error: "userId is required" }, 400);

  const session = activeSessions.get(userId);
  if (!session) {
    return c.json({ error: `No active session for user ${userId}` }, 404);
  }

  console.log(`[Audio] Playing audio for user: ${userId}`);

  try {
    const result = await session.audio.playAudio({ audioUrl });
    console.log(`[Audio] Play audio result:`, result);
    return c.json({ success: true, message: "Audio playback started", userId, audioUrl });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Text-to-speech
api.post("/speak", async (c) => {
  const { text, userId } = await c.req.json();

  if (!text) return c.json({ error: "text is required" }, 400);
  if (!userId) return c.json({ error: "userId is required" }, 400);

  const session = activeSessions.get(userId);
  if (!session) {
    return c.json({ error: `No active session for user ${userId}` }, 404);
  }

  console.log(`[Speak] Speaking text for user: ${userId}`);

  try {
    await session.audio.speak(text);
    return c.json({ success: true, message: "Text-to-speech started", userId });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Stop audio
api.post("/stop-audio", async (c) => {
  const { userId } = await c.req.json();

  if (!userId) return c.json({ error: "userId is required" }, 400);

  const session = activeSessions.get(userId);
  if (!session) {
    return c.json({ error: `No active session for user ${userId}` }, 404);
  }

  console.log(`[Audio] Stopping audio for user: ${userId}`);

  try {
    await session.audio.stopAudio();
    return c.json({ success: true, message: "Audio stopped", userId });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get theme preference
api.get("/theme-preference", async (c) => {
  const userId = c.req.query("userId");

  if (!userId) return c.json({ error: "userId is required" }, 400);

  const session = activeSessions.get(userId);
  if (!session) {
    return c.json({ error: `No active session for user ${userId}` }, 404);
  }

  try {
    const theme = await getThemePreference(session, userId);
    return c.json({ theme, userId });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Set theme preference
api.post("/theme-preference", async (c) => {
  const { userId, theme } = await c.req.json();

  if (!userId) return c.json({ error: "userId is required" }, 400);
  if (!theme || (theme !== "dark" && theme !== "light")) {
    return c.json({ error: 'theme must be "dark" or "light"' }, 400);
  }

  const session = activeSessions.get(userId);
  if (!session) {
    return c.json({ error: `No active session for user ${userId}` }, 404);
  }

  try {
    await setThemePreference(session, userId, theme);
    return c.json({ success: true, theme, userId });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get latest photo metadata
api.get("/latest-photo", (c) => {
  const userId = c.req.query("userId");

  if (!userId) return c.json({ error: "userId is required" }, 400);
  if (!photosMapRef) return c.json({ error: "No photos available" }, 404);

  const userPhotos = Array.from(photosMapRef.values())
    .filter((photo) => photo.userId === userId)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (userPhotos.length === 0) {
    return c.json({ error: "No photos available for this user" }, 404);
  }

  const latestPhoto = userPhotos[0];
  return c.json({
    requestId: latestPhoto.requestId,
    timestamp: latestPhoto.timestamp.getTime(),
    userId: latestPhoto.userId,
    hasPhoto: true,
  });
});

// Get photo image data
api.get("/photo/:requestId", (c) => {
  const requestId = c.req.param("requestId");
  const userId = c.req.query("userId");

  if (!userId) return c.json({ error: "userId is required" }, 400);
  if (!photosMapRef) return c.json({ error: "Photo not found" }, 404);

  const photo = photosMapRef.get(requestId);
  if (!photo) return c.json({ error: "Photo not found" }, 404);
  if (photo.userId !== userId) {
    return c.json({ error: "Access denied: photo belongs to different user" }, 403);
  }

  return new Response(photo.buffer, {
    headers: {
      "Content-Type": photo.mimeType,
      "Cache-Control": "no-cache",
    },
  });
});

// Get photo as base64 JSON
api.get("/photo-base64/:requestId", (c) => {
  const requestId = c.req.param("requestId");
  const userId = c.req.query("userId");

  if (!userId) return c.json({ error: "userId is required" }, 400);
  if (!photosMapRef) return c.json({ error: "Photo not found" }, 404);

  const photo = photosMapRef.get(requestId);
  if (!photo) return c.json({ error: "Photo not found" }, 404);
  if (photo.userId !== userId) {
    return c.json({ error: "Access denied: photo belongs to different user" }, 403);
  }

  const base64Data = photo.buffer.toString("base64");
  return c.json({
    requestId: photo.requestId,
    timestamp: photo.timestamp.getTime(),
    mimeType: photo.mimeType,
    filename: photo.filename,
    size: photo.size,
    userId: photo.userId,
    base64: base64Data,
    dataUrl: `data:${photo.mimeType};base64,${base64Data}`,
  });
});
