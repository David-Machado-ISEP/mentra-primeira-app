import { AppSession } from "@mentra/sdk";

/**
 * Text-to-speech — converts text to spoken audio on the glasses.
 *
 * @param text    - The text to speak
 * @param session - Active glasses connection
 * @param userId  - Who should hear it
 * @param logger  - For error logging
 */
export async function speak(
  text: string,
  session: AppSession,
  userId: string,
  logger: any,
): Promise<void> {
  try {
    await session.audio.speak(text);
  } catch (error) {
    logger.error(`Error speaking for user ${userId}: ${error}`);
  }
}
