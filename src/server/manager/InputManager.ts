import type { AppSession } from "@mentra/sdk";
import type { User } from "../session/User";
import type { CurrentLocation } from "./LocationManager";
import type { StoredPhoto } from "./PhotoManager";
import type { VisualDiscoverySource } from "./VisualDiscoveriesManager";

import {
  analyzeImageForMemoryWithGemini,
  describeImageWithGemini,
  ENABLE_MEMORY_AI_CLASSIFICATION,
  ENABLE_SINGLE_TAP_MEMORY_AI_CLASSIFICATION,
  translateMenuImageWithGemini,
} from "../api/gemini";

const ENABLE_SINGLE_TAP_PHOTO = process.env.ENABLE_SINGLE_TAP_PHOTO === "true";

const ENABLE_SINGLE_PRESS_PHOTO =
  process.env.ENABLE_SINGLE_PRESS_PHOTO === "true";

/**
 * All supported touchpad gestures on the glasses.
 */
export const GESTURES = [
  "single_tap",
  "double_tap",
  "triple_tap",
  "long_press",
  "forward_swipe",
  "backward_swipe",
  "up_swipe",
  "down_swipe",
] as const;

export type GestureName = (typeof GESTURES)[number];

const ESTADIO_DO_DRAGAO_DESCRIPTION =
  "Estás a ver o Estádio do Dragão, no Porto. É a casa do Futebol Clube do Porto e um dos estádios mais importantes de Portugal. Foi inaugurado em 2003 e recebe jogos de futebol, eventos e concertos. A sua arquitetura moderna tornou-se uma referência da cidade. E claro, em tom de brincadeira, também podemos dizer que é o estádio do maior clube de Portugal.";

const RESTAURANT_MENU_TRANSLATION =
  "Tradução simulada do menu. Entrada: sopa de tomate com manjericão. Prato principal: bacalhau grelhado com batatas assadas e legumes. Também há frango com molho de limão e ervas. Sobremesa: tarte de maçã com canela. Atenção: o bacalhau pode conter espinhas e alguns pratos podem ter leite, ovos ou glúten. Se quiseres uma opção segura e típica, eu escolheria o bacalhau grelhado.";

/**
 * InputManager — handles all physical input from the glasses (buttons + touchpad).
 *
 * Registers listeners on the AppSession and routes events to the
 * appropriate manager.
 *
 * New button behavior:
 * - 1 short press  -> log test message
 * - 2 short presses -> take a photo
 */
export class InputManager {
  private shortPressCount = 0;
  private shortPressTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Time window to decide whether a short press is single or double.
   * If a 2nd short press happens within this time, it's treated as double press.
   */
  private readonly doublePressDelayMs = 900;

  constructor(private user: User) {}

  /** Wire up all button and touch listeners on the glasses session */
  setup(session: AppSession): void {
    this.setupButtons(session);
    this.setupTouch(session);
  }

  /** Button press handlers */
  private setupButtons(session: AppSession): void {
    session.events.onButtonPress(async (button) => {
      console.log(
        `[Button] ${this.user.userId}: ${button.buttonId} (${button.pressType})`,
      );

      if (button.pressType === "long") {
        // Reserved for future use
        return;
      }

      this.shortPressCount += 1;
      console.log(
        `[Debug] ${this.user.userId}: shortPressCount = ${this.shortPressCount}`,
      );

      // First short press: start waiting window
      if (this.shortPressCount === 1) {
        this.shortPressTimer = setTimeout(async () => {
          console.log(
            `[Debug] ${this.user.userId}: timer expired with count = ${this.shortPressCount}`,
          );

          if (this.shortPressCount === 1) {
            if (ENABLE_SINGLE_PRESS_PHOTO) {
              await this.handleQuickPhoto("single_press");
            } else {
              console.log(`[Test] ${this.user.userId}: mensagem de teste`);
            }
          }

          this.shortPressCount = 0;
          this.shortPressTimer = null;
        }, this.doublePressDelayMs);

        return;
      }

      // Second short press within the delay: treat as double press
      if (this.shortPressCount === 2) {
        console.log(`[Debug] ${this.user.userId}: detected double press`);

        if (this.shortPressTimer) {
          clearTimeout(this.shortPressTimer);
          this.shortPressTimer = null;
        }

        this.shortPressCount = 0;

        console.log(
          `[Button] ${this.user.userId}: double short press -> take photo`,
        );

        try {
          const photo = await this.user.photo.takePhoto({
            source: "double_press",
          });

          if (photo) {
            void this.analyzePhotoForMemory(photo, "double_press");
          }
        } catch (error) {
          console.error(
            `[Button] ${this.user.userId}: failed to take photo on double press`,
            error,
          );
        }
      }
    });
  }

