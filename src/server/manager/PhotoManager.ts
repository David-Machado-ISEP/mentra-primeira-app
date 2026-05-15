import type { User } from "../session/User";

export interface StoredPhoto {
  requestId: string;
  buffer: Buffer;
  timestamp: Date;
  userId: string;
  mimeType: string;
  filename: string;
  size: number;
}

interface SSEWriter {
  write: (data: string) => void;
  userId: string;
  close: () => void;
}

interface TakePhotoOptions {
  bypassCooldown?: boolean;
}

/**
 * PhotoManager — captures, stores, and broadcasts photos for a single user.
 */
export class PhotoManager {
  private photos: Map<string, StoredPhoto> = new Map();
  private sseClients: Set<SSEWriter> = new Set();

  /**
   * Prevents multiple photo requests from running at the same time.
   */
  private isCapturing = false;

  /**
   * Prevents repeated photo requests too close together.
   */
  private lastCaptureAt = 0;
  private readonly captureCooldownMs = 3000;

  constructor(private user: User) {}

  private async wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

  /** Capture a photo from the glasses and store + broadcast it */
  async takePhoto(options: TakePhotoOptions = {}): Promise<StoredPhoto | null> {
    const session = this.user.appSession;
    if (!session) throw new Error("No active glasses session");

    const now = Date.now();

    if (this.isCapturing) {
      console.log(
        `[Photo] ${this.user.userId}: ignored photo request — camera is already capturing`,
      );
      return null;
    }

    const timeSinceLastCapture = now - this.lastCaptureAt;

    if (
      !options.bypassCooldown &&
      timeSinceLastCapture < this.captureCooldownMs
    ) {
      const remainingMs = this.captureCooldownMs - timeSinceLastCapture;

      console.log(
        `[Photo] ${this.user.userId}: ignored photo request — cooldown active (${Math.ceil(
          remainingMs / 1000,
        )}s left)`,
      );

      return null;
    }

    this.isCapturing = true;
    this.lastCaptureAt = now;

    try {
      console.log(`[Photo] ${this.user.userId}: requesting photo...`);

let photo;

try {
  photo = await session.camera.requestPhoto();
} catch (firstError) {
  console.warn(
    `[Photo] ${this.user.userId}: first photo request failed, retrying once...`,
    firstError,
  );

  await this.wait(1000);

  photo = await session.camera.requestPhoto();
}

      const stored: StoredPhoto = {
        requestId: photo.requestId,
        buffer: photo.buffer,
        timestamp: photo.timestamp,
        userId: this.user.userId,
        mimeType: photo.mimeType,
        filename: photo.filename,
        size: photo.size,
      };

      this.photos.set(photo.requestId, stored);
      this.broadcastPhoto(stored);

      console.log(
        `📸 Photo captured for ${this.user.userId} (${photo.size} bytes)`,
      );
      return stored;
    } catch (error) {
      console.error(
        `[Photo] ${this.user.userId}: failed to capture photo`,
        error,
      );
      return null;
    } finally {
      this.isCapturing = false;
    }
  }

  /** Push a photo to all connected SSE clients */
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

    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  getPhoto(requestId: string): StoredPhoto | undefined {
    return this.photos.get(requestId);
  }

  /** All photos for this user, sorted newest-first */
  getAll(): StoredPhoto[] {
    return Array.from(this.photos.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  }

  /** The full photos map (used by SSE to send history on connect) */
  getAllMap(): Map<string, StoredPhoto> {
    return this.photos;
  }

  removeAll(): void {
    this.photos.clear();
  }

  addSSEClient(client: SSEWriter): void {
    this.sseClients.add(client);
  }

  removeSSEClient(client: SSEWriter): void {
    this.sseClients.delete(client);
  }

  /** Tear down — clear photos and SSE clients */
  destroy(): void {
    this.photos.clear();
    this.sseClients.clear();
    this.isCapturing = false;
    this.lastCaptureAt = 0;
  }
}
