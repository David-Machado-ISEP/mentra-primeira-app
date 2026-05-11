import type { AppSession } from "@mentra/sdk";
import type { User } from "../session/User";

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
      await this.user.photo.takePhoto();
    });

    session.events.onTouchEvent("double_tap", () => {
      console.log(`[Touch] ${this.user.userId}: double_tap`);
    });

    session.events.onTouchEvent("triple_tap", () => {
  console.log(`[Touch] ${this.user.userId}: triple_tap`);
  console.log(`[Test] ${this.user.userId}: TRIPLE TAP FUNCIONOU`);
});

    session.events.onTouchEvent("long_press", () => {
      console.log(`[Touch] ${this.user.userId}: long_press`);
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