  /** Touchpad gesture handlers */
  private setupTouch(session: AppSession): void {
    if (ENABLE_SINGLE_TAP_PHOTO) {
      session.events.onTouchEvent("single_tap", async () => {
        await this.handleQuickPhoto("single_tap");
      });
    }

    session.events.onTouchEvent("double_tap", async () => {
      console.log(`[Touch] ${this.user.userId}: double_tap`);

      // Trigger experimental para perguntas por voz.
      // Se o double tap estiver ocupado com música, troca esta chamada para outro gesto/botão.
      const handled = await this.user.voiceQuestion.activateFromDoubleTap();

      if (handled) return;
    });

    session.events.onTouchEvent("triple_tap", async () => {
      console.log(`[Touch] ${this.user.userId}: triple_tap`);
      console.log(`[Test] ${this.user.userId}: TRIPLE TAP FUNCIONOU`);

      this.user.companion.addInteraction({
        type: "triple_tap",
        title: "Pergunta visual recebida",
        content:
          "O utilizador pediu ao Companion para explicar o que está a ver.",
        source: "triple_tap",
      });

      let photo = null;
      let locationAtCapture: CurrentLocation | null = null;

      await this.wait(1500);

      try {
        locationAtCapture = this.user.location.getLatest();

        photo = await this.user.photo.takePhoto({
          source: "triple_tap",
          bypassCooldown: true,
        });
      } catch (error) {
        console.error(
          `[Touch] ${this.user.userId}: failed to take photo for UC05`,
          error,
        );
      }

      if (!photo) {
        console.log(
          `[UC05] ${this.user.userId}: não foi possível obter a foto`,
        );

        this.user.companion.addInteraction({
          type: "triple_tap",
          title: "Não foi possível captar imagem",
          content:
            "O Companion recebeu o pedido visual, mas não conseguiu obter uma fotografia dos óculos.",
          source: "triple_tap",
        });

        return;
      }

      const imageBase64 = photo.buffer.toString("base64");

      let description = "";

      try {
        const memoryDescription = await this.analyzePhotoForMemory(
          photo,
          "triple_tap",
        );

        if (memoryDescription) {
          description = memoryDescription;
        } else {
          description = await describeImageWithGemini(
            imageBase64,
            photo.mimeType || "image/jpeg",
          );

          const photoDataUrl = `data:${photo.mimeType || "image/jpeg"};base64,${imageBase64}`;

          this.user.visualDiscoveries.addDiscovery({
            photoRequestId: photo.requestId,
            photoDataUrl,
            description,
            source: "triple_tap",
          });
        }

        console.log(
          `[UC05] ${this.user.userId}: Gemini description:`,
          description,
        );

        this.user.companion.addInteraction({
          type: "ai",
          title: "Descrição visual gerada",
          content: this.firstSentence(description),
          source: "gemini_visual_description",
        });
      } catch (error) {
        console.error(
          `[UC05] ${this.user.userId}: failed to describe image with Gemini`,
          error,
        );

        this.user.companion.addInteraction({
          type: "ai",
          title: "Falha na análise visual",
          content:
            "O Companion tentou analisar a imagem com Gemini, mas a resposta falhou.",
          source: "gemini_visual_description",
        });

        description =
          "Não consegui analisar a imagem neste momento. Tenta novamente daqui a pouco.";
      }

      try {
        await this.user.audio.speak(this.firstSentence(description));
      } catch (error) {
        console.error(
          `[Touch] ${this.user.userId}: failed to speak UC05 description`,
          error,
        );
      }

      this.savePhotoVisitedPlace(
        description,
        photo.requestId,
        locationAtCapture,
      );
    });

    session.events.onTouchEvent("long_press", async () => {
      console.log(`[Touch] ${this.user.userId}: long_press`);
      console.log(`[UC14] ${this.user.userId}: translate menu or visual text`);

      this.user.companion.addInteraction({
        type: "long_press",
        title: "Tradução visual pedida",
        content:
          "O utilizador pediu ajuda para traduzir um menu, sinal ou pequeno texto através da câmara.",
        source: "long_press",
      });

      let photo = null;
      let locationAtCapture: CurrentLocation | null = null;

      await this.wait(1500);

      try {
        locationAtCapture = this.user.location.getLatest();

        photo = await this.user.photo.takePhoto({
          source: "long_press",
          bypassCooldown: true,
          waitIfCapturing: true,
          waitTimeoutMs: 12000,
        });
      } catch (error) {
        console.error(
          `[Touch] ${this.user.userId}: failed to take photo for UC14`,
          error,
        );
      }

      if (!photo) {
        console.log(
          `[UC14] ${this.user.userId}: não foi possível obter a foto`,
        );

        this.user.companion.addInteraction({
          type: "translation",
          title: "Não foi possível captar a imagem",
          content:
            "O Companion recebeu o pedido de tradução, mas não conseguiu obter uma fotografia do menu ou texto.",
          source: "long_press",
        });

        return;
      }

      const imageBase64 = photo.buffer.toString("base64");

      let menuTranslation = "";

      try {
        menuTranslation = await translateMenuImageWithGemini(
          imageBase64,
          this.user.getTranslationTargetLanguage(),
          photo.mimeType || "image/jpeg",
        );

        console.log(
          `[UC14] ${this.user.userId}: Gemini menu translation:`,
          menuTranslation,
        );

        this.user.companion.addInteraction({
          type: "translation",
          title: "Tradução visual concluída",
          content: this.firstSentence(menuTranslation),
          source: "gemini_menu_translation",
          photoId: photo.requestId,
        });
      } catch (error) {
        console.error(
          `[UC14] ${this.user.userId}: failed to translate menu with Gemini`,
          error,
        );
        this.user.companion.addInteraction({
          type: "translation",
          title: "Falha na tradução visual",
          content:
            "O Companion tentou traduzir o menu ou texto com Gemini, mas a resposta falhou.",
          source: "gemini_menu_translation",
          photoId: photo.requestId,
        });

        menuTranslation =
          "Não consegui traduzir este menu ou texto neste momento. Tenta novamente daqui a pouco.";
      }

      try {
        await this.user.audio.speak(menuTranslation);
      } catch (error) {
        console.error(
          `[Touch] ${this.user.userId}: failed to speak UC14 menu translation`,
          error,
        );
      }

      this.saveMenuVisitedPlace(
        menuTranslation,
        photo.requestId,
        locationAtCapture,
      );
    });

    session.events.onTouchEvent("forward_swipe", () => {
      console.log(`[Touch] ${this.user.userId}: forward_swipe`);
    });

    session.events.onTouchEvent("backward_swipe", () => {
      console.log(`[Touch] ${this.user.userId}: backward_swipe`);
    });

    session.events.onTouchEvent("up_swipe", () => {
      console.log(`[Touch] ${this.user.userId}: up_swipe`);
    });

    session.events.onTouchEvent("down_swipe", () => {
      console.log(`[Touch] ${this.user.userId}: down_swipe`);
    });
  }

