import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpenText,
  Camera,
  ChevronRight,
  FileText,
  Heart,
  Image as ImageIcon,
  Info,
  Map as MapIcon,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Trees,
  Utensils,
  Volume2,
  X,
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

interface MemoryCollection {
  id: string;
  title: string;
  count: number;
  coverImage?: string;
  createdAt: string;
}

interface MemoryTrip {
  id: string;
  title: string;
  dateLabel: string;
  locationLabel: string;
  photoCount: number;
  placeCount: number;
  transcriptsCount: number;
  coverUrl?: string;
  isCurrent?: boolean;
}

interface MemoriesPageProps {
  photos: Photo[];
  places: VisitedPlace[];
  transcriptions: Transcription[];
  visualDiscoveries: VisualDiscovery[];
  pastTrips: PastTrip[];
  currentTripName: string;
  currentTripLocation: string;
  isTripActive: boolean;
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

const COLLECTION_STORAGE_KEY = "travel-whisperer-memory-collections";

const matchesText = (value: string | undefined, patterns: string[]) => {
  const normalizedValue = value?.toLowerCase() ?? "";
  return patterns.some((pattern) => normalizedValue.includes(pattern));
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `collection-${Date.now()}`;
};

const loadStoredCollections = (): MemoryCollection[] => {
  try {
    const saved = localStorage.getItem(COLLECTION_STORAGE_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => typeof item?.title === "string")
      .map((item) => ({
        id: typeof item.id === "string" ? item.id : createId(),
        title: item.title,
        count: typeof item.count === "number" ? item.count : 0,
        coverImage:
          typeof item.coverImage === "string" ? item.coverImage : undefined,
        createdAt:
          typeof item.createdAt === "string"
            ? item.createdAt
            : new Date().toISOString(),
      }));
  } catch {
    return [];
  }
};

const formatTripDate = (trip: PastTrip) => {
  if (trip.startedAt && trip.endedAt) return `${trip.startedAt} - ${trip.endedAt}`;
  return trip.startedAt || trip.endedAt || "Sem datas";
};

export function MemoriesPage({
  photos,
  places,
  transcriptions,
  visualDiscoveries,
  pastTrips,
  currentTripName,
  currentTripLocation,
  isTripActive,
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
  const [customCollections, setCustomCollections] = useState<MemoryCollection[]>(
    () => loadStoredCollections(),
  );
  const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [collectionError, setCollectionError] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const finalTranscriptions = transcriptions.filter((item) => item.isFinal);
  const latestPhotoUrl = photos[0]?.url ?? visualDiscoveries[0]?.photoDataUrl;
  const coverPhotoUrl =
    photos[0]?.url ?? visualDiscoveries[0]?.photoDataUrl ?? pastTrips[0]?.coverPhotoUrl;

  const restaurantCount = useMemo(
    () =>
      places.filter((place) =>
        matchesText(`${place.category} ${place.name} ${place.description}`, [
          "food",
          "restaurant",
          "restaurante",
          "menu",
          "comida",
          "café",
        ]),
      ).length,
    [places],
  );

  const natureCount = useMemo(
    () =>
      places.filter((place) =>
        matchesText(`${place.category} ${place.name} ${place.description}`, [
          "nature",
          "natureza",
          "garden",
          "jardim",
          "view",
          "miradouro",
          "praia",
          "beach",
        ]),
      ).length,
    [places],
  );

  const signalCount =
    photos.length + places.length + finalTranscriptions.length + visualDiscoveries.length;

  const baseCollections = useMemo(
    () => [
      {
        title: "Favoritos",
        countLabel: String(Math.max(photos.length + visualDiscoveries.length, 0)),
        icon: Heart,
        coverUrl: coverPhotoUrl,
        accent: "green" as const,
      },
      {
        title: "Comida",
        countLabel: String(restaurantCount),
        icon: Utensils,
        coverUrl: latestPhotoUrl,
        accent: "amber" as const,
      },
      {
        title: "Ar livre",
        countLabel: String(natureCount),
        icon: Trees,
        coverUrl: latestPhotoUrl,
        accent: "green" as const,
      },
      {
        title: "Momentos gerais",
        countLabel: String(signalCount),
        icon: Sparkles,
        coverUrl: visualDiscoveries[0]?.photoDataUrl ?? latestPhotoUrl,
        accent: "blue" as const,
      },
    ],
    [
      coverPhotoUrl,
      latestPhotoUrl,
      natureCount,
      photos.length,
      restaurantCount,
      signalCount,
      visualDiscoveries,
    ],
  );

  const userCollections = useMemo(
    () =>
      customCollections.map((collection) => ({
        title: collection.title,
        countLabel: String(collection.count),
        icon: ImageIcon,
        coverUrl: collection.coverImage,
        accent: "blue" as const,
      })),
    [customCollections],
  );

  const memoryTrips = useMemo<MemoryTrip[]>(() => {
    const currentSignals =
      isTripActive &&
      (photos.length > 0 ||
        places.length > 0 ||
        finalTranscriptions.length > 0 ||
        visualDiscoveries.length > 0);

    const currentTrip = currentSignals
      ? [
          {
            id: "current-trip",
            title: currentTripName || "Viagem atual",
            dateLabel: "Em curso",
            locationLabel: currentTripLocation,
            photoCount: photos.length,
            placeCount: places.length,
            transcriptsCount: finalTranscriptions.length + visualDiscoveries.length,
            coverUrl: coverPhotoUrl,
            isCurrent: true,
          },
        ]
      : [];

    const archivedTrips = pastTrips.map((trip) => ({
      id: trip.id,
      title: trip.name,
      dateLabel: formatTripDate(trip),
      locationLabel: trip.locationLabel,
      photoCount: trip.photoCount,
      placeCount: trip.visitedPlacesCount,
      transcriptsCount: 0,
      coverUrl: trip.coverPhotoUrl,
    }));

    return [...currentTrip, ...archivedTrips];
  }, [
    coverPhotoUrl,
    currentTripLocation,
    currentTripName,
    finalTranscriptions.length,
    isTripActive,
    pastTrips,
    photos.length,
    places.length,
    visualDiscoveries.length,
  ]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredTrips = useMemo(() => {
    if (!normalizedSearch) return memoryTrips;

    return memoryTrips.filter((trip) =>
      `${trip.title} ${trip.locationLabel} ${trip.dateLabel}`
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [memoryTrips, normalizedSearch]);

  const selectedTrip = useMemo(
    () => memoryTrips.find((trip) => trip.id === selectedTripId) ?? null,
    [memoryTrips, selectedTripId],
  );

  useEffect(() => {
    localStorage.setItem(
      COLLECTION_STORAGE_KEY,
      JSON.stringify(customCollections),
    );
  }, [customCollections]);

  const closeCollectionSheet = () => {
    setIsCreateCollectionOpen(false);
    setCollectionName("");
    setCollectionError("");
  };

  const createCollection = () => {
    const trimmedName = collectionName.trim();

    if (!trimmedName) {
      setCollectionError("Escreve um nome para a coleção.");
      return;
    }

    setCustomCollections((prev) => [
      {
        id: createId(),
        title: trimmedName,
        count: 0,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);

    closeCollectionSheet();
    onLog(`Coleção criada: ${trimmedName}`, "success");
  };

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

  if (selectedTrip) {
    const isCurrentTrip = selectedTrip.isCurrent;

    return (
      <section className="mp-page mp-trip-detail-page" aria-label="Detalhe da viagem">
        <header className="mp-trip-detail-header">
          <button
            type="button"
            className="mp-back-button"
            onClick={() => setSelectedTripId(null)}
            aria-label="Voltar às memórias"
          >
            <ArrowLeft className="mp-back-button-icon" />
          </button>

          <div>
            <p>{selectedTrip.dateLabel}</p>
            <h1>{selectedTrip.title}</h1>
            <span>{selectedTrip.locationLabel}</span>
          </div>
        </header>

        <section className="mp-trip-cover-card">
          {selectedTrip.coverUrl ? (
            <img src={selectedTrip.coverUrl} alt={selectedTrip.title} />
          ) : (
            <div className="mp-trip-cover-empty">
              <ImageIcon className="mp-trip-cover-empty-icon" />
            </div>
          )}
        </section>

        <section className="mp-trip-summary-grid" aria-label="Resumo da viagem">
          <article>
            <Camera className="mp-trip-summary-icon" />
            <strong>{selectedTrip.photoCount}</strong>
            <span>Fotos</span>
          </article>
          <article>
            <MapPin className="mp-trip-summary-icon" />
            <strong>{selectedTrip.placeCount}</strong>
            <span>Lugares</span>
          </article>
          <article>
            <FileText className="mp-trip-summary-icon" />
            <strong>{selectedTrip.transcriptsCount}</strong>
            <span>Momentos</span>
          </article>
        </section>

        {isCurrentTrip ? (
          <>
            <section className="mp-smart-detail-section">
              <div className="mp-section-heading">
                <div>
                  <p className="mp-section-kicker">Resumo</p>
                  <h2>Smart memory do dia</h2>
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
                  title="Contexto capturado"
                  subtitle={contextText}
                  meta={`${finalTranscriptions.length + visualDiscoveries.length} notas`}
                  imageUrl={visualDiscoveries[0]?.photoDataUrl ?? latestPhotoUrl}
                />
              </div>
            </section>

            <PhotoTimeline
              photos={photos}
              selectedPhotoIds={selectedPhotoIds}
              onTogglePhoto={onTogglePhoto}
            />

            <section className="mp-detail-list-section">
              <div className="mp-section-heading">
                <div>
                  <p className="mp-section-kicker">Lugares</p>
                  <h2>Lugares guardados</h2>
                </div>
              </div>

              {places.length === 0 ? (
                <div className="mp-empty-state">
                  <MapPin className="mp-empty-state-icon" />
                  <h3>Ainda sem lugares</h3>
                  <p>Os locais visitados aparecem aqui automaticamente.</p>
                </div>
              ) : (
                <div className="mp-detail-list">
                  {places.map((place) => (
                    <article key={place.id} className="mp-detail-list-card">
                      <MapPin className="mp-detail-list-icon" />
                      <div>
                        <h3>{place.name}</h3>
                        <p>
                          {place.city} · {place.category}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="mp-detail-list-section">
              <div className="mp-section-heading">
                <div>
                  <p className="mp-section-kicker">Transcrições</p>
                  <h2>Contexto capturado</h2>
                </div>
              </div>

              {finalTranscriptions.length === 0 && visualDiscoveries.length === 0 ? (
                <div className="mp-empty-state">
                  <BookOpenText className="mp-empty-state-icon" />
                  <h3>Ainda sem contexto</h3>
                  <p>Transcrições, traduções e descrições aparecem aqui.</p>
                </div>
              ) : (
                <div className="mp-detail-list">
                  {visualDiscoveries.map((discovery) => (
                    <article key={discovery.id} className="mp-detail-list-card">
                      <Sparkles className="mp-detail-list-icon" />
                      <div>
                        <h3>O que estou a ver</h3>
                        <p>{discovery.description}</p>
                      </div>
                    </article>
                  ))}

                  {finalTranscriptions.map((transcription) => (
                    <article key={transcription.id} className="mp-detail-list-card">
                      <FileText className="mp-detail-list-icon" />
                      <div>
                        <h3>{transcription.time}</h3>
                        <p>{transcription.text}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <MemoryMapSection places={places} photos={photos} />

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
          </>
        ) : (
          <>
            <section className="mp-archived-trip-note">
              <Info className="mp-archived-trip-icon" />
              <div>
                <h2>Viagem arquivada</h2>
                <p>
                  Esta memória mantém as contagens guardadas da viagem. Quando
                  houver fotos associadas individualmente a viagens arquivadas,
                  elas aparecem aqui na mesma estrutura.
                </p>
              </div>
            </section>

            <section className="mp-archived-trip-sections">
              <article>
                <Camera className="mp-archived-trip-section-icon" />
                <h3>Fotos</h3>
                <p>{selectedTrip.photoCount} guardadas</p>
              </article>
              <article>
                <MapPin className="mp-archived-trip-section-icon" />
                <h3>Lugares</h3>
                <p>{selectedTrip.placeCount} guardados</p>
              </article>
              <article>
                <FileText className="mp-archived-trip-section-icon" />
                <h3>Transcrições</h3>
                <p>A ligar aos dados arquivados</p>
              </article>
              <article>
                <Sparkles className="mp-archived-trip-section-icon" />
                <h3>Momentos</h3>
                <p>Resumo da experiência</p>
              </article>
            </section>
          </>
        )}
      </section>
    );
  }

  return (
    <section className="mp-page mp-gallery-page" aria-label="Memórias da viagem">
      <header className="mp-gallery-header">
        <h1>Memórias</h1>

        <div className="mp-header-actions">
          <button
            type="button"
            className="mp-icon-button"
            aria-label="Criar coleção"
            onClick={() => setIsCreateCollectionOpen(true)}
          >
            <Plus className="mp-icon-button-svg" />
          </button>
          <button
            type="button"
            className={`mp-icon-button ${isSearchOpen ? "is-active" : ""}`}
            aria-label="Pesquisar memórias"
            onClick={() => setIsSearchOpen((value) => !value)}
          >
            <Search className="mp-icon-button-svg" />
          </button>
        </div>
      </header>

      {isSearchOpen && (
        <label className="mp-search-field">
          <Search className="mp-search-field-icon" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Pesquisar viagens..."
          />
        </label>
      )}

      <section className="mp-collections-section">
        <div className="mp-section-heading">
          <h2>Coleções</h2>
        </div>

        <div className="mp-collections-scroll-wrap">
          <div className="mp-collections-row">
            {[...userCollections, ...baseCollections].map((collection, index) => (
              <CollectionCard key={`${collection.title}-${index}`} {...collection} />
            ))}
          </div>

          <span className="mp-collections-scroll-hint" aria-hidden="true">
            <ChevronRight className="mp-collections-scroll-hint-icon" />
          </span>
        </div>
      </section>

      <section className="mp-albums-section">
        <div className="mp-section-heading">
          <h2>Viagens</h2>

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

        {filteredTrips.length === 0 ? (
          <div className="mp-empty-state">
            <ImageIcon className="mp-empty-state-icon" />
            <h3>Ainda sem viagens</h3>
            <p>As viagens aparecem aqui quando houver memórias guardadas.</p>
          </div>
        ) : (
          <div className="mp-albums-grid">
            {filteredTrips.map((trip) => {
              const isPastTripSelected = selectedPastTripIds.includes(trip.id);
              const canSelectPastTrip = pastTrips.some((item) => item.id === trip.id);

              return (
                <div
                  key={trip.id}
                  className={`mp-album-select-wrap ${
                    isPastTripSelected ? "is-selected" : ""
                  }`}
                >
                  {isDeletingPastTrips && canSelectPastTrip && (
                    <button
                      type="button"
                      className="mp-album-select-control"
                      onClick={() => onTogglePastTripSelection(trip.id)}
                      aria-label={`Selecionar ${trip.title}`}
                    >
                      {isPastTripSelected ? "✓" : ""}
                    </button>
                  )}

                  <AlbumCard
                    title={trip.title}
                    dateLabel={trip.dateLabel}
                    photoCount={trip.photoCount}
                    placeCount={trip.placeCount}
                    coverUrl={trip.coverUrl}
                    onClick={() => {
                      if (isDeletingPastTrips && canSelectPastTrip) {
                        onTogglePastTripSelection(trip.id);
                        return;
                      }

                      setSelectedTripId(trip.id);
                    }}
                  />
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

      <section className="mp-map-overview-section">
        <div className="mp-section-heading">
          <h2>Mapa</h2>
        </div>

        <article className="mp-map-overview-card">
          <div className="mp-map-overview-canvas" aria-label="Mapa de lugares">
            <span className="mp-map-overview-route mp-map-overview-route-one" />
            <span className="mp-map-overview-route mp-map-overview-route-two" />

            {places.slice(0, 5).map((place, index) => (
              <span
                key={place.id}
                className="mp-map-overview-pin"
                style={{
                  left: `${[22, 58, 73, 35, 48][index] ?? 50}%`,
                  top: `${[36, 28, 56, 68, 44][index] ?? 50}%`,
                }}
                title={place.name}
              >
                {photos[index]?.url ? (
                  <img src={photos[index].url} alt={place.name} />
                ) : (
                  <MapPin className="mp-map-overview-pin-icon" />
                )}
              </span>
            ))}

            {places.length === 0 && (
              <div className="mp-map-overview-empty">
                <MapIcon className="mp-map-overview-empty-icon" />
              </div>
            )}
          </div>

          <div className="mp-map-overview-copy">
            <h3>Lugares</h3>
            <p>{places.length}</p>
          </div>
        </article>
      </section>

      {isCreateCollectionOpen && (
        <div
          className="mp-sheet-backdrop"
          role="presentation"
          onClick={closeCollectionSheet}
        >
          <section
            className="mp-create-collection-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Criar coleção"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="mp-sheet-close"
              onClick={closeCollectionSheet}
              aria-label="Fechar"
            >
              <X className="mp-sheet-close-icon" />
            </button>

            <div>
              <p className="mp-section-kicker">Coleção</p>
              <h2>Criar coleção</h2>
              <p className="mp-sheet-description">
                Junta momentos, fotos e lugares num álbum temático.
              </p>
            </div>

            <label className="mp-create-field">
              <span>Nome da coleção</span>
              <input
                value={collectionName}
                onChange={(event) => {
                  setCollectionName(event.target.value);
                  setCollectionError("");
                }}
                placeholder="Ex: Cafés favoritos"
                autoFocus
              />
            </label>

            {collectionError && (
              <p className="mp-create-error">{collectionError}</p>
            )}

            <div className="mp-create-actions">
              <button
                type="button"
                className="mp-create-secondary"
                onClick={closeCollectionSheet}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="mp-create-primary"
                onClick={createCollection}
              >
                Criar coleção
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
