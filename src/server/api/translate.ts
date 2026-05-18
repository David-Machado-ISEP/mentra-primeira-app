import type { Context } from "hono";
import { translateTextWithGemini } from "./gemini";

export async function translate(c: Context) {
  try {
    const body = await c.req.json();

    const text = body.text?.trim() || "";
    const targetLanguage = body.targetLanguage || "English";

    if (!text) {
      return c.json(
        {
          success: false,
          translation: "No text provided for translation.",
        },
        400,
      );
    }

    console.log(
      `[Translate] Translating to ${targetLanguage}: "${text}"`,
    );

    const translation = await translateTextWithGemini(
      text,
      targetLanguage,
    );

    console.log(
      `[Translate] Result: "${translation}"`,
    );

    return c.json({
      success: true,
      translation,
    });
  } catch (error) {
    console.error("[Translate] Failed:", error);

    return c.json(
      {
        success: false,
        translation: "Translation failed",
      },
      500,
    );
  }
}