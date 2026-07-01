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
import { VoiceQuestionManager } from "../manager/VoiceQuestionManager";
import { VoicePhotoCommandManager } from "../manager/VoicePhotoCommandManager";

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

  /** Voice questions asked through glasses or Companion */
  voiceQuestion: VoiceQuestionManager;

  /** Voice command to take photos hands-free */
  voicePhotoCommand: VoicePhotoCommandManager;

  private translationTargetLanguage = "English";

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
    this.voiceQuestion = new VoiceQuestionManager(this);
    this.voicePhotoCommand = new VoicePhotoCommandManager(this);
  }

  setTranslationTargetLanguage(language: string): void {
    this.translationTargetLanguage = language || "English";
  }

  getTranslationTargetLanguage(): string {
    return this.translationTargetLanguage;
  }

  /** Wire up a glasses connection — sets up all event listeners */
  setAppSession(session: AppSession): void {
    this.appSession = session;
    this.location.setup(session);
    this.transcription.setup(session);
    this.input.setup(session);
    console.log(`📸 Camera ready for ${this.userId}`);
  }

  /** Disconnect glasses but keep user alive (photos, SSE clients stay) */
  clearAppSession(): void {
    this.location.destroy();
    this.transcription.destroy();
    this.voiceQuestion.destroy();
    this.voicePhotoCommand.destroy();
    this.appSession = null;
  }

  /** Nuke everything — call on full disconnect */
  cleanup(): void {
    this.location.destroy();
    this.transcription.destroy();
    this.photo.destroy();
    this.visitedPlaces.destroy();
    this.voiceQuestion.destroy();
    this.voicePhotoCommand.destroy();
    this.appSession = null;
    this.visualDiscoveries.destroy();
    this.companion.destroy();
  }
}
