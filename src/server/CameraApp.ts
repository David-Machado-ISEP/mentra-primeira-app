/**
 * CameraApp - Photo capture and audio playback for MentraOS glasses
 *
 * Main application class that extends MentraOS AppServer.
 * Handles session lifecycle, photo capture, transcription, and button events.
 */

import { AppServer, AppSession } from "@mentra/sdk";
import { setupButtonHandler } from "./event/button";
import { takePhoto } from "./modules/photo";
import { setupTranscription } from "./modules/transcription";
import {
  registerSession,
  unregisterSession,
  broadcastTranscriptionToClients,
} from "./api/router";

interface StoredPhoto {
  requestId: string;
  buffer: Buffer;
  timestamp: Date;
  userId: string;
  mimeType: string;
  filename: string;
  size: number;
}

export interface CameraAppConfig {
  packageName: string;
  apiKey: string;
  port: number;
  cookieSecret?: string;
}

export class CameraApp extends AppServer {
  private photosMap: Map<string, StoredPhoto> = new Map();

  constructor(config: CameraAppConfig) {
    super({
      packageName: config.packageName,
      apiKey: config.apiKey,
      port: config.port,
      cookieSecret: config.cookieSecret,
    });
  }

  /** Get the photos map (for API routes) */
  getPhotosMap(): Map<string, StoredPhoto> {
    return this.photosMap;
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

    // Register this session for audio playback from the frontend
    registerSession(userId, session);

    // Set up transcription to log all speech-to-text
    setupTranscription(
      session,
      (finalText) => {
        console.log(`✅ Final transcription (user ${userId}): ${finalText}`);
        broadcastTranscriptionToClients(finalText, true, userId);
      },
      (partialText) => {
        console.log(`⏳ Partial transcription (user ${userId}): ${partialText}`);
        broadcastTranscriptionToClients(partialText, false, userId);
      },
    );

    // Register handler for touch events
    session.events.onTouchEvent((event) => {
      console.log(`Touch event: ${event.gesture_name}`);
    });

    // Listen for button presses on the glasses
    setupButtonHandler(session, userId, console, (s, u) =>
      takePhoto(s, u, console, this.photosMap),
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
    unregisterSession(userId);
  }
}
