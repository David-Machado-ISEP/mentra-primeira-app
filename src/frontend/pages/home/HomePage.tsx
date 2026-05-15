import { useState, useEffect, useCallback, useRef } from "react";
import {
  AudioLines,
  CheckCircle2,
  Camera,
  Compass,
  Zap,
  Terminal,
  Moon,
  Sun,
  Settings,
  Languages,
  Home,
  Heart,
  MapPin,
  Mic,
  Plus,
  Sparkles,
  User,
  X,
} from "lucide-react";

import {
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/ui";

import { useTheme } from "../../App";

import "./estilo/HomePage.css";

import { PhotoStream, type Photo } from "./components/PhotoStream";
import { AlbumBuilder } from "./components/AlbumBuilder";
import { AudioControls } from "./components/AudioControls";
import { RecommendationsPanel } from "./components/RecommendationsPanel";
import {
  VisitedPlacesPanel,
  type VisitedPlace,
} from "./components/VisitedPlacesPanel";
import { SmartTravelMemories } from "./components/SmartTravelMemories";

import {
  IntroPreferences,
  type TravelPreferences,
} from "./components/IntroPreferences";

import {
  TranscriptionFeed,
  type Transcription,
} from "./components/TranscriptionFeed";

import { SystemLogs, type Log } from "./components/SystemLogs";

interface HomePageProps {
  userId: string;
}

interface CurrentLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
  placeName?: string;
  displayName?: string;
}

const defaultPreferences: TravelPreferences = {
  interests: ["monuments", "local_food"],
  travelPace: "balanced",
  budget: "medium",
};

