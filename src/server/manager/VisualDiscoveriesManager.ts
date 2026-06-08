import type { MemoryImageCategory } from "../api/gemini";

interface SSEWriter {
  write: (data: string) => void;
  userId: string;
  close: () => void;
}

export type VisualDiscoverySource = "single_tap" | "double_press" | "triple_tap";

export interface VisualDiscovery {
  id: string;
  userId: string;
  photoRequestId: string;
  photoDataUrl: string;
  description: string;
  timestamp: string;
  source: VisualDiscoverySource;
  aiCategory?: MemoryImageCategory;
  aiTags?: string[];
  aiConfidence?: number;
}

export class VisualDiscoveriesManager {
  private discoveries: VisualDiscovery[] = [];
  private sseClients: Set<SSEWriter> = new Set();

  constructor(private userId: string) {}

  addDiscovery(discovery: Omit<VisualDiscovery, "id" | "userId" | "timestamp">) {
    const item: VisualDiscovery = {
      id: crypto.randomUUID(),
      userId: this.userId,
      timestamp: new Date().toLocaleString(),
      ...discovery,
    };

    this.discoveries.unshift(item);
    this.broadcast(item);

    console.log(
      `[VisualDiscoveries] ${this.userId}: saved discovery from ${item.source}`,
    );

    return item;
  }

  getAll(): VisualDiscovery[] {
    return this.discoveries;
  }

  addSSEClient(client: SSEWriter): void {
    this.sseClients.add(client);
  }

  removeSSEClient(client: SSEWriter): void {
    this.sseClients.delete(client);
  }

  private broadcast(discovery: VisualDiscovery): void {
    const payload = JSON.stringify({
      type: "visual_discovery",
      discovery,
    });

    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  destroy(): void {
    this.discoveries = [];
    this.sseClients.clear();
  }
}
