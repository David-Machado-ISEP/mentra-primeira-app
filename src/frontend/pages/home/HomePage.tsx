import { useState, useEffect, useCallback, useRef } from "react";
import {
  Camera,
  Zap,
  Terminal,
  Moon,
  Sun,
  Languages,
  MapPin,
  Sparkles,
  Mic,
  MoreHorizontal,
  User,
  ChevronDown,
  SlidersHorizontal,
  Plus,
  Image as ImageIcon,
} from "lucide-react";

import {
  Button,
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

  return (
    <main className="tw-page">
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
            <button type="button" className="tw-avatar" aria-label="User">
              {userId?.charAt(0)?.toUpperCase() || "D"}
            </button>

            <button type="button" className="tw-icon-button" aria-label="Menu">
              <MoreHorizontal className="tw-icon-button-svg" />
            </button>
          </div>
        </div>

        <div className="tw-primary-actions">
          <Button
            type="button"
            variant="outline"
            className="tw-preferences-button"
            onClick={() => setIsEditingPreferences(true)}
          >
            <span className="tw-action-icon-wrap">
              <SlidersHorizontal className="tw-action-icon" />
            </span>
            Editar preferências
          </Button>

          <Button
            type="button"
            variant="outline"
            className="tw-new-trip-button"
            onClick={startNewTrip}
          >
            <span className="tw-action-icon-wrap tw-action-icon-wrap-accent">
              <Plus className="tw-action-icon" />
            </span>
            Nova viagem
          </Button>
        </div>

        <div className="tw-context-row">
          <button type="button" className="tw-user-chip">
            <User className="tw-user-chip-icon" />
            <span>{userId?.substring(0, 8)}...</span>
            <ChevronDown className="tw-user-chip-chevron" />
          </button>

          <div className="tw-theme-toggle">
            <Sun className="tw-theme-icon" />
            <Switch checked={isDarkMode} onCheckedChange={toggleTheme} />
            <Moon className="tw-theme-icon" />
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
          <div className="tw-hero-badge">
            <Sparkles className="tw-hero-badge-icon" />
            <span>Smart Glasses AI/AX</span>
          </div>

          <h2 className="tw-hero-title">
            Assistente de viagem inteligente, discreto e hands-free.
          </h2>

          <p className="tw-hero-description">
            Protótipo para testar fotografia, álbuns, áudio, transcrição e
            tradução como base da experiência Travel Whisperer nos Mentra Live.
          </p>

          <div className="tw-hero-tags">
            <span className="tw-feature-chip">
              <Mic className="tw-feature-icon tw-feature-icon-voice" />
              Voice
            </span>

            <span className="tw-feature-chip">
              <Camera className="tw-feature-icon tw-feature-icon-camera" />
              Camera
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

      {/* STATUS */}
{/* STATUS / LOCATION */}
<section className="tw-status-card">
  <div className="tw-status-copy">
    <div className="tw-status-online-row">
      <span className="tw-panel-dot" />
      <span>Online</span>
    </div>

    <p className="tw-status-label">Local atual</p>
    <p className="tw-status-value">Porto, Portugal</p>

    <div className="tw-status-location">
      <MapPin className="tw-status-location-icon" />
      <span>Travel context ready</span>
    </div>
  </div>

  <div className="tw-globe-art" aria-hidden="true">
    <span className="tw-globe-core" />
    <span className="tw-globe-land tw-globe-land-one" />
    <span className="tw-globe-land tw-globe-land-two" />
    <span className="tw-globe-ring tw-globe-ring-one" />
    <span className="tw-globe-ring tw-globe-ring-two" />
    <span className="tw-globe-pin" />
    <span className="tw-globe-shadow" />
  </div>
</section>

      {/* STATS */}
      <section className="tw-stats-grid">
        <article className="tw-stat-card tw-stat-card-featured">
          <div className="tw-stat-icon">
            <ImageIcon className="tw-stat-icon-svg" />
          </div>

          <div>
            <span className="tw-stat-label">Fotos capturadas</span>
            <strong className="tw-stat-value">{photos.length}</strong>
          </div>
        </article>

        <article className="tw-stat-card">
          <span className="tw-stat-label">Fotos selecionadas</span>
          <strong className="tw-stat-value">{selectedPhotoIds.length}</strong>
        </article>

        <article className="tw-stat-card">
          <span className="tw-stat-label">Transcrições</span>
          <strong className="tw-stat-value">{transcriptions.length}</strong>
        </article>

        <article className="tw-stat-card">
          <span className="tw-stat-label">Tradução</span>
          <strong className="tw-stat-value">
            {translationEnabled ? "Ativa" : "Off"}
          </strong>
        </article>
      </section>

      {/* SMART RECOMMENDATIONS */}
      <section className="tw-section">
        <RecommendationsPanel preferences={preferences} onLog={addLog} />
      </section>

      {/* PHOTO STREAM */}
      <section className="tw-section">
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
      <section className="tw-section">
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
              <h2 className="tw-card-title">Live Translation</h2>
              <p className="tw-card-description">
                Real-time voice translation mode
              </p>
            </div>
          </div>

          <Switch
            checked={translationEnabled}
            onCheckedChange={setTranslationEnabled}
          />
        </div>

        <div className="tw-field">
          <label className="tw-field-label">Translate to</label>

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
              Transcriptions
            </TabsTrigger>

            <TabsTrigger value="logs" className="tw-tabs-trigger">
              <Terminal className="tw-tabs-icon" />
              System Logs
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
    </main>
  );
}