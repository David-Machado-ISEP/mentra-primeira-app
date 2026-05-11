import type { Context } from "hono";

export async function translate(c: Context) {
  try {
    const body = await c.req.json();

    const text = body.text?.toLowerCase() || "";
    const targetLanguage = body.targetLanguage || "English";

    let translation = `Translated to ${targetLanguage}`;

    if (targetLanguage === "English") {
      if (text.includes("olá")) translation = "Hello";
      else if (text.includes("bom dia")) translation = "Good morning";
      else if (text.includes("obrigado")) translation = "Thank you";
      else if (text.includes("como estás")) translation = "How are you?";
    }

    if (targetLanguage === "Português") {
      if (text.includes("hello")) translation = "Olá";
      else if (text.includes("thank you")) translation = "Obrigado";
    }

    return c.json({
      success: true,
      translation,
    });
  } catch {
    return c.json({
      success: false,
      translation: "Translation failed",
    });
  }
}