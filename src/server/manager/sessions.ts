import { AppSession } from "@mentra/sdk";

/**
 * A photo captured from the glasses, stored in memory.
 *
 * @param requestId - Unique ID for this photo capture
 * @param buffer    - Raw image data
 * @param timestamp - When the photo was taken
 * @param userId    - Who took it
 * @param mimeType  - Image format (e.g. "image/jpeg")
 * @param filename  - Original filename from the SDK
 * @param size      - File size in bytes
 */
export interface StoredPhoto {
  requestId: string;
  buffer: Buffer;
  timestamp: Date;
  userId: string;
  mimeType: string;
  filename: string;
  size: number;
}

/**
 * An SSE (Server-Sent Events) client connection.
 *
 * @param write  - Push a JSON string to this client
 * @param userId - Which user this client belongs to
 * @param close  - Terminate the connection
 */
interface SSEWriter {
  write: (data: string) => void;
  userId: string;
  close: () => void;
}

/**
 * SessionManager — single source of truth for all runtime state.
 *
 * Manages three things:
 * 1. Glasses sessions  — active AppSession connections keyed by userId
 * 2. Photo storage     — in-memory map of captured photos keyed by requestId
 * 3. SSE clients       — frontend connections for real-time photo & transcription streams
 *
 * The router and CameraApp both reference the singleton `sessions` export
 * rather than managing their own state.
 */
export class SessionManager {
  /** Active glasses connections, keyed by userId */
  private sessions: Map<string, AppSession> = new Map();

  /** Captured photos, keyed by requestId */
  private photos: Map<string, StoredPhoto> = new Map();

  /** Connected photo stream SSE clients */
  private photoSSEClients: Set<SSEWriter> = new Set();

  /** Connected transcription stream SSE clients */
  private transcriptionSSEClients: Set<SSEWriter> = new Set();

  // -- Glasses sessions --

  /** Register a glasses connection for a user */
  registerSession(userId: string, session: AppSession): void {
    this.sessions.set(userId, session);
  }

  /** Remove a glasses connection when the user disconnects */
  unregisterSession(userId: string): void {
    this.sessions.delete(userId);
  }

  /** Get the active glasses session for a user (undefined if not connected) */
  getSession(userId: string): AppSession | undefined {
    return this.sessions.get(userId);
  }

  // -- Photo storage --

  /** Save a captured photo to the in-memory store */
  storePhoto(photo: StoredPhoto): void {
    this.photos.set(photo.requestId, photo);
  }

  /** Retrieve a single photo by its requestId */
  getPhoto(requestId: string): StoredPhoto | undefined {
    return this.photos.get(requestId);
  }

  /** Get all photos for a user, sorted newest-first */
  getPhotosByUser(userId: string): StoredPhoto[] {
    return Array.from(this.photos.values())
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  removeAllPhotosByUser(userId: string): void {
    for (const [requestId, photo] of this.photos.entries()) {
      if (photo.userId === userId) {
        this.photos.delete(requestId);
      }
    }
  }

  /** Get the full photos map (used by SSE to send history on connect) */
  getAllPhotos(): Map<string, StoredPhoto> {
    return this.photos;
  }

  // -- SSE client management --

  /** Track a new photo stream SSE client */
  addPhotoSSEClient(client: SSEWriter): void {
    this.photoSSEClients.add(client);
  }

  /** Remove a disconnected photo stream client */
  removePhotoSSEClient(client: SSEWriter): void {
    this.photoSSEClients.delete(client);
  }

  /** Track a new transcription stream SSE client */
  addTranscriptionSSEClient(client: SSEWriter): void {
    this.transcriptionSSEClients.add(client);
  }

  /** Remove a disconnected transcription stream client */
  removeTranscriptionSSEClient(client: SSEWriter): void {
    this.transcriptionSSEClients.delete(client);
  }

  // -- Broadcasting --

  /** Push a new photo to all SSE clients belonging to that photo's user */
  broadcastPhoto(photo: StoredPhoto): void {
    const base64Data = photo.buffer.toString("base64");
    const payload = JSON.stringify({
      requestId: photo.requestId,
      timestamp: photo.timestamp.getTime(),
      mimeType: photo.mimeType,
      filename: photo.filename,
      size: photo.size,
      userId: photo.userId,
      base64: base64Data,
      dataUrl: `data:${photo.mimeType};base64,${base64Data}`,
    });

    for (const client of this.photoSSEClients) {
      if (client.userId === photo.userId) {
        try {
          client.write(payload);
        } catch {
          this.photoSSEClients.delete(client);
        }
      }
    }
  }

  /** Push a transcription event to all SSE clients for that user */
  broadcastTranscription(text: string, isFinal: boolean, userId: string): void {
    const payload = JSON.stringify({
      text,
      isFinal,
      timestamp: Date.now(),
      userId,
    });

    for (const client of this.transcriptionSSEClients) {
      if (client.userId === userId) {
        try {
          client.write(payload);
        } catch {
          this.transcriptionSSEClients.delete(client);
        }
      }
    }
  }

  /** Nuke everything for a user — session, photos, and SSE clients */
  cleanupUser(userId: string): void {
    this.sessions.delete(userId);
    this.removeAllPhotosByUser(userId);

    for (const client of this.photoSSEClients) {
      if (client.userId === userId) this.photoSSEClients.delete(client);
    }
    for (const client of this.transcriptionSSEClients) {
      if (client.userId === userId) this.transcriptionSSEClients.delete(client);
    }
  }
}

/** Singleton — import this everywhere instead of creating new instances */
export const sessions = new SessionManager();
