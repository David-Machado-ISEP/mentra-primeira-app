import type { AppSession } from "@mentra/sdk";
import type { User } from "../session/User";

import { describeImageWithGemini } from "../api/gemini";

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
            console.log(`[Test] ${this.user.userId}: mensagem de teste`);
          }

          // Reset after handling
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
          await this.user.photo.takePhoto();
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
    session.events.onTouchEvent("single_tap", async () => {
  console.log(`[Touch] ${this.user.userId}: single_tap`);
  console.log(
    `[Touch] ${this.user.userId}: single_tap ignorado para evitar spam de fotos`,
  );
});

    session.events.onTouchEvent("double_tap", () => {
      console.log(`[Touch] ${this.user.userId}: double_tap`);
    });

    session.events.onTouchEvent("triple_tap", async () => {
      console.log(`[Touch] ${this.user.userId}: triple_tap`);
      console.log(`[Test] ${this.user.userId}: TRIPLE TAP FUNCIONOU`);

      let photo = null;

try {
  photo = await this.user.photo.takePhoto({ bypassCooldown: true });
} catch (error) {
  console.error(
    `[Touch] ${this.user.userId}: failed to take photo for UC05`,
    error,
  );
}

if (!photo) {
  console.log(`[UC05] ${this.user.userId}: não foi possível obter a foto`);
  return;
}

const imageBase64 = photo.buffer.toString("base64");

let description = "";

try {
  description = await describeImageWithGemini(
    imageBase64,
    photo.mimeType || "image/jpeg",
  );

  console.log(`[UC05] ${this.user.userId}: Gemini description:`, description);
} catch (error) {
  console.error(
    `[UC05] ${this.user.userId}: failed to describe image with Gemini`,
    error,
  );

  description =
    "Não consegui analisar a imagem neste momento. Tenta novamente daqui a pouco.";
}

      try {
  const shortDescription = description.split(". ")[0] + ".";
await this.user.audio.speak(shortDescription);
} catch (error) {
  console.error(
    `[Touch] ${this.user.userId}: failed to speak UC05 description`,
    error,
  );
}

      /*this.user.visitedPlaces.saveVisitedPlace({
        name: "Estádio do Dragão",
        city: "Porto",
        category: "Landmark",
        description:
          "Guardado automaticamente após a análise simulada do que o utilizador estava a ver.",
        detectedFrom: "photo",
      });*/
    });

    session.events.onTouchEvent("long_press", async () => {
      console.log(`[Touch] ${this.user.userId}: long_press`);
      console.log(`[UC14] ${this.user.userId}: translate restaurant menu`);

      try {
        await this.user.photo.takePhoto({ bypassCooldown: true });
      } catch (error) {
        console.error(
          `[Touch] ${this.user.userId}: failed to take photo for UC14`,
          error,
        );
      }

      try {
        await this.user.audio.speak(RESTAURANT_MENU_TRANSLATION);
      } catch (error) {
        console.error(
          `[Touch] ${this.user.userId}: failed to speak UC14 menu translation`,
          error,
        );
      }

      this.user.visitedPlaces.saveVisitedPlace({
        name: "Restaurante no Porto",
        city: "Porto",
        category: "Restaurant",
        description:
          "Guardado automaticamente depois da tradução simulada de um menu de restaurante.",
        detectedFrom: "menu",
      });
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
}
