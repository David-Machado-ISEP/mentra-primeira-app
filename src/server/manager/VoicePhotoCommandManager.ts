import type { User } from "../session/User";

export const ENABLE_VOICE_PHOTO_COMMAND =
  process.env.ENABLE_VOICE_PHOTO_COMMAND === "true";

const DEFAULT_PHOTO_COMMANDS = [
  "tirar foto",
  "tira foto",
  "tirar uma foto",
  "tira uma foto",
  "capturar foto",
  "captura foto",
  "fotografia",
];

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,!?;:]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export class VoicePhotoCommandManager {
  private isTakingPhoto = false;
  private lastVoicePhotoAt = 0;

  private readonly cooldownMs = 8_000;

  constructor(private user: User) {}

  async handleTranscription(text: string): Promise<boolean> {
    if (!ENABLE_VOICE_PHOTO_COMMAND) return false;

    const command = this.extractPhotoCommand(text);

    if (!command) return false;

    console.log(
      `[VoicePhoto] ${this.user.userId}: comando de foto detetado -> ${command}`,
    );

    await this.takePhotoFromVoice();

    return true;
  }

  destroy(): void {
    this.isTakingPhoto = false;
    this.lastVoicePhotoAt = 0;
  }

  private extractPhotoCommand(text: string): string | null {
    const normalizedText = normalizeText(text);
    const commands = this.getPhotoCommands();

    for (const command of commands) {
      const normalizedCommand = normalizeText(command);

      if (normalizedText === normalizedCommand) {
        return command;
      }
    }

    return null;
  }

  private getPhotoCommands(): string[] {
    const fromEnv = process.env.VOICE_PHOTO_COMMANDS
      ?.split(",")
      .map((command) => command.trim())
      .filter(Boolean);

    return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_PHOTO_COMMANDS;
  }

  private async takePhotoFromVoice(): Promise<void> {
    if (this.isTakingPhoto) {
      await this.user.audio.speak("Já estou a tirar uma foto.");
      return;
    }

    const now = Date.now();

    if (now - this.lastVoicePhotoAt < this.cooldownMs) {
      await this.user.audio.speak(
        "Aguarda alguns segundos antes de tirar outra foto.",
      );
      return;
    }

    if (!this.user.appSession) {
      console.log(
        `[VoicePhoto] ${this.user.userId}: sem sessão ativa nos óculos`,
      );
      return;
    }

    this.isTakingPhoto = true;
    this.lastVoicePhotoAt = now;

    try {
      await this.user.audio.speak("A tirar foto.");

      const photo = await this.user.photo.takePhoto({
        source: "voice_photo_command",
        waitIfCapturing: true,
        waitTimeoutMs: 12_000,
      });

      if (!photo) {
        await this.user.audio.speak(
          "Não consegui tirar a foto neste momento.",
        );
        return;
      }

      await this.user.audio.speak("Foto guardada.");
    } catch (error) {
      console.error(
        `[VoicePhoto] ${this.user.userId}: erro ao tirar foto por voz`,
        error,
      );

      await this.user.audio.speak(
        "Não consegui tirar a foto neste momento.",
      );
    } finally {
      this.isTakingPhoto = false;
    }
  }
}