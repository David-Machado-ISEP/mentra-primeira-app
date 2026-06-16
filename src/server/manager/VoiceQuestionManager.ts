import type { User } from "../session/User";
import { askGeminiText } from "../api/gemini";

export const ENABLE_VOICE_QUESTION_FEATURE =
  process.env.ENABLE_VOICE_QUESTION_FEATURE === "true";

export const ENABLE_VOICE_QUESTION_DOUBLE_TAP =
  process.env.ENABLE_VOICE_QUESTION_DOUBLE_TAP === "true";

export const ENABLE_VOICE_QUESTION_WAKE_WORD =
  process.env.ENABLE_VOICE_QUESTION_WAKE_WORD === "true";

export const ENABLE_VOICE_QUESTION_COMPANION_BUTTON =
  process.env.ENABLE_VOICE_QUESTION_COMPANION_BUTTON === "true";

const DEFAULT_WAKE_WORDS = ["mentra", "submarino"];

type VoiceQuestionSource = "double_tap" | "wake_word" | "companion_button";

interface VoiceQuestionActivationResult {
  success: boolean;
  message: string;
}

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class VoiceQuestionManager {
  private waitingForQuestion = false;
  private waitingSource: VoiceQuestionSource | null = null;
  private waitingTimeout: ReturnType<typeof setTimeout> | null = null;
  private isAnswering = false;
  private lastAnswerAt = 0;
  private ignoreTranscriptionsUntil = 0;

  private readonly cooldownMs = 10_000;
  private readonly questionTimeoutMs = 12_000;
  private readonly ignoreAfterActivationMs = 2_200;

  constructor(private user: User) {}

  async activateFromDoubleTap(): Promise<boolean> {
    if (!ENABLE_VOICE_QUESTION_FEATURE) return false;
    if (!ENABLE_VOICE_QUESTION_DOUBLE_TAP) return false;

    const result = await this.activate("double_tap");
    return result.success;
  }

  async activateFromCompanionButton(): Promise<VoiceQuestionActivationResult> {
    if (!ENABLE_VOICE_QUESTION_FEATURE) {
      return {
        success: false,
        message: "As perguntas por voz estão desligadas no servidor.",
      };
    }

    if (!ENABLE_VOICE_QUESTION_COMPANION_BUTTON) {
      return {
        success: false,
        message: "O botão de pergunta por voz no Companion está desligado.",
      };
    }

    return this.activate("companion_button");
  }

  async handleTranscription(text: string): Promise<void> {
    try {
      if (!ENABLE_VOICE_QUESTION_FEATURE) return;

      const cleanText = text.replace(/\s+/g, " ").trim();
      if (!cleanText) return;

      if (Date.now() < this.ignoreTranscriptionsUntil) {
        return;
      }

      let question: string | null = null;
      let source: VoiceQuestionSource = "wake_word";
      let wakeWord: string | null = null;

      if (this.waitingForQuestion) {
        question = cleanText;
        source = this.waitingSource ?? "companion_button";
        this.stopWaitingForQuestion();
      }

      if (!question && ENABLE_VOICE_QUESTION_WAKE_WORD) {
  const extracted = this.extractWakeWordQuestion(cleanText);

  if (extracted) {
    question = extracted.question;
    wakeWord = extracted.wakeWord;
    source = "wake_word";
  } else {
    const wakeWordOnly = this.extractWakeWordOnly(cleanText);

    if (wakeWordOnly) {
      console.log(
        `[VoiceQuestion] ${this.user.userId}: wake word "${wakeWordOnly}" detetada`,
      );

      await this.activate("wake_word");
      return;
    }
  }
}

      if (!question) return;

      if (!this.isValidQuestion(question)) {
        await this.user.audio.speak(
          "Não consegui perceber a pergunta. Podes repetir?",
        );
        return;
      }

      await this.answerQuestion(question, source, wakeWord);
    } catch (error) {
      console.error(
        `[VoiceQuestion] ${this.user.userId}: erro ao processar transcrição`,
        error,
      );
    }
  }

  destroy(): void {
    this.stopWaitingForQuestion();
    this.isAnswering = false;
  }

  private async activate(
    source: VoiceQuestionSource,
  ): Promise<VoiceQuestionActivationResult> {
    if (this.isAnswering) {
      return {
        success: false,
        message: "O Companion ainda está a responder à pergunta anterior.",
      };
    }

    if (Date.now() - this.lastAnswerAt < this.cooldownMs) {
      return {
        success: false,
        message: "Aguarda alguns segundos antes de fazer outra pergunta.",
      };
    }

    if (!this.user.appSession) {
      return {
        success: false,
        message: "Os óculos não estão ligados.",
      };
    }

    this.waitingForQuestion = true;
    this.waitingSource = source;
    this.ignoreTranscriptionsUntil = Date.now() + this.ignoreAfterActivationMs;

    this.resetWaitingTimeout();

    try {
      await this.user.audio.speak("Estou a ouvir. Faz a tua pergunta.");
    } catch (error) {
      console.error(
        `[VoiceQuestion] ${this.user.userId}: erro ao iniciar pergunta por voz`,
        error,
      );
    }

    return {
      success: true,
      message: "Modo de pergunta por voz ativo. Faz a pergunta nos óculos.",
    };
  }

  private async answerQuestion(
    question: string,
    source: VoiceQuestionSource,
    wakeWord: string | null,
  ): Promise<void> {
    if (this.isAnswering) return;

    if (Date.now() - this.lastAnswerAt < this.cooldownMs) {
      return;
    }

    this.isAnswering = true;
    this.lastAnswerAt = Date.now();

    try {
      console.log(
        `[VoiceQuestion] ${this.user.userId}: pergunta recebida (${source}) -> ${question}`,
      );

      const answer = await askGeminiText(
        this.buildPrompt(question, source, wakeWord),
      );

      const safeAnswer = this.cleanAnswer(answer);

      this.user.companion.addInteraction({
        type: "voice_question",
        title: this.buildInteractionTitle(question),
        content: safeAnswer,
        source: this.buildSourceLabel(source, wakeWord),
      });

      await this.user.audio.speak(this.prepareForAudio(safeAnswer));
    } catch (error) {
      console.error(
        `[VoiceQuestion] ${this.user.userId}: erro ao responder com Gemini`,
        error,
      );

      const fallback =
        "Não consegui responder à pergunta neste momento. Tenta novamente daqui a pouco.";

      this.user.companion.addInteraction({
        type: "voice_question",
        title: "Falha na pergunta por voz",
        content: fallback,
        source: this.buildSourceLabel(source, wakeWord),
      });

      try {
        await this.user.audio.speak(fallback);
      } catch {
        // Ignora erro secundário de áudio.
      }
    } finally {
      this.isAnswering = false;
    }
  }

  private extractWakeWordOnly(text: string): string | null {
  const normalizedText = normalizeText(text)
    .replace(/^[\s,.:;!?-]+/, "")
    .replace(/[\s,.:;!?-]+$/, "");

  const wakeWords = this.getWakeWords();

  for (const wakeWord of wakeWords) {
    const normalizedWakeWord = normalizeText(wakeWord)
      .replace(/^[\s,.:;!?-]+/, "")
      .replace(/[\s,.:;!?-]+$/, "");

    if (normalizedText === normalizedWakeWord) {
      return wakeWord;
    }
  }

  return null;
}
  
  private extractWakeWordQuestion(
    text: string,
  ): { wakeWord: string; question: string } | null {
    const wakeWords = this.getWakeWords();
    const normalizedText = normalizeText(text);

    for (const wakeWord of wakeWords) {
      const normalizedWakeWord = normalizeText(wakeWord);

      if (!normalizedWakeWord) continue;

      const startsWithWakeWord =
        normalizedText === normalizedWakeWord ||
        normalizedText.startsWith(`${normalizedWakeWord} `) ||
        normalizedText.startsWith(`${normalizedWakeWord},`) ||
        normalizedText.startsWith(`${normalizedWakeWord}.`) ||
        normalizedText.startsWith(`${normalizedWakeWord}:`) ||
        normalizedText.startsWith(`${normalizedWakeWord};`) ||
        normalizedText.startsWith(`${normalizedWakeWord}!`) ||
        normalizedText.startsWith(`${normalizedWakeWord}?`);

      if (!startsWithWakeWord) continue;

      const pattern = new RegExp(
        `^${escapeRegExp(wakeWord)}[\\s,.:;!?-]*(.*)$`,
        "i",
      );

      const match = text.trim().match(pattern);
      const question = match?.[1]?.trim() ?? "";

      if (!question) return null;

      return {
        wakeWord,
        question,
      };
    }

    return null;
  }

  private getWakeWords(): string[] {
    const fromEnv = process.env.VOICE_QUESTION_WAKE_WORDS
      ?.split(",")
      .map((word) => word.trim())
      .filter(Boolean);

    return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_WAKE_WORDS;
  }

  private isValidQuestion(question: string): boolean {
    const normalized = question.replace(/\s+/g, " ").trim();

    return normalized.length >= 6;
  }

  private buildPrompt(
    question: string,
    source: VoiceQuestionSource,
    wakeWord: string | null,
  ): string {
    const location = this.user.location.getLatest();

    const locationContext = location
      ? `${location.placeName || location.city || "localização atual"}${
          location.displayName ? ` (${location.displayName})` : ""
        }`
      : "localização desconhecida";

    return `
És o Travel Whisperer, um companion de viagem integrado em smart glasses.

O utilizador fez uma pergunta por voz durante uma viagem.

Contexto:
- Localização aproximada: ${locationContext}
- Origem da ativação: ${source}
- Palavra-chave usada: ${wakeWord || "não aplicável"}

Pergunta do utilizador:
"${question}"

Responde em português de Portugal.
Sê útil, natural e direto.
A resposta vai ser ouvida nos óculos, por isso deve ser curta.
Usa no máximo 3 frases.
Se não souberes algo com segurança, diz isso sem inventar.
    `.trim();
  }

  private buildInteractionTitle(question: string): string {
    const cleanQuestion = question.replace(/\s+/g, " ").trim();

    if (cleanQuestion.length <= 54) {
      return `Pergunta por voz: ${cleanQuestion}`;
    }

    return `Pergunta por voz: ${cleanQuestion.slice(0, 51)}...`;
  }

  private buildSourceLabel(
    source: VoiceQuestionSource,
    wakeWord: string | null,
  ): string {
    if (source === "wake_word") {
      return wakeWord ? `wake_word_${normalizeText(wakeWord)}` : "wake_word";
    }

    if (source === "companion_button") {
      return "companion_voice_button";
    }

    return "double_tap_voice_question";
  }

  private cleanAnswer(answer: string): string {
    const clean = answer.replace(/\s+/g, " ").trim();

    return clean || "Não consegui gerar uma resposta neste momento.";
  }

  private prepareForAudio(answer: string): string {
    return this.cleanAnswer(answer);
  }

  private resetWaitingTimeout(): void {
    if (this.waitingTimeout) {
      clearTimeout(this.waitingTimeout);
    }

    this.waitingTimeout = setTimeout(() => {
      this.waitingForQuestion = false;
      this.waitingSource = null;
      this.waitingTimeout = null;

      console.log(
        `[VoiceQuestion] ${this.user.userId}: tempo de pergunta expirou`,
      );
    }, this.questionTimeoutMs);
  }

  private stopWaitingForQuestion(): void {
    this.waitingForQuestion = false;
    this.waitingSource = null;

    if (this.waitingTimeout) {
      clearTimeout(this.waitingTimeout);
      this.waitingTimeout = null;
    }
  }
}