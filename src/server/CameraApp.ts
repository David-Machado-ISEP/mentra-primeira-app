/**
 * CameraApp - Photo capture and audio playback for MentraOS glasses
 *
 * Main application class that extends MentraOS AppServer.
 * Handles session lifecycle, photo capture, transcription, and button events.
 */

import { AppServer, AppSession } from "@mentra/sdk";
import { setupButtonHandler } from "./event/button";
import { takePhoto } from "./manager/photo";
import { setupTranscription } from "./manager/transcription";
import { sessions } from "./manager/sessions";

export interface CameraAppConfig {
  packageName: string;
  apiKey: string;
  port: number;
  cookieSecret?: string;
}

export class CameraApp extends AppServer {
  constructor(config: CameraAppConfig) {
    super({
      packageName: config.packageName,
      apiKey: config.apiKey,
      port: config.port,
      cookieSecret: config.cookieSecret,
    });
  }

  /**
   * Called when a user launches the app on their glasses
   */
  protected async onSession(
    session: AppSession,
    sessionId: string,
    userId: string,
  ): Promise<void> {
    console.log(`📸 Camera session started for ${userId}`);

    sessions.registerSession(userId, session);

    setupTranscription(
      session,
      (finalText) => {
        console.log(`✅ Final transcription (user ${userId}): ${finalText}`);
        sessions.broadcastTranscription(finalText, true, userId);
      },
      (partialText) => {
        console.log(`⏳ Partial transcription (user ${userId}): ${partialText}`);
        sessions.broadcastTranscription(partialText, false, userId);
      },
    );

    session.events.onTouchEvent((event) => {
      console.log(`Touch event: ${event.gesture_name}`);
    });

    setupButtonHandler(session, userId, console, (s, u) =>
      takePhoto(s, u, console),
    );

    console.log(`✅ Camera ready for ${userId}`);
  }

  /**
   * Called when a user closes the app or disconnects
   */
  protected async onStop(
    sessionId: string,
    userId: string,
    reason: string,
  ): Promise<void> {
    console.log(`👋 Camera session ended for ${userId}: ${reason}`);
    try{
     sessions.cleanupUser(userId);
     console.log(`Cleaned up session for ${userId}`);
    }
    catch(err){
      console.error(`Error during session cleanup for ${userId}:`, err);
    }
  }
}
