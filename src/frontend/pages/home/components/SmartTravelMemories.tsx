import {
  BookOpenText,
  Camera,
  MapPin,
  MessageCircle,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Badge } from "../../../components/ui";

import type { Photo } from "./PhotoStream";
import type { Transcription } from "./TranscriptionFeed";
import type { VisitedPlace } from "./VisitedPlacesPanel";

import "../estilo/HomePage.css";

interface SmartTravelMemoriesProps {
  photos: Photo[];
  places: VisitedPlace[];
  transcriptions: Transcription[];
  userId: string;
  onLog: (
    message: string,
    type?: "info" | "success" | "warning" | "error",
  ) => void;
}

export function SmartTravelMemories({
  photos,
  places,
  transcriptions,
  userId,
  onLog,
}: SmartTravelMemoriesProps) {
  const finalTranscriptions = transcriptions.filter((item) => item.isFinal);
  const mainPlaces = places.slice(0, 3);
  const latestPhotos = photos.slice(0, 4);
  const highlightText =
    finalTranscriptions[0]?.text ??
    "Ainda sem transcrições finais para enriquecer a memória da viagem.";

  const memoryTitle =
    places.length > 0
      ? `Memória de viagem: ${places
          .slice(0, 2)
          .map((place) => place.name)
          .join(" & ")}`
      : "Memória do dia";

  const photoText =
    photos.length === 1
      ? "foi capturado 1 momento"
      : `foram capturados ${photos.length} momentos`;

  const placeText =
    places.length === 1
      ? `passaste por ${places[0].name}`
      : places.length > 1
        ? `passaste por ${places
            .slice(0, 3)
            .map((place) => place.name)
            .join(", ")}`
        : "";

  const contextText =
    finalTranscriptions.length > 0
      ? "com algum contexto recolhido pelas transcrições da viagem"
      : "ainda sem muito contexto adicional";

  const summary =
    places.length > 0
      ? `Hoje ${placeText} e ${photoText}. A app começou a organizar estes sinais numa memória da experiência, ${contextText}.`
      : `Hoje ${photoText}. À medida que forem reconhecidos locais, menus ou descrições visuais, esta memória ficará mais completa.`;

  const speakMemorySummary = async () => {
    try {
      const textToSpeak = `${memoryTitle}. ${summary}`;

      const response = await fetch("/api/speak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: textToSpeak,
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to speak memory summary");
      }

      onLog("Travel memory spoken by audio", "success");
    } catch (error) {
      console.error("[SmartTravelMemories] Failed to speak memory", error);
      onLog("Failed to speak travel memory", "error");
    }
  };

  return (
    <section className="tw-memories-card">
      <div className="tw-memories-header">
        <div>
          <div className="tw-memories-title-row">
            <BookOpenText className="tw-memories-icon" />
            <h2 className="tw-card-title">Smart Travel Memories</h2>
          </div>

          <p className="tw-memory-title">{memoryTitle}</p>

          <p className="tw-card-description">
            Resumo automático da experiência diária da viagem.
          </p>
        </div>

        <div className="tw-memories-header-actions">
          <button
            type="button"
            className="tw-memory-audio-button"
            onClick={speakMemorySummary}
            aria-label="Ouvir memória da viagem"
            title="Ouvir memória da viagem"
          >
            <Volume2 className="tw-memory-audio-icon" />
          </button>

          <Badge variant="outline">
            {photos.length + places.length + finalTranscriptions.length} sinais
          </Badge>
        </div>
      </div>

      <div className="tw-memories-summary">
        <Sparkles className="tw-memories-summary-icon" />
        <p>{summary}</p>
      </div>

      <div className="tw-memories-grid">
        <article className="tw-memory-metric">
          <Camera className="tw-memory-metric-icon" />
          <span>Fotos</span>
          <strong>{photos.length}</strong>
        </article>

        <article className="tw-memory-metric">
          <MapPin className="tw-memory-metric-icon" />
          <span>Locais</span>
          <strong>{places.length}</strong>
        </article>

        <article className="tw-memory-metric">
          <MessageCircle className="tw-memory-metric-icon" />
          <span>Contexto</span>
          <strong>{finalTranscriptions.length}</strong>
        </article>
      </div>

      <div className="tw-memory-section">
        <h3>Highlights do dia</h3>

        {mainPlaces.length === 0 ? (
          <p className="tw-memory-muted">
            Os locais principais vão aparecer aqui quando forem guardados
            automaticamente.
          </p>
        ) : (
          <div className="tw-memory-place-list">
            {mainPlaces.map((place) => (
              <span key={place.id} className="tw-memory-place-chip">
                {place.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="tw-memory-section">
        <h3>Contexto capturado</h3>
        <p className="tw-memory-muted">{highlightText}</p>
      </div>

      {latestPhotos.length > 0 && (
        <div className="tw-memory-photo-strip">
          {latestPhotos.map((photo) => (
            <img
              key={photo.id}
              src={photo.url}
              alt={`Travel memory captured at ${photo.timestamp}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
