import { AppSession } from "@mentra/sdk";
import { sessions } from "./sessions";

/**
 * Take a photo and store it via SessionManager
 */
export async function takePhoto(
  session: AppSession,
  userId: string,
  logger: any,
): Promise<void> {
  try {
    const photo = await session.camera.requestPhoto();
    logger.info(`Photo taken for user ${userId}, requestId: ${photo.requestId}`);

    const storedPhoto = {
      requestId: photo.requestId,
      buffer: photo.buffer,
      timestamp: photo.timestamp,
      userId,
      mimeType: photo.mimeType,
      filename: photo.filename,
      size: photo.size,
    };

    sessions.storePhoto(storedPhoto);
    sessions.broadcastPhoto(storedPhoto);

    console.log(`📸 Photo captured for ${userId} (${photo.size} bytes)`);
  } catch (error) {
    logger.error(`Error taking photo: ${error}`);
  }
}
