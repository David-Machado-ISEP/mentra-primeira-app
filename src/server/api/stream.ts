import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { sessions } from "../manager/SessionManager";

/** GET /photo-stream — SSE for real-time photo updates */
export function photoStream(c: Context) {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "userId is required" }, 400);

  const user = sessions.getOrCreate(userId);

  console.log(`[SSE Photo] Client connected for user: ${userId}`);

  return streamSSE(c, async (stream) => {
    const client = {
      write: (data: string) => stream.writeSSE({ data }),
      userId,
      close: () => stream.close(),
    };

    user.photo.addSSEClient(client);

    await stream.writeSSE({
      data: JSON.stringify({ type: "connected", userId }),
    });

    // Send existing photos
    for (const photo of user.photo.getAllMap().values()) {
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

    stream.onAbort(() => {
      console.log(`[SSE Photo] Client disconnected for user: ${userId}`);
      user.photo.removeSSEClient(client);
    });

    while (true) {
      await stream.sleep(30000);
    }
  });
}

/** GET /transcription-stream — SSE for real-time transcriptions */
export function transcriptionStream(c: Context) {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "userId is required" }, 400);

  const user = sessions.getOrCreate(userId);

  console.log(`[SSE Transcription] Client connected for user: ${userId}`);

  return streamSSE(c, async (stream) => {
    const client = {
      write: (data: string) => stream.writeSSE({ data }),
      userId,
      close: () => stream.close(),
    };

    user.transcription.addSSEClient(client);

    await stream.writeSSE({
      data: JSON.stringify({ type: "connected", userId }),
    });

    stream.onAbort(() => {
      console.log(
        `[SSE Transcription] Client disconnected for user: ${userId}`,
      );
      user.transcription.removeSSEClient(client);
    });

    while (true) {
      await stream.sleep(30000);
    }
  });
}

/** GET /visited-places-stream — SSE for automatically saved visited places */
export function visitedPlacesStream(c: Context) {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "userId is required" }, 400);

  const user = sessions.getOrCreate(userId);

  console.log(`[SSE Visited Places] Client connected for user: ${userId}`);

  return streamSSE(c, async (stream) => {
    const client = {
      write: (data: string) => stream.writeSSE({ data }),
      userId,
      close: () => stream.close(),
    };

    user.visitedPlaces.addSSEClient(client);

    await stream.writeSSE({
      data: JSON.stringify({
        type: "connected",
        userId,
        places: user.visitedPlaces.getAll(),
      }),
    });

    stream.onAbort(() => {
      console.log(
        `[SSE Visited Places] Client disconnected for user: ${userId}`,
      );
      user.visitedPlaces.removeSSEClient(client);
    });

    while (true) {
      await stream.sleep(30000);
    }
  });
}

/** GET /location-stream — SSE for current GPS/location updates */
export function locationStream(c: Context) {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "userId is required" }, 400);

  const user = sessions.getOrCreate(userId);

  console.log(`[SSE Location] Client connected for user: ${userId}`);

  return streamSSE(c, async (stream) => {
    const client = {
      write: (data: string) => stream.writeSSE({ data }),
      userId,
      close: () => stream.close(),
    };

    user.location.addSSEClient(client);

    await stream.writeSSE({
      data: JSON.stringify({
        type: "connected",
        userId,
        location: user.location.getLatest(),
      }),
    });

    stream.onAbort(() => {
      console.log(`[SSE Location] Client disconnected for user: ${userId}`);
      user.location.removeSSEClient(client);
    });

    while (true) {
      await stream.sleep(30000);
    }
  });
}

/** GET /visual-discoveries-stream — SSE for visual discoveries from UC05 */
export function visualDiscoveriesStream(c: Context) {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "userId is required" }, 400);

  const user = sessions.getOrCreate(userId);

  console.log(`[SSE Visual Discoveries] Client connected for user: ${userId}`);

  return streamSSE(c, async (stream) => {
    const client = {
      write: (data: string) => stream.writeSSE({ data }),
      userId,
      close: () => stream.close(),
    };

    user.visualDiscoveries.addSSEClient(client);

    await stream.writeSSE({
      data: JSON.stringify({
        type: "connected",
        userId,
        discoveries: user.visualDiscoveries.getAll(),
      }),
    });

    stream.onAbort(() => {
      console.log(
        `[SSE Visual Discoveries] Client disconnected for user: ${userId}`,
      );
      user.visualDiscoveries.removeSSEClient(client);
    });

    while (true) {
      await stream.sleep(30000);
    }
  });
}

/** GET /companion-stream — SSE for Companion timeline events */
export function companionStream(c: Context) {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "userId is required" }, 400);

  const user = sessions.getOrCreate(userId);

  console.log(`[SSE Companion] Client connected for user: ${userId}`);

  return streamSSE(c, async (stream) => {
    const client = {
      write: (data: string) => stream.writeSSE({ data }),
      userId,
      close: () => stream.close(),
    };

    user.companion.addSSEClient(client);

    await stream.writeSSE({
      data: JSON.stringify({
        type: "connected",
        userId,
        interactions: user.companion.getAll(),
      }),
    });

    stream.onAbort(() => {
      console.log(`[SSE Companion] Client disconnected for user: ${userId}`);
      user.companion.removeSSEClient(client);
    });

    while (true) {
      await stream.sleep(30000);
    }
  });
}