export default function HomePage({ userId }: HomePageProps) {
  const { isDarkMode, toggleTheme } = useTheme();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);
  const [currentLocation, setCurrentLocation] =
    useState<CurrentLocation | null>(null);
  const [isLocationMapOpen, setIsLocationMapOpen] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);

  const logIdCounter = useRef(Date.now());

  /* Live Translation */
  const [translationEnabled, setTranslationEnabled] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("English");

  const addLog = useCallback(
    (message: string, type: Log["type"] = "info") => {
      setLogs((prev) =>
        [
          {
            id: logIdCounter.current++,
            message,
            type,
            time: new Date().toLocaleTimeString(),
          },
          ...prev,
        ].slice(0, 30),
      );
    },
    [],
  );

  /* INTRO / USER PREFERENCES */
  const [preferences, setPreferences] = useState<TravelPreferences>(() => {
    try {
      const saved = localStorage.getItem("travel-whisperer-preferences");
      return saved ? JSON.parse(saved) : defaultPreferences;
    } catch {
      return defaultPreferences;
    }
  });

  const [hasCompletedIntro, setHasCompletedIntro] = useState(() => {
    return localStorage.getItem("travel-whisperer-intro-completed") === "true";
  });

  const [isEditingPreferences, setIsEditingPreferences] = useState(false);

  const savePreferences = useCallback(
    (newPreferences: TravelPreferences) => {
      setPreferences(newPreferences);

      localStorage.setItem(
        "travel-whisperer-preferences",
        JSON.stringify(newPreferences),
      );

      addLog("Travel preferences saved", "success");
    },
    [addLog],
  );

  const continueToApp = useCallback(() => {
    localStorage.setItem("travel-whisperer-intro-completed", "true");
    setHasCompletedIntro(true);
    addLog("Intro completed", "success");
  }, [addLog]);

  const startNewTrip = useCallback(() => {
    localStorage.removeItem("travel-whisperer-preferences");
    localStorage.removeItem("travel-whisperer-intro-completed");
    localStorage.removeItem("travel-whisperer-liked-recommendations");
    localStorage.removeItem("travel-whisperer-dismissed-recommendations");

    setPreferences(defaultPreferences);
    setHasCompletedIntro(false);
    setIsEditingPreferences(false);
    setSelectedPhotoIds([]);

    addLog("New trip started", "info");
  }, [addLog]);

  const togglePhotoSelection = useCallback((photoId: string) => {
    setSelectedPhotoIds((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId],
    );
  }, []);

  /* PHOTO STREAM */
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connect = () => {
      try {
        eventSource = new EventSource(
          `/api/photo-stream?userId=${encodeURIComponent(userId)}`,
        );

        eventSource.onopen = () => {
          addLog("Connected to photo stream", "success");
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "connected") return;

            setPhotos((prev) => {
              if (prev.some((p) => p.requestId === data.requestId)) {
                return prev;
              }

              addLog(
                `Photo captured at ${new Date(
                  data.timestamp,
                ).toLocaleTimeString()}`,
                "success",
              );

              return [
                {
                  id: data.requestId,
                  requestId: data.requestId,
                  url: data.dataUrl,
                  timestamp: new Date(data.timestamp).toLocaleTimeString(),
                },
                ...prev,
              ].slice(0, 12);
            });
          } catch {
            addLog("Failed to parse photo stream event", "error");
          }
        };

        eventSource.onerror = () => {
          addLog("Photo stream disconnected, reconnecting...", "warning");
          eventSource?.close();
          setTimeout(connect, 3000);
        };
      } catch {
        addLog("Failed to connect to photo stream", "error");
      }
    };

    connect();

    return () => {
      eventSource?.close();
    };
  }, [addLog, userId]);

  /* VISITED PLACES STREAM */
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connect = () => {
      try {
        eventSource = new EventSource(
          `/api/visited-places-stream?userId=${encodeURIComponent(userId)}`,
        );

        eventSource.onopen = () => {
          addLog("Connected to visited places stream", "success");
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "connected") {
              setVisitedPlaces(data.places ?? []);
              return;
            }

            if (data.type !== "visited_place") return;

            setVisitedPlaces((prev) => {
              const next = [
                data.place,
                ...prev.filter((place) => place.id !== data.place.id),
              ];

              return next.sort((a, b) => b.timestamp - a.timestamp);
            });

            addLog(`Visited place saved: ${data.place.name}`, "success");
          } catch {
            addLog("Failed to parse visited places event", "error");
          }
        };

        eventSource.onerror = () => {
          addLog("Visited places stream disconnected, reconnecting...", "warning");
          eventSource?.close();
          setTimeout(connect, 3000);
        };
      } catch {
        addLog("Failed to connect to visited places stream", "error");
      }
    };

    connect();

    return () => {
      eventSource?.close();
    };
  }, [addLog, userId]);

  /* LOCATION STREAM */
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connect = () => {
      try {
        eventSource = new EventSource(
          `/api/location-stream?userId=${encodeURIComponent(userId)}`,
        );

        eventSource.onopen = () => {
          addLog("Connected to location stream", "success");
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "connected") {
              setCurrentLocation(data.location ?? null);
              return;
            }

            if (data.type !== "location_update") return;

            setCurrentLocation(data.location);
            //addLog("Current location updated", "info");
          } catch {
            addLog("Failed to parse location event", "error");
          }
        };

        eventSource.onerror = () => {
          addLog("Location stream disconnected, reconnecting...", "warning");
          eventSource?.close();
          setTimeout(connect, 3000);
        };
      } catch {
        addLog("Failed to connect to location stream", "error");
      }
    };

    connect();

    return () => {
      eventSource?.close();
    };
  }, [addLog, userId]);

  /* TRANSCRIPTION STREAM */
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let idCounter = Date.now();

    const connect = () => {
      try {
        eventSource = new EventSource(
          `/api/transcription-stream?userId=${encodeURIComponent(userId)}`,
        );

        eventSource.onopen = () => {
          addLog("Connected to transcription stream", "success");
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "connected") return;

            setTranscriptions((prev) => {
              const entry = {
                id: idCounter++,
                text: data.text,
                time: new Date(data.timestamp).toLocaleTimeString(),
                isFinal: data.isFinal,
              };

              if (data.isFinal) {
                addLog("Final transcription received", "info");

                if (prev.length > 0 && !prev[0].isFinal) {
                  const updated = [...prev];

                  updated[0] = {
                    ...updated[0],
                    ...entry,
                    id: updated[0].id,
                  };

                  return updated.slice(0, 10);
                }

                return [entry, ...prev].slice(0, 10);
              }

              if (prev.length === 0 || prev[0].isFinal) {
                return [entry, ...prev].slice(0, 10);
              }

              const updated = [...prev];

              updated[0] = {
                ...updated[0],
                ...entry,
                id: updated[0].id,
              };

              return updated;
            });
          } catch {
            addLog("Failed to parse transcription stream event", "error");
          }
        };

        eventSource.onerror = () => {
          addLog(
            "Transcription stream disconnected, reconnecting...",
            "warning",
          );
          eventSource?.close();
          setTimeout(connect, 3000);
        };
      } catch {
        addLog("Failed to connect to transcription stream", "error");
      }
    };

    connect();

    return () => {
      eventSource?.close();
    };
  }, [addLog, userId]);

  useEffect(() => {
    if (translationEnabled) {
      addLog(`Live Translation enabled → ${targetLanguage}`, "success");
    } else {
      addLog("Live Translation disabled", "info");
    }
  }, [translationEnabled, targetLanguage, addLog]);

  if (!hasCompletedIntro || isEditingPreferences) {
    return (
      <IntroPreferences
        preferences={preferences}
        onSave={savePreferences}
        onContinue={() => {
          continueToApp();
          setIsEditingPreferences(false);
        }}
      />
    );
  }

  const locationMapUrl = currentLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${currentLocation.lng - 0.004}%2C${currentLocation.lat - 0.004}%2C${currentLocation.lng + 0.004}%2C${currentLocation.lat + 0.004}&layer=mapnik&marker=${currentLocation.lat}%2C${currentLocation.lng}`
    : "";

  return (
    <main id="dashboard" className="tw-page">
      {/* HEADER */}
      <header className="tw-header">
        <div className="tw-header-top">
          <div className="tw-brand">
            <div className="tw-brand-icon">
              <Camera className="tw-brand-icon-svg" />
            </div>

            <div className="tw-brand-copy">
              <h1 className="tw-title">Travel Whisperer</h1>
              <p className="tw-subtitle">Mentra Live Travel Assistant</p>
            </div>
          </div>

          <div className="tw-header-menu">
            <button
              type="button"
              className="tw-round-action"
              onClick={startNewTrip}
              aria-label="Nova viagem"
            >
              <Plus className="tw-round-action-icon" />
            </button>

            <button
              type="button"
              className="tw-round-action"
              onClick={toggleTheme}
              aria-label="Alternar tema"
            >
              {isDarkMode ? (
                <Sun className="tw-round-action-icon" />
              ) : (
                <Moon className="tw-round-action-icon" />
              )}
            </button>

            <button
              type="button"
              className="tw-round-action"
              onClick={() => setIsEditingPreferences(true)}
              aria-label="Editar preferências"
            >
              <Settings className="tw-round-action-icon" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="tw-hero">
        <div className="tw-hero-art" aria-hidden="true">
          <span className="tw-hero-sun" />
          <span className="tw-hero-palm" />
          <span className="tw-hero-mountain" />
          <span className="tw-hero-bird tw-hero-bird-one" />
          <span className="tw-hero-bird tw-hero-bird-two" />
        </div>

        <div className="tw-hero-content">

          <h2 className="tw-hero-title">
            Viagem inteligente. Sempre contigo.
          </h2>

          <p className="tw-hero-description">
            Informação e assistência discretas para cada passo da tua viagem.
          </p>

          <div className="tw-hero-tags">
            <span className="tw-feature-chip">
              <Mic className="tw-feature-icon tw-feature-icon-voice" />
              Voz
            </span>

            <span className="tw-feature-chip">
              <Camera className="tw-feature-icon tw-feature-icon-camera" />
              Câmara
            </span>

            <span className="tw-feature-chip">
              <MapPin className="tw-feature-icon tw-feature-icon-gps" />
              GPS
            </span>

            <span className="tw-feature-chip">
              <Sparkles className="tw-feature-icon tw-feature-icon-ai" />
              AI
            </span>
          </div>
        </div>
      </section>

      {/* STATUS / LOCATION */}
      <section className="tw-status-card">
        <div className="tw-status-copy">
          <div className="tw-status-online-row">
            <span className="tw-panel-dot" />
            <span>Online</span>
          </div>

          <p className="tw-status-label">Localização atual</p>

          <p className="tw-status-value">
            {currentLocation?.placeName ?? "A identificar local"}
          </p>

          <div className="tw-status-divider" />

          <button
            type="button"
            className="tw-status-location"
            onClick={() => currentLocation && setIsLocationMapOpen(true)}
            disabled={!currentLocation}
          >
            <MapPin className="tw-status-location-icon" />
            <span>
              {currentLocation
                ? currentLocation.displayName ??
                  `${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}`
                : "A aguardar GPS"}
            </span>
          </button>
        </div>

        <div className="tw-globe-art" aria-hidden="true">
          <span className="tw-globe-orbit tw-globe-orbit-one" />
          <span className="tw-globe-orbit tw-globe-orbit-two" />
          <span className="tw-globe-orbit tw-globe-orbit-three" />

          <span className="tw-globe-core" />
          <span className="tw-globe-continent tw-globe-continent-one" />
          <span className="tw-globe-continent tw-globe-continent-two" />
          <span className="tw-globe-continent tw-globe-continent-three" />

          <span className="tw-globe-ripple tw-globe-ripple-one" />
          <span className="tw-globe-ripple tw-globe-ripple-two" />
          <span className="tw-globe-ripple tw-globe-ripple-three" />

          <span className="tw-globe-pin-badge">
            <span className="tw-globe-pin-dot" />
          </span>
        </div>
      </section>

      {isLocationMapOpen && currentLocation && (
        <div
          className="tw-map-modal-backdrop"
          role="presentation"
          onClick={() => setIsLocationMapOpen(false)}
        >
          <section
            className="tw-map-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Localização atual no mapa"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="tw-map-modal-header">
              <div>
                <h2>{currentLocation.placeName ?? "Localização atual"}</h2>
                <p>
                  {currentLocation.displayName ??
                    `${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}`}
                </p>
              </div>

              <button
                type="button"
                className="tw-map-close-button"
                onClick={() => setIsLocationMapOpen(false)}
                aria-label="Fechar mapa"
              >
                <X className="tw-map-close-icon" />
              </button>
            </div>

            <iframe
              className="tw-map-frame"
              title="Mapa da localização atual"
              src={locationMapUrl}
              loading="lazy"
            />
          </section>
        </div>
      )}

      {/* STATS */}
      <section className="tw-stats-grid">
        <article className="tw-stat-card">
          <div className="tw-stat-icon">
            <Camera className="tw-stat-icon-svg" />
          </div>

          <div>
            <span className="tw-stat-label">Fotos</span>
            <strong className="tw-stat-value">{photos.length}</strong>
            <span className="tw-stat-note">
              {photos.length > 0 ? "capturadas" : "à espera"}
            </span>
          </div>
        </article>

        <article className="tw-stat-card">
          <div className="tw-stat-icon tw-stat-icon-blue">
            <CheckCircle2 className="tw-stat-icon-svg" />
          </div>

          <div>
            <span className="tw-stat-label">Lugares</span>
            <strong className="tw-stat-value">{visitedPlaces.length}</strong>
            <span className="tw-stat-note">
              {visitedPlaces.length > 0 ? "guardados" : "por descobrir"}
            </span>
          </div>
        </article>

        <article className="tw-stat-card">
          <div className="tw-stat-icon tw-stat-icon-green">
            <AudioLines className="tw-stat-icon-svg" />
          </div>

          <div>
            <span className="tw-stat-label">Transcrições</span>
            <strong className="tw-stat-value">{transcriptions.length}</strong>
            <span className="tw-stat-note">
              {translationEnabled ? "tradução ativa" : "voz pronta"}
            </span>
          </div>
        </article>
      </section>

      {/* SMART RECOMMENDATIONS */}
      <section id="recommendations" className="tw-section">
        <RecommendationsPanel preferences={preferences} onLog={addLog} />
      </section>

      {/* VISITED PLACES */}
      <section className="tw-section">
        <VisitedPlacesPanel places={visitedPlaces} />
      </section>

      {/* SMART TRAVEL MEMORIES */}
      <section id="memories" className="tw-section">
        <SmartTravelMemories
          photos={photos}
          places={visitedPlaces}
          transcriptions={transcriptions}
        />
      </section>

      {/* RECENT MOMENTS */}
      <section className="tw-recent-card">
        <div className="tw-recent-header">
          <div className="tw-recent-title-row">
            <Camera className="tw-recent-icon" />
            <h2 className="tw-card-title">Momentos recentes</h2>
          </div>
          <a href="#photos" className="tw-card-link">Ver tudo</a>
        </div>

        <div className="tw-recent-strip">
          {photos.slice(0, 4).map((photo) => (
            <img
              key={photo.id}
              src={photo.url}
              alt={`Momento capturado às ${photo.timestamp}`}
              className="tw-recent-photo"
            />
          ))}

          {photos.length === 0 &&
            Array.from({ length: 4 }).map((_, index) => (
              <span key={index} className="tw-recent-placeholder" />
            ))}

          {photos.length > 4 && (
            <span className="tw-recent-more">+{photos.length - 4}</span>
          )}
        </div>
      </section>

      {/* PHOTO STREAM */}
      <section id="photos" className="tw-section">
        <PhotoStream
          photos={photos}
          selectedPhotoIds={selectedPhotoIds}
          onTogglePhoto={togglePhotoSelection}
        />
      </section>

      {/* ALBUM BUILDER */}
      <section className="tw-section">
        <AlbumBuilder
          photos={photos}
          selectedPhotoIds={selectedPhotoIds}
          onClearSelection={() => setSelectedPhotoIds([])}
          onLog={addLog}
        />
      </section>

      {/* AUDIO */}
      <section id="audio" className="tw-section">
        <AudioControls userId={userId} onLog={addLog} />
      </section>

      {/* LIVE TRANSLATION */}
      <section className="tw-translation-card">
        <div className="tw-translation-header">
          <div className="tw-translation-title-wrap">
            <div className="tw-translation-icon">
              <Languages className="tw-translation-icon-svg" />
            </div>

            <div>
              <h2 className="tw-card-title">Tradução ao vivo</h2>
              <p className="tw-card-description">
                Tradução de voz em tempo real
              </p>
            </div>
          </div>

          <Switch
            checked={translationEnabled}
            onCheckedChange={setTranslationEnabled}
          />
        </div>

        <div className="tw-field">
          <label className="tw-field-label">Traduzir para</label>

          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="tw-select"
          >
            <option>English</option>
            <option>Português</option>
            <option>Español</option>
            <option>Français</option>
            <option>Deutsch</option>
            <option>Italiano</option>
          </select>
        </div>
      </section>

      {/* TABS */}
      <section className="tw-section">
        <Tabs defaultValue="transcriptions" className="tw-tabs">
          <TabsList className="tw-tabs-list">
            <TabsTrigger value="transcriptions" className="tw-tabs-trigger">
              <Zap className="tw-tabs-icon" />
              Transcrições
            </TabsTrigger>

            <TabsTrigger value="logs" className="tw-tabs-trigger">
              <Terminal className="tw-tabs-icon" />
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transcriptions" className="tw-tabs-content">
            <TranscriptionFeed
              transcriptions={transcriptions}
              translationEnabled={translationEnabled}
              targetLanguage={targetLanguage}
              userId={userId}
            />
          </TabsContent>

          <TabsContent value="logs" className="tw-tabs-content">
            <SystemLogs logs={logs} />
          </TabsContent>
        </Tabs>
      </section>

      <nav className="tw-bottom-nav" aria-label="Navegação principal">
        <a href="#dashboard" className="tw-bottom-nav-item tw-bottom-nav-item-active">
          <Home className="tw-bottom-nav-icon" />
          <span>Dashboard</span>
        </a>
        <a href="#recommendations" className="tw-bottom-nav-item">
          <Compass className="tw-bottom-nav-icon" />
          <span>Explorar</span>
        </a>
        <a href="#memories" className="tw-bottom-nav-item">
          <Heart className="tw-bottom-nav-icon" />
          <span>Memórias</span>
        </a>
        <a href="#audio" className="tw-bottom-nav-item">
          <AudioLines className="tw-bottom-nav-icon" />
          <span>Áudio</span>
        </a>
        <button
          type="button"
          className="tw-bottom-nav-item"
          onClick={() => setIsEditingPreferences(true)}
        >
          <User className="tw-bottom-nav-icon" />
          <span>Perfil</span>
        </button>
      </nav>
    </main>
  );
}
