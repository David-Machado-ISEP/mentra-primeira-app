import { useState, useEffect, useCallback, useRef } from "react";
import {
  AudioLines,
  Camera,
  Compass,
  FileText,
  Zap,
  Terminal,
  Bell,
  Bot,
  Cloud,
  Moon,
  Navigation,
  ShieldCheck,
  Sun,
  Settings,
  Languages,
  Home,
  Heart,
  MapPin,
  Plus,
  Sparkles,
  User,
  Volume2,
  Map,
  Mic,
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

import type { Photo } from "./components/PhotoStream";
import { AudioControls } from "./components/AudioControls";
import { ExplorePage } from "./components/ExplorePage";
import { ItineraryPage, type ItineraryItem } from "./components/ItineraryPage";
import type { VisitedPlace } from "./components/VisitedPlacesPanel";

import { MemoriesPage } from "./components/memories/MemoriesPage";

import {
  IntroPreferences,
  type TravelPreferences,
} from "./components/IntroPreferences";
import { OnboardingFlow } from "./components/onboarding/OnboardingFlow";

import {
  TranscriptionFeed,
  type Transcription,
} from "./components/TranscriptionFeed";

import {
  CompanionPage,
  type CompanionInteraction,
} from "./components/CompanionPage";

import { SystemLogs, type Log } from "./components/SystemLogs";

import "./estilo/HomePage.css";
import "./estilo/CompanionPage.css";

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
  city?: string;
  country?: string;
}

interface VisualDiscovery {
  id: string;
  userId: string;
  photoRequestId: string;
  photoDataUrl: string;
  description: string;
  timestamp: string;
  source: "triple_tap";
}

interface AppSettings {
  appLanguage: "pt" | "en" | "es" | "fr";
  voiceGuidance: boolean;
  audioFeedback: boolean;
  notifications: boolean;
  locationContext: boolean;
  autoMemories: boolean;
}

interface VisibleSections {
  recommendations: boolean;
  nearby: boolean;
  places: boolean;
  memories: boolean;
  recentMoments: boolean;
  photos: boolean;
  album: boolean;
  audio: boolean;
  translation: boolean;
  transcriptions: boolean;
}

type BottomNavItem =
  | "dashboard"
  | "recommendations"
  | "itinerary"
  | "memories"
  | "audio"
  | "profile"
  | "companion";

interface CurrentTrip {
  id: string;
  name: string;
  startedAt: string;
  endedAt: string | null;
}

interface RecommendationLikeItem {
  id: string;
  name: string;
  category: string;
  description: string;
  estimatedTime: string;
  budget: "low" | "medium" | "high";
  interests: string[];
  reason?: string;
}

interface NewTripReturnState {
  currentTrip: CurrentTrip;
  preferences: TravelPreferences;
  activeBottomNavItem: BottomNavItem;
  isEditingPreferences: boolean;
  isSettingsOpen: boolean;
  selectedPhotoIds: string[];
  likedRecommendations: string | null;
  dismissedRecommendations: string | null;
  introCompleted: boolean;
  isTripActive: boolean;
}

const defaultPreferences: TravelPreferences = {
  interests: ["monuments", "local_food"],
  travelPace: "balanced",
  budget: "medium",
};

const defaultAppSettings: AppSettings = {
  appLanguage: "pt",
  voiceGuidance: true,
  audioFeedback: true,
  notifications: true,
  locationContext: true,
  autoMemories: true,
};

const defaultVisibleSections: VisibleSections = {
  recommendations: true,
  nearby: true,
  places: true,
  memories: true,
  recentMoments: true,
  photos: true,
  album: true,
  audio: true,
  translation: true,
  transcriptions: true,
};

const alwaysShowOnboardingForTesting = false;

const normalizeTripName = (tripName: string) => {
  return tripName.trim() || "Sem nome";
};

const createCurrentTrip = (name = "Sem nome"): CurrentTrip => ({
  id: crypto.randomUUID(),
  name,
  startedAt: new Date().toLocaleString(),
  endedAt: null,
});

const preferenceInterestLabels: Record<string, string> = {
  monuments: "História",
  local_food: "Gastronomia",
  nature: "Natureza",
  architecture: "Arquitetura",
  nightlife: "Vida Noturna",
  local_culture: "Cultura Local",
  shopping: "Compras",
  photography: "Fotografia",
  adventure: "Aventura",
  beaches: "Praias",
};

const travelPaceLabels: Record<TravelPreferences["travelPace"], string> = {
  relaxed: "Relaxado",
  balanced: "Equilibrado",
  fast: "Rápido",
};

const budgetLabels: Record<TravelPreferences["budget"], string> = {
  low: "Baixo",
  medium: "Médio",
  high: "Alto",
};

