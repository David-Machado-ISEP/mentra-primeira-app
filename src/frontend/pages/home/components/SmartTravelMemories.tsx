import {
  BookOpenText,
  Camera,
  MapPin,
  MessageCircle,
  Sparkles,
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
}

export function SmartTravelMemories({
  photos,
  places,
  transcriptions,
}: SmartTravelMemoriesProps) {
  const finalTranscriptions = transcriptions.filter((item) => item.isFinal);
  const mainPlaces = places.slice(0, 3);
  const latestPhotos = photos.slice(0, 4);
  const highlightText =
    finalTranscriptions[0]?.text ??
    "Ainda sem transcrições finais para enriquecer a memória da viagem.";

  const summary =
    places.length > 0
      ? `Hoje a viagem passou por ${places
          .slice(0, 2)
          .map((place) => place.name)
          .join(
            " e ",
          )}. Foram capturados ${photos.length} momentos e a app começou a construir uma memória organizada da experiência.`
      : `Hoje foram capturados ${photos.length} momentos. À medida que a app reconhecer locais ou menus, este resumo passa a ligar fotos, contexto e lugares visitados.`;

  return (
    <section className="tw-memories-card">
      <div className="tw-memories-header">
        <div>
          <div className="tw-memories-title-row">
            <BookOpenText className="tw-memories-icon" />
            <h2 className="tw-card-title">Smart Travel Memories</h2>
          </div>

          <p className="tw-card-description">
            Resumo automático da experiência diária da viagem.
          </p>
        </div>

        <Badge variant="outline">
          {photos.length + places.length + finalTranscriptions.length} sinais
        </Badge>
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
