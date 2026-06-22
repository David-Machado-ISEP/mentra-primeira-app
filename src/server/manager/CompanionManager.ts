export type CompanionInteractionType =
  | "ai"
  | "photo"
  | "translation"
  | "transcription"
  | "triple_tap"
  | "long_press"
  | "recommendation"
  | "itinerary"
  | "voice_question";

export interface CompanionInteraction {
  id: string;
  tripId: string;
  type: CompanionInteractionType;
  title: string;
  content: string;
  createdAt: string;
  source?: string;
  photoId?: string;
}

interface SSEWriter {
  write: (data: string) => void;
  userId: string;
  close: () => void;
}

interface AddCompanionInteractionInput {
  tripId?: string;
  type: CompanionInteractionType;
  title: string;
  content: string;
  source?: string;
  photoId?: string;
}

export class CompanionManager {
  private interactions: CompanionInteraction[] = [];
  private clients = new Set<SSEWriter>();

  constructor(private readonly userId: string) {}

  addInteraction(input: AddCompanionInteractionInput): CompanionInteraction {
    const interaction: CompanionInteraction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      tripId: input.tripId || "current-trip",
      type: input.type,
      title: input.title,
      content: input.content,
      createdAt: this.formatTime(new Date()),
      source: input.source,
      photoId: input.photoId,
    };

    this.interactions.push(interaction);

    if (this.interactions.length > 100) {
      this.interactions = this.interactions.slice(-100);
    }

    console.log(
      `[Companion] ${this.userId}: ${interaction.type} - ${interaction.title}`,
    );

    this.broadcast(interaction, "created");

    return interaction;
  }

  getAll(): CompanionInteraction[] {
    return [...this.interactions];
  }

  addSSEClient(client: SSEWriter): void {
    this.clients.add(client);
  }

  removeSSEClient(client: SSEWriter): void {
    this.clients.delete(client);
  }

  destroy(): void {
    for (const client of this.clients) {
      client.close();
    }

    this.clients.clear();
    this.interactions = [];
  }

  private broadcast(
    interaction: CompanionInteraction,
    event: "created" | "updated",
  ): void {
    const payload = JSON.stringify({
      type: "companion_interaction",
      event,
      interaction,
    });

    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch (error) {
        console.error(`[Companion] ${this.userId}: failed to broadcast`, error);
      }
    }
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString("pt-PT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}
