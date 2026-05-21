import type { Context } from "hono";
import { generateAlbumMemoryWithGemini } from "./gemini";

export async function generateAlbumMemory(c: Context) {
  try {
    const body = await c.req.json();

    const albumName = body.albumName || "Álbum de viagem";
    const photoCount = body.photoCount || 0;
    const photoTimes = Array.isArray(body.photoTimes) ? body.photoTimes : [];

    console.log(`[AlbumMemory] Generating memory for "${albumName}"`);

    const memory = await generateAlbumMemoryWithGemini({
      albumName,
      photoCount,
      photoTimes,
    });

    return c.json({
      success: true,
      memory,
    });
  } catch (error) {
    console.error("[AlbumMemory] Failed:", error);

    return c.json(
      {
        success: false,
        error: "Failed to generate album memory.",
        memory: "",
      },
      500,
    );
  }
}