  private async handleQuickPhoto(
    source: "single_tap" | "single_press",
  ): Promise<void> {
    const sourceLabel = source === "single_tap" ? "single tap" : "single press";

    console.log(`[Touch] ${this.user.userId}: ${source}`);

    this.user.companion.addInteraction({
      type: "photo",
      title: "Foto rápida",
      content: `Foi pedido um registo visual através de ${sourceLabel}.`,
      source,
    });

    try {
      const locationAtCapture = this.user.location.getLatest();

      const photo = await this.user.photo.takePhoto({
        source,
        waitIfCapturing: true,
        waitTimeoutMs: 12000,
      });

      if (!photo) {
        this.user.companion.addInteraction({
          type: "photo",
          title: "Foto não capturada",
          content:
            "A câmara dos óculos estava ocupada ou não respondeu a tempo. Tenta novamente daqui a alguns segundos.",
          source,
        });

        return;
      }

      this.saveQuickPhotoVisitedPlace(photo.requestId, locationAtCapture);

      if (photo && ENABLE_SINGLE_TAP_MEMORY_AI_CLASSIFICATION) {
        void this.analyzePhotoForMemory(photo, source);
      }
    } catch (error) {
      console.error(
        `[Touch] ${this.user.userId}: failed to take photo on ${source}`,
        error,
      );
    }
  }

