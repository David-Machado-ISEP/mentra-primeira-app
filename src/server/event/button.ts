import { AppSession } from "@mentra/sdk";

/**
 * Register button press handlers for a glasses session.
 *
 * @param session            - Active glasses connection
 * @param userId             - Who's wearing the glasses
 * @param logger             - For logging button events
 * @param takePhotoCallback  - Called on quick press to capture a photo
 */
export function setupButtonHandler(
  session: AppSession,
  userId: string,
  logger: any,
  takePhotoCallback: (session: AppSession, userId: string) => Promise<void>,
): void {
  session.events.onButtonPress(async (button) => {
    logger.info(`Button pressed: ${button.buttonId}, type: ${button.pressType}`);

    // Long press — reserved for future use (e.g. video streaming toggle)
    if (button.pressType === "long") {
      return;
    }

    // Quick press — take a photo
    await takePhotoCallback(session, userId);
  });
}
