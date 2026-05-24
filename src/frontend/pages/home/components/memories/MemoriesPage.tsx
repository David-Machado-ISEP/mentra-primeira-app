import { useMemo } from "react";
import {
  Building2,
  Camera,
  Filter,
  Image as ImageIcon,
  Landmark,
  Map as MapIcon,
  Moon,
  Mountain,
  Plane,
  Search,
  Sparkles,
  Utensils,
  Volume2,
} from "lucide-react";

import type { Photo } from "../PhotoStream";
import type { VisitedPlace } from "../VisitedPlacesPanel";
import type { Transcription } from "../TranscriptionFeed";
import { AlbumBuilder } from "../AlbumBuilder";
import { AlbumCard } from "./AlbumCard";
import { CollectionCard } from "./CollectionCard";
import { MemoryCard } from "./MemoryCard";
import { MemoryMapSection } from "./MemoryMapSection";
import { PhotoTimeline } from "./PhotoTimeline";

interface VisualDiscovery {
  id: string;
  userId: string;
  photoRequestId: string;
  photoDataUrl: string;
  description: string;
  timestamp: string;
  source: "triple_tap";
}

interface PastTrip {
  id: string;
  name: string;
  locationLabel: string;
  startedAt: string;
  endedAt: string;
  photoCount: number;
  visitedPlacesCount: number;
  coverPhotoUrl?: string;
}

interface MemoriesPageProps {
  photos: Photo[];
  places: VisitedPlace[];
  transcriptions: Transcription[];
  visualDiscoveries: VisualDiscovery[];
  pastTrips: PastTrip[];
  currentTripName: string;
  currentTripLocation: string;
  selectedPhotoIds: string[];
  selectedPastTripIds: string[];
  isDeletingPastTrips: boolean;
  userId: string;
  onTogglePhoto: (photoId: string) => void;
  onClearPhotoSelection: () => void;
  onLog: (
    message: string,
    type?: "info" | "success" | "warning" | "error",
  ) => void;
  onTogglePastTripSelection: (tripId: string) => void;
  onStartPastTripsDeleteMode: () => void;
  onCancelPastTripsDeleteMode: () => void;
  onDeleteSelectedPastTrips: () => void;
}

const getCountLabel = (count: number, singular: string, plural: string) => {
  return `${count} ${count === 1 ? singular : plural}`;
};

const matchesText = (value: string | undefined, patterns: string[]) => {
  const normalizedValue = value?.toLowerCase() ?? "";
  return patterns.some((pattern) => normalizedValue.includes(pattern));
};

