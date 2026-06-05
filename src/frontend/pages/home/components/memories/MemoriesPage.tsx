import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpenText,
  Camera,
  ChevronRight,
  FileText,
  Heart,
  Image as ImageIcon,
  Map as MapIcon,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Trees,
  Utensils,
  X,
} from "lucide-react";

import type { Photo } from "../PhotoStream";
import type { CompanionInteraction } from "../CompanionPage";
import type { VisitedPlace } from "../VisitedPlacesPanel";
import type { Transcription } from "../TranscriptionFeed";
import { AlbumCard } from "./AlbumCard";
import { CollectionCard } from "./CollectionCard";
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
  tripId?: string;
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
}

interface MemoriesPageProps {
  photos: Photo[];
  places: VisitedPlace[];
  transcriptions: Transcription[];
  visualDiscoveries: VisualDiscovery[];
  companionInteractions?: CompanionInteraction[];
  pastTrips: PastTrip[];
  currentTripId?: string;
  currentTripName: string;
  currentTripLocation: string;
  currentTripStartedAt?: string;
  isTripActive: boolean;
  onOpenCompanion?: () => void;
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
const ACTIVE_TRIP_MEMORY_ID = "active-trip-memory";

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
  companionInteractions = [],
  pastTrips,
  currentTripId,
  currentTripName,
  currentTripLocation,
  currentTripStartedAt,
  isTripActive,
  onOpenCompanion,
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
  const hasActiveTrip = isTripActive;
  const belongsToCurrentTrip = <Item extends { tripId?: string | null }>(
    item: Item,
  ) =>
    !currentTripId ||
    !item.tripId ||
    item.tripId === currentTripId ||
    item.tripId === "current-trip";
  const activeTripPhotos = hasActiveTrip
    ? photos.filter(belongsToCurrentTrip)
    : [];
  const activeTripPlaces = hasActiveTrip
    ? places.filter(belongsToCurrentTrip)
    : [];
  const activeTripTranscriptions = hasActiveTrip
    ? finalTranscriptions.filter(belongsToCurrentTrip)
    : [];
  const activeTripVisualDiscoveries = hasActiveTrip
    ? visualDiscoveries.filter(belongsToCurrentTrip)
    : [];
  const activeTripCompanionInteractions = hasActiveTrip
    ? companionInteractions.filter(
        (interaction) =>
          !currentTripId ||
          interaction.tripId === currentTripId ||
          interaction.tripId === "current-trip",
      )
    : [];
  const activeTripInteractionCount =
    activeTripCompanionInteractions.length +
    activeTripVisualDiscoveries.length +
    activeTripTranscriptions.length;
  const activeTripCoverUrl =
    activeTripPhotos[0]?.url ?? activeTripVisualDiscoveries[0]?.photoDataUrl;
  const activeTripDateLabel = currentTripStartedAt
    ? `Desde ${currentTripStartedAt}`
    : "Em curso";
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

