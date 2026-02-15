import type { User } from "../session/User";

/**
 * Register button press handlers for a user's glasses session.
 *
 * @param user - The user whose glasses to listen on
 */
export function setupButtonHandler(user: User): void {
  const session = user.appSession;
  if (!session) return;

  session.events.onButtonPress(async (button) => {
    console.log(`[Button] ${user.userId}: ${button.buttonId} (${button.pressType})`);

    // Long press — reserved for future use
    if (button.pressType === "long") {
      return;
    }

    // Quick press — take a photo
    await user.photo.takePhoto();
  });
}