export function MemoriesPage({
  photos,
  places,
  transcriptions,
  visualDiscoveries,
  pastTrips,
  currentTripName,
  currentTripLocation,
  selectedPhotoIds,
  selectedPastTripIds,
  isDeletingPastTrips,
  userId,
  onTogglePhoto,
  onClearPhotoSelection,
  onLog,
  onTogglePastTripSelection,
  onStartPastTripsDeleteMode,
  onCancelPastTripsDeleteMode,
  onDeleteSelectedPastTrips,
}: MemoriesPageProps) {
  const coverPhotoUrl =
    photos[0]?.url ?? visualDiscoveries[0]?.photoDataUrl ?? pastTrips[0]?.coverPhotoUrl;
  const latestPhotoUrl = photos[0]?.url ?? visualDiscoveries[0]?.photoDataUrl;
  const tripCount = pastTrips.length + (photos.length > 0 || places.length > 0 ? 1 : 0);
  const cityCount = new Set(places.map((place) => place.city).filter(Boolean)).size;
  const finalTranscriptions = transcriptions.filter((item) => item.isFinal);

  const automaticCollections = useMemo(() => {
    const restaurants = places.filter((place) =>
      matchesText(`${place.category} ${place.name} ${place.description}`, [
        "food",
        "restaurant",
        "restaurante",
        "menu",
        "comida",
        "café",
      ]),
    ).length;
    const monuments = places.filter((place) =>
      matchesText(`${place.category} ${place.name} ${place.description}`, [
        "monument",
        "monumento",
        "history",
        "história",
        "castelo",
        "igreja",
      ]),
    ).length;
    const nature = places.filter((place) =>
      matchesText(`${place.category} ${place.name} ${place.description}`, [
        "nature",
        "natureza",
        "garden",
        "jardim",
        "view",
        "miradouro",
      ]),
    ).length;
    const museums = places.filter((place) =>
      matchesText(`${place.category} ${place.name} ${place.description}`, [
        "museum",
        "museu",
        "gallery",
      ]),
    ).length;
    const menuTranslations = places.filter(
      (place) => place.detectedFrom === "menu",
    ).length;

    return [
      {
        title: "Viagens",
        countLabel: getCountLabel(tripCount, "viagem", "viagens"),
        icon: Plane,
        coverUrl: coverPhotoUrl,
        accent: "blue" as const,
      },
      {
        title: "Restaurantes",
        countLabel: getCountLabel(restaurants, "local", "locais"),
        icon: Utensils,
        coverUrl: latestPhotoUrl,
        accent: "amber" as const,
      },
      {
        title: "Monumentos",
        countLabel: getCountLabel(monuments, "local", "locais"),
        icon: Landmark,
        coverUrl: latestPhotoUrl,
        accent: "violet" as const,
      },
      {
        title: "Natureza",
        countLabel: getCountLabel(nature, "local", "locais"),
        icon: Mountain,
        coverUrl: latestPhotoUrl,
        accent: "green" as const,
      },
      {
        title: "Museus",
        countLabel: getCountLabel(museums, "local", "locais"),
        icon: Building2,
        coverUrl: latestPhotoUrl,
        accent: "blue" as const,
      },
      {
        title: "Menus traduzidos",
        countLabel: getCountLabel(menuTranslations, "menu", "menus"),
        icon: ImageIcon,
        coverUrl: latestPhotoUrl,
        accent: "green" as const,
      },
      {
        title: "Noite",
        countLabel: "Coleção automática",
        icon: Moon,
        coverUrl: latestPhotoUrl,
        accent: "violet" as const,
      },
      {
        title: "Descobertas AI",
        countLabel: getCountLabel(visualDiscoveries.length, "descoberta", "descobertas"),
        icon: Sparkles,
        coverUrl: visualDiscoveries[0]?.photoDataUrl ?? latestPhotoUrl,
        accent: "blue" as const,
      },
    ];
  }, [coverPhotoUrl, latestPhotoUrl, places, tripCount, visualDiscoveries]);

  const albums = useMemo(() => {
    const currentAlbum =
      photos.length > 0 || places.length > 0
        ? [
            {
              id: "current-trip",
              title: currentTripName,
              dateLabel: "Viagem atual",
              photoCount: photos.length,
              placeCount: places.length,
              coverUrl: coverPhotoUrl,
            },
          ]
        : [];

    const pastTripAlbums = pastTrips.map((trip) => ({
      id: trip.id,
      title: trip.name,
      dateLabel: trip.endedAt ? `Terminada em ${trip.endedAt}` : trip.startedAt,
      photoCount: trip.photoCount,
      placeCount: trip.visitedPlacesCount,
      coverUrl: trip.coverPhotoUrl,
    }));

    const cityAlbums = Array.from(
      places.reduce((acc, place) => {
        if (!place.city) return acc;
        const current = acc.get(place.city) ?? {
          id: `city-${place.city}`,
          title: place.city,
          dateLabel: "Coleção por cidade",
          photoCount: photos.length,
          placeCount: 0,
          coverUrl: coverPhotoUrl,
        };

        current.placeCount += 1;
        acc.set(place.city, current);
        return acc;
      }, new Map<string, {
        id: string;
        title: string;
        dateLabel: string;
        photoCount: number;
        placeCount: number;
        coverUrl?: string;
      }>()),
    ).map(([, album]) => album);

    return [...currentAlbum, ...pastTripAlbums, ...cityAlbums].slice(0, 6);
  }, [coverPhotoUrl, currentTripName, pastTrips, photos.length, places]);

  const memoryTitle =
    places.length > 0
      ? `Memória de ${places
          .slice(0, 2)
          .map((place) => place.name)
          .join(" & ")}`
      : "Memória do dia";

  const placeText =
    places.length === 1
      ? `Passaste por ${places[0].name}.`
      : places.length > 1
        ? `Passaste por ${places
            .slice(0, 3)
            .map((place) => place.name)
            .join(", ")}.`
        : "Os lugares visitados vão enriquecer esta memória à medida que forem guardados.";

  const photoText =
    photos.length === 1
      ? "Foi capturado 1 momento."
      : photos.length > 1
        ? `Foram capturados ${photos.length} momentos.`
        : "Ainda sem fotografias nesta memória.";

  const contextText =
    finalTranscriptions[0]?.text ??
    visualDiscoveries[0]?.description ??
    "Quando houver transcrições, traduções ou descrições visuais, o contexto da viagem aparece aqui.";

  const smartMemorySummary = `${placeText} ${photoText}`;
  const signalCount =
    photos.length + places.length + finalTranscriptions.length + visualDiscoveries.length;

  const speakMemorySummary = async () => {
    try {
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: `${memoryTitle}. ${smartMemorySummary}`,
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to speak memory summary");
      }

      onLog("Travel memory spoken by audio", "success");
    } catch (error) {
      console.error("[MemoriesPage] Failed to speak memory", error);
      onLog("Failed to speak travel memory", "error");
    }
  };

  return (
    <section className="mp-page" aria-label="Memórias da viagem">
      <header className="mp-header">
        <div>
          <p className="mp-kicker">Galeria de viagem</p>
          <h1>Memórias</h1>
          <p>
            Fotos, locais e contexto organizados automaticamente durante a tua
            experiência.
          </p>
        </div>

        <div className="mp-header-actions">
          <button type="button" className="mp-icon-button" aria-label="Pesquisar memórias">
            <Search className="mp-icon-button-svg" />
          </button>
          <button type="button" className="mp-icon-button" aria-label="Filtrar memórias">
            <Filter className="mp-icon-button-svg" />
          </button>
        </div>
      </header>

      <section className="mp-stats" aria-label="Resumo das memórias">
        <article className="mp-stat">
          <span className="mp-stat-icon-wrap mp-stat-blue">
            <Camera className="mp-stat-icon" />
          </span>
          <strong>{photos.length}</strong>
          <span>Fotos</span>
        </article>

        <article className="mp-stat">
          <span className="mp-stat-icon-wrap mp-stat-violet">
            <Plane className="mp-stat-icon" />
          </span>
          <strong>{tripCount}</strong>
          <span>Viagens</span>
        </article>

        <article className="mp-stat">
          <span className="mp-stat-icon-wrap mp-stat-green">
            <MapIcon className="mp-stat-icon" />
          </span>
          <strong>{cityCount || places.length}</strong>
          <span>{cityCount > 0 ? "Cidades" : "Locais"}</span>
        </article>
      </section>

      <section className="mp-highlights-section">
        <div className="mp-section-heading">
          <div>
            <p className="mp-section-kicker">Smart memories</p>
            <h2>Momentos para rever</h2>
          </div>

          <button
            type="button"
            className="mp-audio-button"
            onClick={speakMemorySummary}
            aria-label="Ouvir memória do dia"
            title="Ouvir memória do dia"
          >
            <Volume2 className="mp-audio-button-icon" />
          </button>
        </div>

        <div className="mp-highlights-strip">
          <MemoryCard
            title={memoryTitle}
            subtitle={smartMemorySummary}
            meta={`${signalCount} sinais`}
            location={currentTripLocation}
            imageUrl={coverPhotoUrl}
            variant="large"
          />

          <MemoryCard
            title="Locais do dia"
            subtitle={placeText}
            meta={getCountLabel(places.length, "local", "locais")}
            location={currentTripLocation}
            imageUrl={latestPhotoUrl}
          />

          <MemoryCard
            title="Contexto capturado"
            subtitle={contextText}
            meta={`${finalTranscriptions.length + visualDiscoveries.length} notas`}
            imageUrl={visualDiscoveries[0]?.photoDataUrl ?? latestPhotoUrl}
          />
        </div>
      </section>

      <section className="mp-collections-section">
        <div className="mp-section-heading">
          <div>
            <p className="mp-section-kicker">Coleções</p>
            <h2>Organização automática</h2>
          </div>
        </div>

        <div className="mp-collections-grid">
          {automaticCollections.map((collection) => (
            <CollectionCard key={collection.title} {...collection} />
          ))}
        </div>
      </section>

      <section className="mp-albums-section">
        <div className="mp-section-heading">
          <div>
            <p className="mp-section-kicker">Álbuns</p>
            <h2>Álbuns inteligentes</h2>
          </div>

          {pastTrips.length > 0 && (
            <button
              type="button"
              className={`mp-text-button ${isDeletingPastTrips ? "is-danger" : ""}`}
              onClick={
                isDeletingPastTrips
                  ? onCancelPastTripsDeleteMode
                  : onStartPastTripsDeleteMode
              }
            >
              {isDeletingPastTrips ? "Cancelar" : "Gerir"}
            </button>
          )}
        </div>

        {albums.length === 0 ? (
          <div className="mp-empty-state">
            <ImageIcon className="mp-empty-state-icon" />
            <h3>Ainda sem álbuns</h3>
            <p>As viagens e cidades aparecem aqui quando houver memórias.</p>
          </div>
        ) : (
          <div className="mp-albums-grid">
            {albums.map((album) => {
              const isPastTripSelected = selectedPastTripIds.includes(album.id);
              const canSelectPastTrip = pastTrips.some((trip) => trip.id === album.id);

              return (
                <div
                  key={album.id}
                  className={`mp-album-select-wrap ${
                    isPastTripSelected ? "is-selected" : ""
                  }`}
                >
                  {isDeletingPastTrips && canSelectPastTrip && (
                    <button
                      type="button"
                      className="mp-album-select-control"
                      onClick={() => onTogglePastTripSelection(album.id)}
                      aria-label={`Selecionar ${album.title}`}
                    >
                      {isPastTripSelected ? "✓" : ""}
                    </button>
                  )}

                  <AlbumCard {...album} />
                </div>
              );
            })}
          </div>
        )}

        {isDeletingPastTrips && (
          <div className="mp-delete-actions">
            <button
              type="button"
              className="mp-delete-secondary"
              onClick={onCancelPastTripsDeleteMode}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="mp-delete-primary"
              onClick={onDeleteSelectedPastTrips}
              disabled={selectedPastTripIds.length === 0}
            >
              Apagar selecionadas ({selectedPastTripIds.length})
            </button>
          </div>
        )}
      </section>

      <MemoryMapSection places={places} photos={photos} />

      <PhotoTimeline
        photos={photos}
        selectedPhotoIds={selectedPhotoIds}
        onTogglePhoto={onTogglePhoto}
      />

      <section className="mp-builder-section">
        <div className="mp-section-heading">
          <div>
            <p className="mp-section-kicker">Criar</p>
            <h2>Guardar em álbum</h2>
          </div>

          {selectedPhotoIds.length > 0 && (
            <span className="mp-section-count">
              {selectedPhotoIds.length} selecionadas
            </span>
          )}
        </div>

        <AlbumBuilder
          photos={photos}
          selectedPhotoIds={selectedPhotoIds}
          onClearSelection={onClearPhotoSelection}
          onLog={onLog}
        />
      </section>
    </section>
  );
}