    return archivedTrips;
  }, [pastTrips]);

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
  const isActiveTripSelected =
    hasActiveTrip && selectedTripId === ACTIVE_TRIP_MEMORY_ID;

  const getTripPhotos = (tripId: string) =>
    photos.filter((photo) => photo.tripId === tripId);
  const getTripPlaces = (tripId: string) =>
    places.filter((place) => place.tripId === tripId);
  const getTripTranscriptions = (tripId: string) =>
    finalTranscriptions.filter((transcription) => transcription.tripId === tripId);
  const getTripVisualDiscoveries = (tripId: string) =>
    visualDiscoveries.filter((discovery) => discovery.tripId === tripId);
  const getTripCompanionInteractions = (tripId: string) =>
    companionInteractions.filter(
      (interaction) =>
        interaction.tripId === tripId || interaction.tripId === "current-trip",
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

  const handleOpenCompanion = () => {
    if (onOpenCompanion) {
      onOpenCompanion();
      return;
    }

    onLog("Abre o Companion pelo botão central para ver as interações da viagem.", "info");
  };

  if (isActiveTripSelected || selectedTrip) {
    const detailTripId = isActiveTripSelected
      ? ACTIVE_TRIP_MEMORY_ID
      : selectedTrip?.id;
    const detailPhotos = isActiveTripSelected
      ? activeTripPhotos
      : detailTripId
        ? getTripPhotos(detailTripId)
        : [];
    const detailPlaces = isActiveTripSelected
      ? activeTripPlaces
      : detailTripId
        ? getTripPlaces(detailTripId)
        : [];
    const detailTranscriptions = isActiveTripSelected
      ? activeTripTranscriptions
      : detailTripId
        ? getTripTranscriptions(detailTripId)
        : [];
    const detailVisualDiscoveries = isActiveTripSelected
      ? activeTripVisualDiscoveries
      : detailTripId
        ? getTripVisualDiscoveries(detailTripId)
        : [];
    const detailCompanionInteractions = isActiveTripSelected
      ? activeTripCompanionInteractions
      : detailTripId
        ? getTripCompanionInteractions(detailTripId)
        : [];
    const detailInteractionCount =
      detailCompanionInteractions.length +
      detailVisualDiscoveries.length +
      detailTranscriptions.length;
    const detailTitle = isActiveTripSelected
      ? currentTripName || "Viagem atual"
      : selectedTrip?.title ?? "Viagem";
    const detailDateLabel = isActiveTripSelected
      ? activeTripDateLabel
      : selectedTrip?.dateLabel ?? "";
    const detailLocationLabel = isActiveTripSelected
      ? currentTripLocation
      : selectedTrip?.locationLabel ?? "";
    const detailCoverUrl = isActiveTripSelected
      ? activeTripCoverUrl
      : detailPhotos[0]?.url ??
        detailVisualDiscoveries[0]?.photoDataUrl ??
        selectedTrip?.coverUrl;
    const summaryPhotoCount = isActiveTripSelected
      ? activeTripPhotos.length
      : detailPhotos.length || selectedTrip?.photoCount || 0;
    const summaryPlaceCount = isActiveTripSelected
      ? activeTripPlaces.length
      : detailPlaces.length || selectedTrip?.placeCount || 0;
    const summaryInteractionCount = isActiveTripSelected
      ? activeTripInteractionCount
      : detailInteractionCount || selectedTrip?.transcriptsCount || 0;

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
            <p>{detailDateLabel}</p>
            <h1>{detailTitle}</h1>
            <span>{detailLocationLabel}</span>
            <strong
              className={`mp-trip-state-badge ${
                isActiveTripSelected ? "is-active" : "is-completed"
              }`}
            >
              {isActiveTripSelected ? "Em curso" : "Finalizada"}
            </strong>
          </div>
        </header>

        <section className="mp-trip-cover-card">
          {detailCoverUrl ? (
            <img src={detailCoverUrl} alt={detailTitle} />
          ) : (
            <div className="mp-trip-cover-empty">
              <ImageIcon className="mp-trip-cover-empty-icon" />
            </div>
          )}
        </section>

        <section className="mp-trip-summary-grid" aria-label="Resumo da viagem">
          <article>
            <Camera className="mp-trip-summary-icon" />
            <strong>{summaryPhotoCount}</strong>
            <span>Fotos</span>
          </article>
          <article>
            <MapPin className="mp-trip-summary-icon" />
            <strong>{summaryPlaceCount}</strong>
            <span>Lugares</span>
          </article>
          <article>
            <FileText className="mp-trip-summary-icon" />
            <strong>{summaryInteractionCount}</strong>
            <span>Interações</span>
          </article>
        </section>

        {isActiveTripSelected ? (
          <>
            <section className="mp-timeline-section">
              <div className="mp-section-heading">
                <div>
                  <p className="mp-section-kicker">Fotos</p>
                  <h2>Fotos da viagem</h2>
                  <span className="mp-section-description">
                    Fotos captadas com single tap durante esta viagem.
                  </span>
                </div>
              </div>

              {activeTripPhotos.length === 0 ? (
                <div className="mp-empty-state">
                  <Camera className="mp-empty-state-icon" />
                  <h3>Ainda não captaste fotos nesta viagem.</h3>
                  <p>Usa um single tap nos óculos para guardar momentos.</p>
                </div>
              ) : (
                <PhotoTimeline
                  photos={activeTripPhotos}
                  selectedPhotoIds={selectedPhotoIds}
                  onTogglePhoto={onTogglePhoto}
                />
              )}
            </section>

            <section className="mp-companion-shortcut-card">
              <div className="mp-companion-shortcut-icon">
                <Sparkles className="mp-companion-shortcut-svg" />
              </div>

              <div className="mp-companion-shortcut-copy">
                <h2>Interações com o Companion</h2>
                <p>
                  As perguntas, traduções e respostas da AI desta viagem estão
                  no Companion enquanto a viagem está em curso.
                </p>
              </div>

              <button
                type="button"
                className="mp-companion-shortcut-button"
                onClick={handleOpenCompanion}
              >
                Abrir Companion
              </button>
            </section>
          </>
        ) : (
          <>
            <section className="mp-timeline-section">
              <div className="mp-section-heading">
                <div>
                  <p className="mp-section-kicker">Fotos</p>
                  <h2>Fotos</h2>
                  <span className="mp-section-description">
                    Fotos normais e imagens captadas durante interações AI.
                  </span>
                </div>
              </div>

              {detailPhotos.length === 0 && detailVisualDiscoveries.length === 0 ? (
                <div className="mp-empty-state">
                  <Camera className="mp-empty-state-icon" />
                  <h3>Sem fotos associadas</h3>
                  <p>Este álbum mantém as contagens guardadas da viagem.</p>
                </div>
              ) : (
                <div className="mp-completed-photo-grid">
                  {detailPhotos.map((photo) => (
                    <img key={photo.id} src={photo.url} alt="Foto da viagem" />
                  ))}

                  {detailVisualDiscoveries.map((discovery) => (
                    <img
                      key={discovery.id}
                      src={discovery.photoDataUrl}
                      alt="Foto usada numa interação AI"
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="mp-detail-list-section">
              <div className="mp-section-heading">
                <div>
                  <p className="mp-section-kicker">Lugares</p>
                  <h2>Lugares</h2>
                </div>
              </div>

              {detailPlaces.length === 0 ? (
                <div className="mp-empty-state">
                  <MapPin className="mp-empty-state-icon" />
                  <h3>Sem lugares associados</h3>
                  <p>Os lugares guardados desta viagem aparecem aqui.</p>
                </div>
              ) : (
                <div className="mp-detail-list">
                  {detailPlaces.map((place) => (
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
                  <p className="mp-section-kicker">Companion</p>
                  <h2>Interações e contexto</h2>
                </div>
              </div>

              {detailCompanionInteractions.length === 0 &&
              detailVisualDiscoveries.length === 0 &&
              detailTranscriptions.length === 0 ? (
                <div className="mp-empty-state">
                  <BookOpenText className="mp-empty-state-icon" />
                  <h3>Sem interações arquivadas</h3>
                  <p>Perguntas, traduções e respostas AI aparecem aqui.</p>
                </div>
              ) : (
                <div className="mp-detail-list">
                  {detailCompanionInteractions.map((interaction) => (
                    <article key={interaction.id} className="mp-detail-list-card">
                      <Sparkles className="mp-detail-list-icon" />
                      <div>
                        <h3>{interaction.title}</h3>
                        <p>{interaction.content}</p>
                      </div>
                    </article>
                  ))}

                  {detailVisualDiscoveries.map((discovery) => (
                    <article key={discovery.id} className="mp-detail-list-card">
                      <Sparkles className="mp-detail-list-icon" />
                      <div>
                        <h3>O que estou a ver</h3>
                        <p>{discovery.description}</p>
                      </div>
                    </article>
                  ))}

                  {detailTranscriptions.map((transcription) => (
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

            <MemoryMapSection places={detailPlaces} photos={detailPhotos} />
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

      {hasActiveTrip && (
        <section className="mp-current-trip-section">
          <div className="mp-section-heading">
            <h2>Viagem em curso</h2>
          </div>

          <button
            type="button"
            className="mp-current-trip-card"
            onClick={() => setSelectedTripId(ACTIVE_TRIP_MEMORY_ID)}
          >
            <span className="mp-current-trip-cover" aria-hidden="true">
              {activeTripCoverUrl ? (
                <img src={activeTripCoverUrl} alt="" />
              ) : (
                <MapIcon className="mp-current-trip-cover-icon" />
              )}
            </span>

            <span className="mp-current-trip-copy">
              <span className="mp-current-trip-badge">Em curso</span>
              <strong>{currentTripName || "Viagem atual"}</strong>
              <span>{activeTripDateLabel}</span>
              <small>
                {activeTripPhotos.length} fotos · {activeTripPlaces.length} lugares ·{" "}
                {activeTripInteractionCount} interações
              </small>
            </span>

            <ChevronRight className="mp-current-trip-chevron" />
          </button>
        </section>
      )}

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