export default function HomePage({ userId }: HomePageProps) {
  const { isDarkMode, toggleTheme } = useTheme();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);
  const [currentLocation, setCurrentLocation] =
    useState<CurrentLocation | null>(null);

  const getLocationQuality = (location: any) => {
    if (!location) return 0;

    if (location.address || location.street || location.placeName) return 3;

    if (location.city || location.name) return 2;

    if (location.lat && location.lng) return 1;

    return 0;
  };

  const updateCurrentLocation = (newLocation: any) => {
    setCurrentLocation((previousLocation) => {
      const previousQuality = getLocationQuality(previousLocation);
      const newQuality = getLocationQuality(newLocation);

      if (!previousLocation) return newLocation;

      if (newQuality >= previousQuality) {
        return newLocation;
      }

      return previousLocation;
    });
  };

  const getLocationTitle = (location: any) => {
    if (!location) return "A identificar local";

    return location.city || "Porto";
  };

  const getLocationSubtitle = (location: any) => {
    if (!location) return "A aguardar GPS...";

    if (location.address) return location.address;

    if (location.displayName && location.displayName !== location.city) {
      return location.displayName;
    }

    if (location.street && location.street !== location.city) {
      return location.street;
    }

    if (
      location.placeName &&
      location.city &&
      location.placeName !== location.city
    ) {
      return location.placeName;
    }

    if (location.lat && location.lng) {
      return `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;
    }

    return "Localização disponível";
  };

  const getTripDestination = (location: CurrentLocation | null) => {
    if (!location) return "A identificar cidade";

    const knownCityCountries: Record<string, string> = {
      Porto: "Porto, Portugal",
      Lisboa: "Lisboa, Portugal",
    };

    const cityFromDisplayName = location.displayName
      ?.split(",")
      .map((part) => part.trim())
      .reverse()
      .find((part) => knownCityCountries[part]);

    const city =
      location.city ||
      cityFromDisplayName ||
      (location.placeName && knownCityCountries[location.placeName]
        ? location.placeName
        : "");

    const country =
      location.country ||
      (location.displayName
        ?.split(",")
        .map((part) => part.trim())
        .at(-1) ??
        "") ||
      (city ? "Portugal" : "");

    if (city && country) return `${city}, ${country}`;
    if (city) return city;

    return "A identificar cidade";
  };

  const [isLocationMapOpen, setIsLocationMapOpen] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);

  const [visibleSections, setVisibleSections] = useState<VisibleSections>(
    () => {
      try {
        const saved = localStorage.getItem("travel-whisperer-visible-sections");

        return saved
          ? { ...defaultVisibleSections, ...JSON.parse(saved) }
          : defaultVisibleSections;
      } catch {
        return defaultVisibleSections;
      }
    },
  );

  const [visualDiscoveries, setVisualDiscoveries] = useState<VisualDiscovery[]>(
    [],
  );

  useEffect(() => {
    localStorage.setItem(
      "travel-whisperer-visible-sections",
      JSON.stringify(visibleSections),
    );
  }, [visibleSections]);

  const logIdCounter = useRef(Date.now());
  const newTripReturnStateRef = useRef<NewTripReturnState | null>(null);

  /* Live Translation */
  const [translationEnabled, setTranslationEnabled] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("English");
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem("travel-whisperer-app-settings");

      return saved
        ? { ...defaultAppSettings, ...JSON.parse(saved) }
        : defaultAppSettings;
    } catch {
      return defaultAppSettings;
    }
  });

  const addLog = useCallback((message: string, type: Log["type"] = "info") => {
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
  }, []);

  // Trip atual
  const [currentTrip, setCurrentTrip] = useState<CurrentTrip>(() => {
    try {
      const saved = localStorage.getItem("travel-whisperer-current-trip");
      if (!saved) return createCurrentTrip();

      const parsed = JSON.parse(saved) as Partial<CurrentTrip>;

      return {
        id: parsed.id ?? crypto.randomUUID(),
        name: normalizeTripName(parsed.name ?? "Sem nome"),
        startedAt: parsed.startedAt ?? new Date().toLocaleString(),
        endedAt: parsed.endedAt ?? null,
      };
    } catch {
      return createCurrentTrip();
    }
  });

  const [pastTrips, setPastTrips] = useState<
    Array<{
      id: string;
      name: string;
      locationLabel: string;
      startedAt: string;
      endedAt: string;
      photoCount: number;
      visitedPlacesCount: number;
      coverPhotoUrl?: string;
    }>
  >([]);

  const [isDeletingPastTrips, setIsDeletingPastTrips] = useState(false);
  const [selectedPastTripIds, setSelectedPastTripIds] = useState<string[]>([]);

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
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get("resetIntro") === "true") {
      localStorage.removeItem("travel-whisperer-intro-completed");
      window.history.replaceState({}, "", window.location.pathname);
      return false;
    }

    if (alwaysShowOnboardingForTesting) {
      return false;
    }

    return localStorage.getItem("travel-whisperer-intro-completed") === "true";
  });

  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeBottomNavItem, setActiveBottomNavItem] =
    useState<BottomNavItem>("dashboard");
  const [isTripActive, setIsTripActive] = useState(() => {
    try {
      const savedStatus = localStorage.getItem("travel-whisperer-trip-active");

      if (savedStatus !== null) return savedStatus === "true";

      const savedTrip = localStorage.getItem("travel-whisperer-current-trip");
      const savedTripPreferences = localStorage.getItem(
        "travel-whisperer-current-trip-preferences",
      );

      if (!savedTrip || !savedTripPreferences) return false;

      const parsed = JSON.parse(savedTrip) as Partial<CurrentTrip>;

      return parsed.endedAt === null;
    } catch {
      return false;
    }
  });
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>(() => {
    try {
      const saved = localStorage.getItem("travel-whisperer-itinerary");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [companionInteractions, setCompanionInteractions] = useState<
    CompanionInteraction[]
  >(() => {
    try {
      const saved = localStorage.getItem("travel-whisperer-companion");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isModeSheetOpen, setIsModeSheetOpen] = useState(false);
  const [isEditingTripPreferences, setIsEditingTripPreferences] =
    useState(false);
  const [tripDraftPreferences, setTripDraftPreferences] =
    useState<TravelPreferences>(preferences);

  const updateAppSetting = useCallback(
    <Key extends keyof AppSettings>(key: Key, value: AppSettings[Key]) => {
      setAppSettings((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [],
  );

  useEffect(() => {
    localStorage.setItem(
      "travel-whisperer-app-settings",
      JSON.stringify(appSettings),
    );
  }, [appSettings]);

  useEffect(() => {
    localStorage.setItem(
      "travel-whisperer-current-trip",
      JSON.stringify(currentTrip),
    );
  }, [currentTrip]);

  useEffect(() => {
    localStorage.setItem("travel-whisperer-trip-active", String(isTripActive));
  }, [isTripActive]);

  useEffect(() => {
    localStorage.setItem(
      "travel-whisperer-itinerary",
      JSON.stringify(itineraryItems),
    );
  }, [itineraryItems]);

  useEffect(() => {
    localStorage.setItem(
      "travel-whisperer-companion",
      JSON.stringify(companionInteractions),
    );
  }, [companionInteractions]);

  const saveTripName = useCallback(
    (tripName: string) => {
      const normalizedName = normalizeTripName(tripName);

      setCurrentTrip((prev) => ({
        ...prev,
        name: normalizedName,
      }));

      addLog(`Trip name saved: ${normalizedName}`, "success");
    },
    [addLog],
  );

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
    newTripReturnStateRef.current = null;
    setHasCompletedIntro(true);
    addLog("Intro completed", "success");
  }, [addLog]);

  const addRecommendationToItinerary = useCallback(
    (recommendation: RecommendationLikeItem, source: "smart" | "nearby") => {
      if (!currentTrip) {
        addLog(
          "Cannot add recommendation to itinerary: no active trip",
          "warning",
        );
        return;
      }

      setItineraryItems((prev) => {
        const alreadyExists = prev.some(
          (item) =>
            item.tripId === currentTrip.id && item.id === recommendation.id,
        );

        if (alreadyExists) {
          addLog(`Already in itinerary: ${recommendation.name}`, "info");
          return prev;
        }

        const newItem: ItineraryItem = {
          id: recommendation.id,
          name: recommendation.name,
          category: recommendation.category,
          description: recommendation.description,
          estimatedTime: recommendation.estimatedTime,
          budget: recommendation.budget,
          interests: recommendation.interests,
          reason: recommendation.reason,
          tripId: currentTrip.id,
          addedAt: new Date().toLocaleString(),
          source,
        };

        addLog(`Added to itinerary: ${recommendation.name}`, "success");

        return [...prev, newItem];
      });
    },
    [addLog, currentTrip],
  );

  const removeItineraryItem = useCallback(
    (item: ItineraryItem) => {
      if (!currentTrip) return;

      setItineraryItems((prev) =>
        prev.filter(
          (itineraryItem) =>
            !(
              itineraryItem.tripId === currentTrip.id &&
              itineraryItem.id === item.id
            ),
        ),
      );

      addLog(`Removed from itinerary: ${item.name}`, "info");
    },
    [addLog, currentTrip],
  );

  const startTripWithDraftPreferences = useCallback(() => {
    setPreferences(tripDraftPreferences);

    localStorage.setItem(
      "travel-whisperer-current-trip-preferences",
      JSON.stringify(tripDraftPreferences),
    );

    setIsEditingTripPreferences(false);
    setIsSettingsOpen(false);
    setIsEditingPreferences(false);
    setIsTripActive(true);
    setActiveBottomNavItem("companion");
    continueToApp();

    addLog("Trip started with custom preferences", "success");
  }, [addLog, continueToApp, tripDraftPreferences]);

  const startNewTrip = useCallback(() => {
    newTripReturnStateRef.current = {
      currentTrip,
      preferences,
      activeBottomNavItem,
      isEditingPreferences,
      isSettingsOpen,
      selectedPhotoIds,
      likedRecommendations: localStorage.getItem(
        "travel-whisperer-liked-recommendations",
      ),
      dismissedRecommendations: localStorage.getItem(
        "travel-whisperer-dismissed-recommendations",
      ),
      introCompleted: hasCompletedIntro,
      isTripActive,
    };

    localStorage.removeItem("travel-whisperer-intro-completed");
    localStorage.removeItem("travel-whisperer-liked-recommendations");
    localStorage.removeItem("travel-whisperer-dismissed-recommendations");
    localStorage.removeItem("travel-whisperer-current-trip");

    setCurrentTrip(createCurrentTrip());
    setTripDraftPreferences(preferences);
    setHasCompletedIntro(false);
    setIsTripActive(false);
    setIsEditingPreferences(false);
    setIsSettingsOpen(false);
    setActiveBottomNavItem("dashboard");
    setIsEditingTripPreferences(false);
    setSelectedPhotoIds([]);

    addLog("New trip started", "info");
  }, [
    activeBottomNavItem,
    addLog,
    currentTrip,
    hasCompletedIntro,
    isEditingPreferences,
    isSettingsOpen,
    isTripActive,
    preferences,
    selectedPhotoIds,
  ]);

  const cancelNewTrip = useCallback(() => {
    const returnState = newTripReturnStateRef.current;

    if (!returnState) return;

    setCurrentTrip(returnState.currentTrip);
    setPreferences(returnState.preferences);
    setHasCompletedIntro(returnState.introCompleted);
    setIsTripActive(returnState.isTripActive);
    setActiveBottomNavItem(returnState.activeBottomNavItem);
    setIsEditingPreferences(returnState.isEditingPreferences);
    setIsSettingsOpen(returnState.isSettingsOpen);
    setIsEditingTripPreferences(false);
    setSelectedPhotoIds(returnState.selectedPhotoIds);

    if (returnState.introCompleted) {
      localStorage.setItem("travel-whisperer-intro-completed", "true");
    } else {
      localStorage.removeItem("travel-whisperer-intro-completed");
    }

    localStorage.setItem(
      "travel-whisperer-preferences",
      JSON.stringify(returnState.preferences),
    );
    localStorage.setItem(
      "travel-whisperer-current-trip",
      JSON.stringify(returnState.currentTrip),
    );

    if (returnState.likedRecommendations) {
      localStorage.setItem(
        "travel-whisperer-liked-recommendations",
        returnState.likedRecommendations,
      );
    } else {
      localStorage.removeItem("travel-whisperer-liked-recommendations");
    }

    if (returnState.dismissedRecommendations) {
      localStorage.setItem(
        "travel-whisperer-dismissed-recommendations",
        returnState.dismissedRecommendations,
      );
    } else {
      localStorage.removeItem("travel-whisperer-dismissed-recommendations");
    }

    newTripReturnStateRef.current = null;
    addLog("New trip cancelled", "info");
  }, [addLog]);

  const endCurrentTrip = useCallback(() => {
    if (!isTripActive) {
      addLog("No active trip to finish", "warning");
      return;
    }

    const endedAt = new Date().toLocaleString();
    const finishedTrip: CurrentTrip = {
      ...currentTrip,
      endedAt,
    };

    setCurrentTrip(finishedTrip);
    setIsTripActive(false);
    setIsModeSheetOpen(false);
    setActiveBottomNavItem("dashboard");

    setPastTrips((prev) => {
      const alreadySaved = prev.some((trip) => trip.id === finishedTrip.id);

      if (alreadySaved) return prev;

      return [
        {
          id: finishedTrip.id,
          name: normalizeTripName(finishedTrip.name),
          locationLabel: getTripDestination(currentLocation),
          startedAt: finishedTrip.startedAt,
          endedAt,
          photoCount: photos.length,
          visitedPlacesCount: visitedPlaces.length,
          coverPhotoUrl: photos[0]?.url,
        },
        ...prev,
      ];
    });

    addLog(`Trip ended: ${normalizeTripName(finishedTrip.name)}`, "success");
  }, [
    addLog,
    currentLocation,
    currentTrip,
    isTripActive,
    photos,
    visitedPlaces,
  ]);

  const openCompanionFromTripButton = useCallback(() => {
    setActiveBottomNavItem("companion");
    setIsEditingPreferences(false);
    setIsSettingsOpen(false);
    setIsModeSheetOpen(false);
  }, []);

  const handleCenterNavAction = useCallback(() => {
    if (isTripActive) {
      openCompanionFromTripButton();
      return;
    }

    setIsModeSheetOpen(true);
  }, [isTripActive, openCompanionFromTripButton]);

  const togglePastTripSelection = (tripId: string) => {
    setSelectedPastTripIds((prev) =>
      prev.includes(tripId)
        ? prev.filter((id) => id !== tripId)
        : [...prev, tripId],
    );
  };

  const cancelPastTripsDeleteMode = () => {
    setIsDeletingPastTrips(false);
    setSelectedPastTripIds([]);
  };

  const deleteSelectedPastTrips = () => {
    if (selectedPastTripIds.length === 0) {
      addLog("No travel memories selected to delete", "warning");
      return;
    }

    setPastTrips((prev) =>
      prev.filter((trip) => !selectedPastTripIds.includes(trip.id)),
    );

    addLog(`${selectedPastTripIds.length} travel memories deleted`, "info");

    setSelectedPastTripIds([]);
    setIsDeletingPastTrips(false);
  };

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

  /* VISUAL DISCOVERIES STREAM */
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connect = () => {
      try {
        eventSource = new EventSource(
          `/api/visual-discoveries-stream?userId=${encodeURIComponent(userId)}`,
        );

        eventSource.onopen = () => {
          addLog("Connected to visual discoveries stream", "success");
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "connected") {
              setVisualDiscoveries(data.discoveries ?? []);
              return;
            }

            if (data.type !== "visual_discovery") return;

            setVisualDiscoveries((prev) => [data.discovery, ...prev]);
          } catch {
            addLog("Failed to parse visual discovery event", "error");
          }
        };

        eventSource.onerror = () => {
          addLog(
            "Visual discoveries stream disconnected, reconnecting...",
            "warning",
          );
          eventSource?.close();
          setTimeout(connect, 3000);
        };
      } catch {
        addLog("Failed to connect to visual discoveries stream", "error");
      }
    };

    connect();

    return () => {
      eventSource?.close();
    };
  }, [userId]);

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
          addLog(
            "Visited places stream disconnected, reconnecting...",
            "warning",
          );
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
              updateCurrentLocation(data.location ?? null);
              return;
            }

            if (data.type !== "location_update") return;

            console.log("[Location Debug] incoming location:", data.location);
            console.log("[Location Debug] current location:", currentLocation);

            updateCurrentLocation(data.location);
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

  useEffect(() => {
    if (!hasCompletedIntro) return;

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [
    activeBottomNavItem,
    isEditingPreferences,
    isSettingsOpen,
    hasCompletedIntro,
  ]);

  const getBottomNavClass = (item: BottomNavItem) =>
    item === activeBottomNavItem
      ? "tw-bottom-nav-item tw-bottom-nav-item-active"
      : "tw-bottom-nav-item";

  const renderTripSetupSummary = () => {
    const selectedInterestLabels = tripDraftPreferences.interests
      .map((interest) => preferenceInterestLabels[interest])
      .filter(Boolean);

    const tripNameValue = currentTrip?.name ?? "Sem nome";

    return (
      <main className="tw-page tw-trip-setup-page">
        <section className="tw-trip-setup-card">
          <button
            type="button"
            className="tw-trip-setup-back"
            onClick={cancelNewTrip}
          >
            ← Voltar
          </button>

          <div className="tw-trip-setup-header">
            <span className="tw-trip-setup-kicker">Nova viagem</span>

            <h1>Criar viagem</h1>

            <p>
              Vamos usar as tuas preferências atuais para preparar uma
              experiência personalizada. Podes editar tudo antes de começar.
            </p>
          </div>

          <div className="tw-trip-setup-content">
            <div className="tw-trip-setup-section">
              <label className="tw-trip-setup-label" htmlFor="trip-setup-name">
                Nome da viagem
              </label>

              <input
                id="trip-setup-name"
                className="tw-trip-setup-input"
                type="text"
                value={tripNameValue}
                maxLength={60}
                placeholder="Ex: Porto com amigos"
                onChange={(event) => saveTripName(event.target.value)}
              />
            </div>

            <div className="tw-trip-setup-section">
              <div className="tw-trip-setup-preferences-header">
                <div>
                  <span className="tw-trip-setup-label">
                    Preferências desta viagem
                  </span>

                  <p>Baseadas nas preferências guardadas no teu perfil.</p>
                </div>

                <button
                  type="button"
                  className="tw-trip-setup-edit"
                  onClick={() => setIsEditingTripPreferences(true)}
                >
                  Editar
                </button>
              </div>

              <div className="tw-trip-setup-summary">
                <div className="tw-trip-setup-chip-list">
                  {selectedInterestLabels.length > 0 ? (
                    selectedInterestLabels.map((label) => (
                      <span key={label} className="tw-trip-setup-chip">
                        {label}
                      </span>
                    ))
                  ) : (
                    <span className="tw-trip-setup-empty">
                      Nenhum interesse selecionado
                    </span>
                  )}
                </div>

                <div className="tw-trip-setup-details">
                  <span>
                    Ritmo:{" "}
                    <strong>
                      {travelPaceLabels[tripDraftPreferences.travelPace]}
                    </strong>
                  </span>

                  <span>
                    Orçamento:{" "}
                    <strong>{budgetLabels[tripDraftPreferences.budget]}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="tw-trip-setup-actions">
            <button
              type="button"
              className="tw-trip-setup-secondary"
              onClick={() => setIsEditingTripPreferences(true)}
            >
              Editar preferências
            </button>

            <button
              type="button"
              className="tw-trip-setup-primary"
              onClick={startTripWithDraftPreferences}
            >
              Começar viagem
            </button>
          </div>
        </section>
      </main>
    );
  };

  const renderBottomNav = () => (
    <>
      <nav className="tw-bottom-nav" aria-label="Navegação principal">
        <button
          type="button"
          className={getBottomNavClass("dashboard")}
          onClick={() => {
            setActiveBottomNavItem("dashboard");
            setIsEditingPreferences(false);
            setIsSettingsOpen(false);
          }}
        >
          <Home className="tw-bottom-nav-icon" />
          <span>Início</span>
        </button>
        <button
          type="button"
          className={getBottomNavClass("recommendations")}
          onClick={() => {
            setActiveBottomNavItem("recommendations");
            setVisibleSections((prev) => ({
              ...prev,
              recommendations: true,
              nearby: true,
            }));
            setIsEditingPreferences(false);
            setIsSettingsOpen(false);
          }}
        >
          <Compass className="tw-bottom-nav-icon" />
          <span>Explorar</span>
        </button>

        <button
          type="button"
          className={`tw-bottom-nav-plus ${
            isTripActive ? "tw-bottom-nav-plus-ai" : ""
          }`}
          onClick={handleCenterNavAction}
          aria-label={
            isTripActive
              ? "Abrir companion AI da viagem"
              : "Criar ou abrir ação rápida"
          }
          title={isTripActive ? "Companion AI" : "Nova viagem"}
        >
          {isTripActive ? (
            <Bot className="tw-bottom-nav-plus-icon" />
          ) : (
            <Plus className="tw-bottom-nav-plus-icon" />
          )}
        </button>

        <button
          type="button"
          className={`tw-bottom-nav-item ${
            activeBottomNavItem === "itinerary"
              ? "tw-bottom-nav-item-active"
              : ""
          }`}
          onClick={() => {
            setActiveBottomNavItem("itinerary");
            setIsEditingPreferences(false);
            setIsSettingsOpen(false);
          }}
          aria-label="Abrir roteiro"
        >
          <Map className="tw-bottom-nav-icon" />
          <span>Roteiro</span>
        </button>

        <button
          type="button"
          className={getBottomNavClass("memories")}
          onClick={() => {
            setActiveBottomNavItem("memories");
            setVisibleSections((prev) => ({
              ...prev,
              memories: true,
              recentMoments: true,
            }));
            setIsEditingPreferences(false);
            setIsSettingsOpen(false);
          }}
        >
          <Heart className="tw-bottom-nav-icon" />
          <span>Memórias</span>
        </button>
      </nav>

      {isModeSheetOpen && !isTripActive && (
        <div
          className="tw-mode-sheet-backdrop"
          role="presentation"
          onClick={() => setIsModeSheetOpen(false)}
        >
          <section
            className="tw-mode-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Escolher modo de utilização"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="tw-mode-sheet-handle" />

            <button
              type="button"
              className="tw-mode-sheet-close"
              onClick={() => setIsModeSheetOpen(false)}
              aria-label="Fechar"
            >
              ×
            </button>

            <div className="tw-mode-sheet-header">
              <h2>Como queres usar o Travel Whisperer?</h2>
              <p>
                Escolhe entre explorar livremente ou iniciar uma viagem
                personalizada.
              </p>
            </div>

            <div className="tw-mode-options">
              <article className="tw-mode-card">
                <div className="tw-mode-card-text">
                  <span className="tw-mode-label">Modo livre</span>
                  <h3>Explorar agora</h3>
                  <p>
                    Usa recomendações, câmara, tradução e outras funcionalidades
                    sem iniciar uma viagem.
                  </p>
                </div>

                <div className="tw-mode-card-icon" aria-hidden="true">
                  ✨
                </div>

                <button
                  type="button"
                  className="tw-mode-primary-button"
                  onClick={() => setIsModeSheetOpen(false)}
                >
                  Explorar livremente
                  <span aria-hidden="true">→</span>
                </button>
              </article>

              <article className="tw-mode-card">
                <div className="tw-mode-card-text">
                  <span className="tw-mode-label">Modo viagem</span>
                  <h3>Iniciar viagem</h3>
                  <p>
                    Configura uma viagem com ritmo, orçamento e preferências
                    próprias. Guarda memórias e acompanha o teu percurso.
                  </p>
                </div>

                <div className="tw-mode-card-icon" aria-hidden="true">
                  🗺️
                </div>

                <button
                  type="button"
                  className="tw-mode-secondary-button"
                  onClick={() => {
                    setIsModeSheetOpen(false);
                    startNewTrip();
                  }}
                >
                  Criar viagem
                  <span aria-hidden="true">→</span>
                </button>
              </article>
            </div>
          </section>
        </div>
      )}
    </>
  );

  if (!hasCompletedIntro) {
    const isCreatingNewTrip = Boolean(newTripReturnStateRef.current);

    if (!isCreatingNewTrip) {
      return (
        <OnboardingFlow
          preferences={preferences}
          initialAppLanguage={appSettings.appLanguage}
          initialTargetLanguage={targetLanguage}
          onSavePreferences={savePreferences}
          onAppLanguageChange={(language) =>
            updateAppSetting("appLanguage", language)
          }
          onTargetLanguageChange={setTargetLanguage}
          onComplete={() => {
            continueToApp();
            setIsEditingPreferences(false);
            setIsSettingsOpen(false);
          }}
        />
      );
    }

    if (!isEditingTripPreferences) {
      return renderTripSetupSummary();
    }

    return (
      <IntroPreferences
        preferences={tripDraftPreferences}
        onSave={setTripDraftPreferences}
        tripName={currentTrip?.name ?? "Sem nome"}
        onTripNameSave={saveTripName}
        onBack={() => {
          setIsEditingTripPreferences(false);
        }}
        onContinue={() => {
          setIsEditingTripPreferences(false);
        }}
        continueLabel="Voltar ao resumo"
        saveLabel="Guardar só nesta viagem"
        savedLabel="Guardado nesta viagem"
        showContinueButton
        showSaveOnlyWhenDirty
        createTripFlow
      />
    );
  }

  if (isSettingsOpen) {
    return (
      <main className="tw-page tw-settings-page">
        <section
          className="tw-settings-shell"
          aria-label="Definições da aplicação"
        >
          <header className="tw-settings-header">
            <div>
              <p className="tw-settings-kicker">Definições</p>
              <h1 className="tw-settings-title">Aplicação</h1>
            </div>

            <p className="tw-settings-description">
              Personaliza a experiência geral da Travel Whisperer.
            </p>
          </header>

          <div className="tw-settings-list">
            <section className="tw-settings-group">
              <h2>Aparência</h2>

              <div className="tw-settings-row">
                <div className="tw-settings-row-icon">
                  {isDarkMode ? <Moon /> : <Sun />}
                </div>

                <div className="tw-settings-row-copy">
                  <h3>Modo escuro</h3>
                  <p>Alterna entre visual claro e escuro.</p>
                </div>

                <Switch
                  checked={isDarkMode}
                  onCheckedChange={toggleTheme}
                  aria-label="Alternar modo escuro"
                />
              </div>

              <label className="tw-settings-row">
                <div className="tw-settings-row-icon">
                  <Languages />
                </div>

                <div className="tw-settings-row-copy">
                  <h3>Idioma da aplicação</h3>
                  <p>Define o idioma usado no painel web.</p>
                </div>

                <select
                  className="tw-settings-select"
                  value={appSettings.appLanguage}
                  onChange={(event) =>
                    updateAppSetting(
                      "appLanguage",
                      event.target.value as AppSettings["appLanguage"],
                    )
                  }
                >
                  <option value="pt">Português</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                </select>
              </label>
            </section>

            <section className="tw-settings-group">
              <h2>Dashboard</h2>

              <div className="tw-settings-row">
                <div className="tw-settings-row-icon">
                  <Compass />
                </div>

                <div className="tw-settings-row-copy">
                  <h3>Sugestões e locais por perto</h3>
                  <p>Mostra recomendações inteligentes e atrações próximas.</p>
                </div>

                <Switch
                  checked={
                    visibleSections.recommendations && visibleSections.nearby
                  }
                  onCheckedChange={(checked) =>
                    setVisibleSections((prev) => ({
                      ...prev,
                      recommendations: checked,
                      nearby: checked,
                    }))
                  }
                  aria-label="Mostrar sugestões no dashboard"
                />
              </div>

              <div className="tw-settings-row">
                <div className="tw-settings-row-icon">
                  <MapPin />
                </div>

                <div className="tw-settings-row-copy">
                  <h3>Lugares guardados</h3>
                  <p>Mostra os locais visitados automaticamente.</p>
                </div>

                <Switch
                  checked={visibleSections.places}
                  onCheckedChange={(checked) =>
                    setVisibleSections((prev) => ({
                      ...prev,
                      places: checked,
                    }))
                  }
                  aria-label="Mostrar lugares guardados"
                />
              </div>

              <div className="tw-settings-row">
                <div className="tw-settings-row-icon">
                  <Heart />
                </div>

                <div className="tw-settings-row-copy">
                  <h3>Memórias da viagem</h3>
                  <p>Mostra resumos, momentos recentes e viagens anteriores.</p>
                </div>

                <Switch
                  checked={
                    visibleSections.memories && visibleSections.recentMoments
                  }
                  onCheckedChange={(checked) =>
                    setVisibleSections((prev) => ({
                      ...prev,
                      memories: checked,
                      recentMoments: checked,
                    }))
                  }
                  aria-label="Mostrar memórias da viagem"
                />
              </div>

              <div className="tw-settings-row">
                <div className="tw-settings-row-icon">
                  <Camera />
                </div>

                <div className="tw-settings-row-copy">
                  <h3>Fotos e álbuns</h3>
                  <p>Mostra a galeria de fotos e o construtor de álbuns.</p>
                </div>

                <Switch
                  checked={visibleSections.photos && visibleSections.album}
                  onCheckedChange={(checked) =>
                    setVisibleSections((prev) => ({
                      ...prev,
                      photos: checked,
                      album: checked,
                    }))
                  }
                  aria-label="Mostrar fotos e álbuns"
                />
              </div>

              <div className="tw-settings-row">
                <div className="tw-settings-row-icon">
                  <AudioLines />
                </div>

                <div className="tw-settings-row-copy">
                  <h3>Áudio e transcrições</h3>
                  <p>Mostra controlos de áudio, tradução e transcrições.</p>
                </div>

                <Switch
                  checked={
                    visibleSections.audio &&
                    visibleSections.translation &&
                    visibleSections.transcriptions
                  }
                  onCheckedChange={(checked) =>
                    setVisibleSections((prev) => ({
                      ...prev,
                      audio: checked,
                      translation: checked,
                      transcriptions: checked,
                    }))
                  }
                  aria-label="Mostrar áudio e transcrições"
                />
              </div>
            </section>

            <section className="tw-settings-group">
              <h2>Óculos</h2>

              <div className="tw-settings-row">
                <div className="tw-settings-row-icon">
                  <Navigation />
                </div>

                <div className="tw-settings-row-copy">
                  <h3>Guia por voz</h3>
                  <p>Permite instruções curtas durante a viagem.</p>
                </div>

                <Switch
                  checked={appSettings.voiceGuidance}
                  onCheckedChange={(checked) =>
                    updateAppSetting("voiceGuidance", checked)
                  }
                  aria-label="Ativar guia por voz"
                />
              </div>

              <div className="tw-settings-row">
                <div className="tw-settings-row-icon">
                  <Volume2 />
                </div>

                <div className="tw-settings-row-copy">
                  <h3>Respostas áudio</h3>
                  <p>Controla confirmações e respostas nos Mentra Live.</p>
                </div>

                <Switch
                  checked={appSettings.audioFeedback}
                  onCheckedChange={(checked) =>
                    updateAppSetting("audioFeedback", checked)
                  }
                  aria-label="Ativar respostas áudio"
                />
              </div>

              <div className="tw-settings-row">
                <div className="tw-settings-row-icon">
                  <Bell />
                </div>

                <div className="tw-settings-row-copy">
                  <h3>Notificações discretas</h3>
                  <p>
                    Mostra alertas importantes sem interromper a exploração.
                  </p>
                </div>

                <Switch
                  checked={appSettings.notifications}
                  onCheckedChange={(checked) =>
                    updateAppSetting("notifications", checked)
                  }
                  aria-label="Ativar notificações discretas"
                />
              </div>
            </section>

            <section className="tw-settings-group">
              <h2>Privacidade e dados</h2>

              <div className="tw-settings-row">
                <div className="tw-settings-row-icon">
                  <ShieldCheck />
                </div>

                <div className="tw-settings-row-copy">
                  <h3>Contexto de localização</h3>
                  <p>Usa a localização para recomendações e memórias.</p>
                </div>

                <Switch
                  checked={appSettings.locationContext}
                  onCheckedChange={(checked) =>
                    updateAppSetting("locationContext", checked)
                  }
                  aria-label="Ativar contexto de localização"
                />
              </div>

              <div className="tw-settings-row">
                <div className="tw-settings-row-icon">
                  <Cloud />
                </div>

                <div className="tw-settings-row-copy">
                  <h3>Memórias automáticas</h3>
                  <p>Organiza fotos, locais e contexto durante a viagem.</p>
                </div>

                <Switch
                  checked={appSettings.autoMemories}
                  onCheckedChange={(checked) =>
                    updateAppSetting("autoMemories", checked)
                  }
                  aria-label="Ativar memórias automáticas"
                />
              </div>
            </section>
          </div>
        </section>
        {renderBottomNav()}
      </main>
    );
  }

  if (isEditingPreferences) {
    return (
      <main id="profile" className="tw-page tw-profile-page">
        <IntroPreferences
          preferences={preferences}
          onSave={savePreferences}
          tripName={currentTrip.name}
          onTripNameSave={saveTripName}
          defaultOpen
          panel
          saveLabel="Guardar alterações"
          savedLabel="Alterações guardadas"
          showContinueButton={false}
          showSaveOnlyWhenDirty
        />
        {renderBottomNav()}
      </main>
    );
  }

  const activeTripLocation = getTripDestination(currentLocation);

  const activeTripName = normalizeTripName(currentTrip.name);

  const locationMapUrl = currentLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${currentLocation.lng - 0.004}%2C${currentLocation.lat - 0.004}%2C${currentLocation.lng + 0.004}%2C${currentLocation.lat + 0.004}&layer=mapnik&marker=${currentLocation.lat}%2C${currentLocation.lng}`
    : "";

  const homeLocationCity = currentLocation
    ? getLocationTitle(currentLocation)
    : "Porto";

  const homeLocationCoordinates = currentLocation
    ? `${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}`
    : "41.19013, -8.53932";

  return (
    <main id="dashboard" className="tw-page">
      {activeBottomNavItem !== "recommendations" && (
        <header className="tw-header">
          <div className="tw-header-top">
            <div className="tw-brand">
              <div className="tw-brand-icon">
                <Compass className="tw-brand-icon-svg" />
              </div>

              <div className="tw-brand-copy">
                <h1 className="tw-title">Travel Whisperer</h1>
              </div>
            </div>

            <div className="tw-header-menu">
              <button
                type="button"
                className={`tw-round-action ${
                  activeBottomNavItem === "audio" ? "tw-round-action-active" : ""
                }`}
                onClick={() => {
                  setActiveBottomNavItem("audio");
                  setVisibleSections((prev) => ({
                    ...prev,
                    audio: true,
                    transcriptions: true,
                  }));
                  setIsEditingPreferences(false);
                  setIsSettingsOpen(false);
                }}
                aria-label="Abrir áudio"
              >
                <Mic className="tw-round-action-icon" />
              </button>

              <button
                type="button"
                className={`tw-round-action ${
                  activeBottomNavItem === "profile"
                    ? "tw-round-action-active"
                    : ""
                }`}
                onClick={() => {
                  setActiveBottomNavItem("profile");
                  setIsSettingsOpen(false);
                  setIsEditingPreferences(true);
                }}
                aria-label="Abrir perfil"
              >
                <User className="tw-round-action-icon" />
              </button>

              <button
                type="button"
                className="tw-round-action"
                onClick={() => {
                  setIsEditingPreferences(false);
                  setIsSettingsOpen(true);
                }}
                aria-label="Abrir definições"
              >
                <Settings className="tw-round-action-icon" />
              </button>
            </div>
          </div>
        </header>
      )}

      <div
        className="tw-page-view"
        hidden={activeBottomNavItem !== "dashboard"}
      >
        {/* HERO */}
        <section className="tw-hero">
          <div className="tw-hero-art" aria-hidden="true">
            <span className="tw-hero-sun" />
            <span className="tw-hero-coast" />
            <span className="tw-hero-mountain" />
            <span className="tw-hero-route" />
            <span className="tw-hero-pin" />
          </div>

          <div className="tw-hero-content">
            <h2 className="tw-hero-title">
              Viagem inteligente. Sempre contigo.
            </h2>

            <p className="tw-hero-description">
              Informação e assistência discreta para cada passo da tua viagem.
            </p>

            <div className="tw-hero-tags tw-hero-actions">
              <span className="tw-feature-chip tw-hero-action-chip">
                <Mic className="tw-feature-icon tw-feature-icon-voice" />
                <span>Voz</span>
              </span>

              <span className="tw-feature-chip tw-hero-action-chip">
                <Camera className="tw-feature-icon tw-feature-icon-camera" />
                <span>Câmara</span>
              </span>

              <span className="tw-feature-chip tw-hero-action-chip">
                <MapPin className="tw-feature-icon tw-feature-icon-gps" />
                <span>GPS</span>
              </span>

              <span className="tw-feature-chip tw-hero-action-chip">
                <Sparkles className="tw-feature-icon tw-feature-icon-ai" />
                <span>AI</span>
              </span>
            </div>
          </div>
        </section>

        {/* LOCATION */}
        <button
          type="button"
          className="tw-location-card"
          onClick={() => currentLocation && setIsLocationMapOpen(true)}
          aria-label="Abrir mapa da localização atual"
        >
          <span className="tw-location-content">
            <span className="tw-location-badge">
              <span className="tw-location-badge-dot" />
              Online
            </span>

            <span className="tw-location-label">Localização atual</span>

            <strong className="tw-location-city">{homeLocationCity}</strong>

            <span className="tw-location-coordinates">
              <MapPin className="tw-location-pin-icon" />
              {homeLocationCoordinates}
            </span>
          </span>

          <span className="tw-location-map-preview" aria-hidden="true">
            <span className="tw-map-water" />
            <span className="tw-map-road tw-map-road-one" />
            <span className="tw-map-road tw-map-road-two" />
            <span className="tw-map-road tw-map-road-three" />
            <span className="tw-map-label tw-map-label-city">
              {homeLocationCity}
            </span>
            <span className="tw-map-label tw-map-label-river">Ribeira</span>
            <span className="tw-map-label tw-map-label-garden">Jardins</span>
            <span className="tw-map-current-pin" />
          </span>
        </button>

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
                  <h2>{getLocationTitle(currentLocation)}</h2>
                  <p>{getLocationSubtitle(currentLocation)}</p>
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

        {isTripActive && (
          <section className="tw-active-trip-card" aria-label="Viagem atual">
            <div className="tw-active-trip-main">
              <div className="tw-active-trip-icon" aria-hidden="true">
                <Bot className="tw-active-trip-icon-svg" />
              </div>

              <div className="tw-active-trip-copy">
                <span className="tw-active-trip-kicker">Viagem ativa</span>
                <h2>{activeTripName}</h2>
                <p>
                  O Companion AI está pronto para acompanhar esta viagem,
                  guardar contexto e ajudar nas próximas decisões.
                </p>
              </div>
            </div>

            <div className="tw-active-trip-actions">
              <button
                type="button"
                className="tw-active-trip-primary"
                onClick={openCompanionFromTripButton}
              >
                Abrir companion
              </button>

              <button
                type="button"
                className="tw-active-trip-danger"
                onClick={endCurrentTrip}
              >
                Terminar viagem
              </button>
            </div>
          </section>
        )}

        {/* STATS */}
        <section className="tw-stats-grid">
          <button
            type="button"
            className="tw-stat-card tw-stat-card-link"
            aria-label="Abrir página de memórias e fotos"
            onClick={() => {
              setActiveBottomNavItem("memories");
              setVisibleSections((prev) => ({
                ...prev,
                photos: true,
                album: true,
                recentMoments: true,
              }));
            }}
          >
            <div className="tw-stat-icon">
              <Camera className="tw-stat-icon-svg" />
            </div>

            <div className="tw-stat-copy">
              <strong className="tw-stat-value">{photos.length}</strong>
              <span className="tw-stat-label">Fotos</span>
              <span className="tw-stat-subtext">Captura o mundo</span>
            </div>
          </button>

          <button
            type="button"
            className="tw-stat-card tw-stat-card-link"
            aria-label="Abrir página de lugares e exploração"
            onClick={() => {
              setActiveBottomNavItem("recommendations");
              setVisibleSections((prev) => ({
                ...prev,
                places: true,
              }));
            }}
          >
            <div className="tw-stat-icon tw-stat-icon-blue">
              <MapPin className="tw-stat-icon-svg" />
            </div>

            <div className="tw-stat-copy">
              <strong className="tw-stat-value">{visitedPlaces.length}</strong>
              <span className="tw-stat-label">Lugares</span>
              <span className="tw-stat-subtext">Descobre mais</span>
            </div>
          </button>

          <button
            type="button"
            className="tw-stat-card tw-stat-card-link"
            aria-label="Abrir página de áudio e transcrições"
            onClick={() => {
              setActiveBottomNavItem("audio");
              setVisibleSections((prev) => ({
                ...prev,
                audio: true,
                transcriptions: true,
              }));
            }}
          >
            <div className="tw-stat-icon tw-stat-icon-green">
              <FileText className="tw-stat-icon-svg" />
            </div>

            <div className="tw-stat-copy">
              <strong className="tw-stat-value">{transcriptions.length}</strong>
              <span className="tw-stat-label">Transcrições</span>
              <span className="tw-stat-subtext">Tudo organizado</span>
            </div>
          </button>
        </section>
      </div>

      <div
        className="tw-page-view"
        hidden={activeBottomNavItem !== "recommendations"}
      >
        <ExplorePage
          preferences={preferences}
          currentLocation={currentLocation}
          onLog={addLog}
          onAddToItinerary={addRecommendationToItinerary}
        />
      </div>

      <div
        className="tw-page-view"
        hidden={activeBottomNavItem !== "itinerary"}
      >
        <ItineraryPage
          currentTrip={currentTrip}
          items={
            currentTrip
              ? itineraryItems.filter((item) => item.tripId === currentTrip.id)
              : []
          }
          budgetLabels={budgetLabels}
          preferenceInterestLabels={preferenceInterestLabels}
          onRemoveItem={removeItineraryItem}
          onGoToRecommendations={() =>
            setActiveBottomNavItem("recommendations")
          }
        />
      </div>

      <div
        className="tw-page-view"
        hidden={activeBottomNavItem !== "companion"}
      >
        <CompanionPage
          tripName={currentTrip?.name ?? "Viagem atual"}
          interactions={
            currentTrip
              ? companionInteractions.filter(
                  (interaction) =>
                    interaction.tripId === currentTrip.id ||
                    interaction.tripId === "current-trip",
                )
              : companionInteractions
          }
          onContinue={() => setActiveBottomNavItem("dashboard")}
        />
      </div>

      <div className="tw-page-view" hidden={activeBottomNavItem !== "memories"}>
        {visibleSections.memories && (
          <MemoriesPage
            photos={photos}
            places={visitedPlaces}
            transcriptions={transcriptions}
            visualDiscoveries={visualDiscoveries}
            pastTrips={pastTrips}
            currentTripName={activeTripName}
            currentTripLocation={activeTripLocation}
            selectedPhotoIds={selectedPhotoIds}
            selectedPastTripIds={selectedPastTripIds}
            isDeletingPastTrips={isDeletingPastTrips}
            userId={userId}
            onTogglePhoto={togglePhotoSelection}
            onClearPhotoSelection={() => setSelectedPhotoIds([])}
            onLog={addLog}
            onTogglePastTripSelection={togglePastTripSelection}
            onStartPastTripsDeleteMode={() => setIsDeletingPastTrips(true)}
            onCancelPastTripsDeleteMode={cancelPastTripsDeleteMode}
            onDeleteSelectedPastTrips={deleteSelectedPastTrips}
          />
        )}
      </div>
      <div className="tw-page-view" hidden={activeBottomNavItem !== "audio"}>
        {/* AUDIO */}
        {visibleSections.audio && (
          <section id="audio" className="tw-section">
            <AudioControls userId={userId} onLog={addLog} />
          </section>
        )}

        {/* LIVE TRANSLATION */}
        {visibleSections.translation && (
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
        )}

        {/* TRANSCRIPTIONS */}
        {visibleSections.transcriptions && (
          <section id="transcriptions" className="tw-section">
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
        )}
      </div>

      {renderBottomNav()}
    </main>
  );
}
