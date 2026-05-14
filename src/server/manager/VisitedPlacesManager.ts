import type { User } from "../session/User";

export interface VisitedPlace {
  id: string;
  name: string;
  city: string;
  category: string;
  description: string;
  detectedFrom: "photo" | "menu" | "manual";
  timestamp: number;
}

interface VisitedPlaceInput {
  name: string;
  city: string;
  category: string;
  description: string;
  detectedFrom: VisitedPlace["detectedFrom"];
}

interface SSEWriter {
  write: (data: string) => void;
  userId: string;
  close: () => void;
}

/**
 * VisitedPlacesManager — stores and broadcasts automatically detected places.
 */
export class VisitedPlacesManager {
  private places: Map<string, VisitedPlace> = new Map();
  private sseClients: Set<SSEWriter> = new Set();

  constructor(private user: User) {}

  saveVisitedPlace(place: VisitedPlaceInput): VisitedPlace {
    const id = this.slugify(`${place.name}-${place.city}`);
    const existing = this.places.get(id);

    const visitedPlace: VisitedPlace = {
      id,
      ...place,
      timestamp: Date.now(),
    };

    this.places.set(id, visitedPlace);
    this.broadcast(visitedPlace, existing ? "updated" : "created");

    console.log(
      `[VisitedPlaces] ${this.user.userId}: ${existing ? "updated" : "saved"} ${place.name}`,
    );

    return visitedPlace;
  }

  getAll(): VisitedPlace[] {
    return Array.from(this.places.values()).sort(
      (a, b) => b.timestamp - a.timestamp,
    );
  }

  addSSEClient(client: SSEWriter): void {
    this.sseClients.add(client);
  }

  removeSSEClient(client: SSEWriter): void {
    this.sseClients.delete(client);
  }

  destroy(): void {
    this.places.clear();
    this.sseClients.clear();
  }

  private broadcast(place: VisitedPlace, event: "created" | "updated"): void {
    const payload = JSON.stringify({
      type: "visited_place",
      event,
      place,
    });

    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  private slugify(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
}
