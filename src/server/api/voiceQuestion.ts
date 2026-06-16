import type { Context } from "hono";
import { sessions } from "../manager/SessionManager";

export async function startVoiceQuestion(c: Context) {
  try {
    const body = await c.req.json().catch(() => null);
    const userId = body?.userId;

    if (!userId) {
      return c.json({ error: "userId is required" }, 400);
    }

    const user = sessions.getOrCreate(userId);
    const result = await user.voiceQuestion.activateFromCompanionButton();

    if (!result.success) {
      return c.json({ error: result.message }, 400);
    }

    return c.json(result);
  } catch (error) {
    console.error("Voice question start error:", error);

    return c.json(
      {
        error: "Erro ao iniciar pergunta por voz.",
      },
      500,
    );
  }
}