  private async analyzePhotoForMemory(
    photo: StoredPhoto,
    source: VisualDiscoverySource,
  ): Promise<string | null> {
    if (!ENABLE_MEMORY_AI_CLASSIFICATION) {
      return null;
    }

    const imageBase64 = photo.buffer.toString("base64");

    try {
      const analysis = await analyzeImageForMemoryWithGemini(
        imageBase64,
        photo.mimeType || "image/jpeg",
      );

      if (!analysis) {
        return null;
      }

      const photoDataUrl = `data:${photo.mimeType || "image/jpeg"};base64,${imageBase64}`;

      this.user.visualDiscoveries.addDiscovery({
        photoRequestId: photo.requestId,
        photoDataUrl,
        description: analysis.description,
        source,
        aiCategory: analysis.category,
        aiTags: analysis.tags,
        aiConfidence: analysis.confidence,
      });

      console.log(
        `[Memory AI] ${this.user.userId}: ${source} classified as ${analysis.category} (${Math.round(
          analysis.confidence * 100,
        )}%)`,
      );

      return analysis.description;
    } catch (error) {
      console.error(
        `[Memory AI] ${this.user.userId}: failed to classify photo for memories`,
        error,
      );
      return null;
    }
  }

  private saveQuickPhotoVisitedPlace(
    photoRequestId: string,
    locationAtCapture?: CurrentLocation | null,
  ): void {
    const location = locationAtCapture ?? this.user.location.getLatest();

    if (!location) {
      console.log(
        `[VisitedPlaces] ${this.user.userId}: quick photo skipped because location is unavailable`,
      );
      return;
    }

    const locationName = this.getReadableLocationName(location);

    const name =
      locationName && !this.isCityOnly(locationName)
        ? locationName
        : `Local em ${this.inferCity(location, "")}`;

    this.user.visitedPlaces.saveVisitedPlace({
      name,
      city: this.inferCity(location, ""),
      category: "Place",
      description: this.buildVisitedPlaceDescription(
        `Foto rápida captada em ${name}.`,
        "Guardado automaticamente depois de tirar uma fotografia durante a viagem.",
      ),
      detectedFrom: "photo",
      location,
      photoRequestId,
    });
  }

