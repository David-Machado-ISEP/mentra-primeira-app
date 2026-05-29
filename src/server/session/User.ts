import { AppSession } from "@mentra/sdk";
import { PhotoManager } from "../manager/PhotoManager";
import { TranscriptionManager } from "../manager/TranscriptionManager";
import { AudioManager } from "../manager/AudioManager";
import { StorageManager } from "../manager/StorageManager";
import { InputManager } from "../manager/InputManager";
import { VisitedPlacesManager } from "../manager/VisitedPlacesManager";
import { LocationManager } from "../manager/LocationManager";
import { VisualDiscoveriesManager } from "../manager/VisualDiscoveriesManager";
import { CompanionManager } from "../manager/CompanionManager";

/**
 * User — per-user state container.
 *
 * Composes all managers and holds the glasses AppSession.
 * Created when a user connects (glasses or webview) and
 * destroyed when the session is cleaned up.
 */
export class User {
  /** Active glasses connection, null when webview-only */
  appSession: AppSession | null = null;

  /** Photo capture, storage, and SSE broadcasting */
  photo: PhotoManager;

  /** Speech-to-text listener and SSE broadcasting */
  transcription: TranscriptionManager;

  /** Text-to-speech and audio control */
  audio: AudioManager;

  /** User preferences via MentraOS Simple Storage */
  storage: StorageManager;

  /** Button presses and touchpad gestures */
  input: InputManager;

  /** Automatically detected visited places */
  visitedPlaces: VisitedPlacesManager;

  /** Current GPS/location updates from MentraOS */
  location: LocationManager;

  /** Visual discoveries saved from UC05 triple tap */
  visualDiscoveries: VisualDiscoveriesManager;

  /** Companion timeline events */
  companion: CompanionManager;

  /** Repeating voice message timer */
  private reminderInterval: ReturnType<typeof setInterval> | null = null;

  constructor(public readonly userId: string) {
    this.photo = new PhotoManager(this);
    this.transcription = new TranscriptionManager(this);
    this.audio = new AudioManager(this);
    this.storage = new StorageManager(this);
    this.input = new InputManager(this);
    this.visitedPlaces = new VisitedPlacesManager(this);
    this.location = new LocationManager(this);
    this.visualDiscoveries = new VisualDiscoveriesManager(this.userId);
    this.companion = new CompanionManager(this.userId);
  }

  /** Wire up a glasses connection — sets up all event listeners */
  setAppSession(session: AppSession): void {
    this.appSession = session;
    this.location.setup(session);
    this.transcription.setup(session);
    this.input.setup(session);
    this.startReminderInterval();
    console.log(`📸 Camera ready for ${this.userId}`);
  }

  /** Start a repeating TTS test message every 1 minute */
  private startReminderInterval(): void {
    this.stopReminderInterval();

    this.reminderInterval = setInterval(async () => {
      if (!this.appSession) return;

      try {
        console.log(`[Reminder] ${this.userId}: a dizer mensagem de teste`);
        await this.audio.speak("Olá, como estás?");
      } catch (error) {
        console.error(
          `[Reminder] ${this.userId}: erro ao reproduzir mensagem`,
          error,
        );
      }
    }, 1200_000);
  }

  /** Stop the repeating TTS timer */
  private stopReminderInterval(): void {
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
      this.reminderInterval = null;
    }
  }

  /** Disconnect glasses but keep user alive (photos, SSE clients stay) */
  clearAppSession(): void {
    this.stopReminderInterval();
    this.location.destroy();
    this.transcription.destroy();
    this.appSession = null;
  }

  /** Nuke everything — call on full disconnect */
  cleanup(): void {
    this.stopReminderInterval();
    this.location.destroy();
    this.transcription.destroy();
    this.photo.destroy();
    this.visitedPlaces.destroy();
    this.appSession = null;
    this.visualDiscoveries.destroy();
    this.companion.destroy();
  }
}
