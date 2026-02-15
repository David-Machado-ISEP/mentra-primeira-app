/**
 * API Routes (Hono)
 *
 * Pure route definitions — all state lives in SessionManager.
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { sessions } from "../manager/sessions";
import {
  getThemePreference,
  setThemePreference,
} from "../manager/simple-storage";

export const api = new Hono();

// Health check
api.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// SSE: Real-time photo stream
api.get("/photo-stream", (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "userId is required" }, 400);

  console.log(`[SSE Photo] Client connected for user: ${userId}`);

  return streamSSE(c, async (stream) => {
    const client = {
      write: (data: string) => stream.writeSSE({ data }),
      userId,
      close: () => stream.close(),
    };

    sessions.addPhotoSSEClient(client);

    await stream.writeSSE({
      data: JSON.stringify({ type: "connected", userId }),
    });

    // Send existing photos for this user
    for (const photo of sessions.getAllPhotos().values()) {
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

    stream.onAbort(() => {
      console.log(`[SSE Photo] Client disconnected for user: ${userId}`);
      sessions.removePhotoSSEClient(client);
    });

    while (true) {
      await stream.sleep(30000);
    }
  });
});

// SSE: Real-time transcription stream
api.get("/transcription-stream", (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "userId is required" }, 400);

  console.log(`[SSE Transcription] Client connected for user: ${userId}`);

  return streamSSE(c, async (stream) => {
    const client = {
      write: (data: string) => stream.writeSSE({ data }),
      userId,
      close: () => stream.close(),
    };

    sessions.addTranscriptionSSEClient(client);

    await stream.writeSSE({
      data: JSON.stringify({ type: "connected", userId }),
    });

    stream.onAbort(() => {
      console.log(
        `[SSE Transcription] Client disconnected for user: ${userId}`,
      );
      sessions.removeTranscriptionSSEClient(client);
    });

    while (true) {
      await stream.sleep(30000);
    }
  });
});

// Text-to-speech
api.post("/speak", async (c) => {
  const { text, userId } = await c.req.json();

  if (!text) return c.json({ error: "text is required" }, 400);
  if (!userId) return c.json({ error: "userId is required" }, 400);

  const session = sessions.getSession(userId);
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

  const session = sessions.getSession(userId);
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

  const session = sessions.getSession(userId);
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

  const session = sessions.getSession(userId);
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

  const userPhotos = sessions.getPhotosByUser(userId);
  if (userPhotos.length === 0) {
    return c.json({ error: "No photos available for this user" }, 404);
  }

  const latest = userPhotos[0];
  return c.json({
    requestId: latest.requestId,
    timestamp: latest.timestamp.getTime(),
    userId: latest.userId,
    hasPhoto: true,
  });
});

// Get photo image data
api.get("/photo/:requestId", (c) => {
  const requestId = c.req.param("requestId");
  const userId = c.req.query("userId");

  if (!userId) return c.json({ error: "userId is required" }, 400);

  const photo = sessions.getPhoto(requestId);
  if (!photo) return c.json({ error: "Photo not found" }, 404);
  if (photo.userId !== userId) {
    return c.json(
      { error: "Access denied: photo belongs to different user" },
      403,
    );
  }

  return new Response(new Uint8Array(photo.buffer), {
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

  const photo = sessions.getPhoto(requestId);
  if (!photo) return c.json({ error: "Photo not found" }, 404);
  if (photo.userId !== userId) {
    return c.json(
      { error: "Access denied: photo belongs to different user" },
      403,
    );
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