  private savePhotoVisitedPlace(
    description: string,
    photoRequestId: string,
    locationAtCapture?: CurrentLocation | null,
  ): void {
    const location = locationAtCapture ?? this.user.location.getLatest();
    const knownPlace = this.inferKnownPlaceFromText(description);
    const locationName = this.getReadableLocationName(location);
    const name =
      knownPlace?.name ??
      (locationName
        ? this.isCityOnly(locationName)
          ? `Local em ${locationName}`
          : locationName
        : "Local analisado");
    const city = knownPlace?.city ?? this.inferCity(location, description);

    this.user.visitedPlaces.saveVisitedPlace({
      name,
      city,
      category: knownPlace?.category ?? this.inferCategory(description),
      description: this.buildVisitedPlaceDescription(
        description,
        "Guardado automaticamente depois de perguntares o que estavas a ver.",
      ),
      detectedFrom: "photo",
      location,
      photoRequestId,
    });
  }

  private saveMenuVisitedPlace(
    menuTranslation: string,
    photoRequestId: string,
    locationAtCapture?: CurrentLocation | null,
  ): void {
    const location = locationAtCapture ?? this.user.location.getLatest();
    const locationName = this.getReadableLocationName(location);
    const name =
      locationName && !this.isCityOnly(locationName)
        ? `Restaurante perto de ${locationName}`
        : "Restaurante visitado";

    this.user.visitedPlaces.saveVisitedPlace({
      name,
      city: this.inferCity(location, menuTranslation),
      category: "Restaurant",
      description: this.buildVisitedPlaceDescription(
        menuTranslation,
        "Guardado automaticamente depois de traduzir um menu de restaurante.",
      ),
      detectedFrom: "menu",
      location,
      photoRequestId,
    });
  }

  private buildVisitedPlaceDescription(text: string, fallback: string): string {
    if (!this.isUsefulAiText(text)) {
      return fallback;
    }

    return this.firstSentence(text);
  }

  private inferKnownPlaceFromText(
    text: string,
  ): { name: string; city: string; category: string } | null {
    const normalized = text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    if (normalized.includes("estadio do dragao")) {
      return {
        name: "Estádio do Dragão",
        city: "Porto",
        category: "Landmark",
      };
    }

    return null;
  }

  private inferCategory(text: string): string {
    const normalized = text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    if (
      normalized.includes("restaurante") ||
      normalized.includes("cafe") ||
      normalized.includes("menu")
    ) {
      return "Restaurant";
    }

    if (
      normalized.includes("estadio") ||
      normalized.includes("monumento") ||
      normalized.includes("castelo") ||
      normalized.includes("igreja") ||
      normalized.includes("museu")
    ) {
      return "Landmark";
    }

    return "Place";
  }

  private inferCity(location: CurrentLocation | null, text = ""): string {
    const source = `${location?.displayName ?? ""} ${location?.placeName ?? ""} ${text}`;
    const normalized = source
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    if (normalized.includes("porto")) return "Porto";
    if (normalized.includes("lisboa")) return "Lisboa";

    return location?.placeName && this.isCityOnly(location.placeName)
      ? location.placeName
      : "Localização atual";
  }

  private getReadableLocationName(
    location: CurrentLocation | null,
  ): string | null {
    if (location?.placeName) {
      return location.placeName;
    }

    const firstAddressPart = location?.displayName
      ?.split(",")
      .map((part) => part.trim())
      .find(Boolean);

    return firstAddressPart ?? null;
  }

  private isCityOnly(value: string): boolean {
    const normalized = value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    return ["porto", "lisboa"].includes(normalized);
  }

  private isUsefulAiText(text: string): boolean {
    const normalized = text.trim().toLowerCase();

    return (
      normalized.length > 0 &&
      !normalized.startsWith("erro:") &&
      !normalized.startsWith("não consegui") &&
      !normalized.startsWith("nao consegui")
    );
  }

  private firstSentence(text: string): string {
    const trimmed = text.replace(/\s+/g, " ").trim();
    const firstSentence = trimmed.match(/^(.+?[.!?])(\s|$)/)?.[1] ?? trimmed;

    return firstSentence || "Não consegui gerar uma resposta neste momento.";
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
