import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type TouchEvent,
} from "react";
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
  Map as MapIcon,
  Mic,
  X,
  Glasses,
  Info,
  SmilePlus,
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
import { onboardingInterestOptions } from "./components/onboarding/OnboardingInterestsStep";

import {
  TranscriptionFeed,
  type Transcription,
} from "./components/TranscriptionFeed";

import {
  CompanionPage,
  type CompanionInteraction,
} from "./components/CompanionPage";
import { CompanionActionSheet } from "./components/CompanionActionSheet";
import { PullToPlusIndicator } from "./components/PullToPlusIndicator";
import { SmartGlassesGuide } from "./components/onboarding/SmartGlassesGuide";
import {
  TripAdventurePreferencesStep,
  type TripAdjustStep,
} from "./components/TripAdventurePreferencesStep";
import { TripDestinationStep } from "./components/TripDestinationStep";
import type {
  AssistantStyle,
  DetailLevel,
} from "./components/onboarding/OnboardingAssistantStep";

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
  tripId?: string;
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
  | "companion"
  | "newTrip";

interface CurrentTrip {
  id: string;
  name: string;
  destination?: string;
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
  image?: string;
  imageUrl?: string;
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

type TripPreferenceSource = "base" | "custom";

interface StoredUserProfile {
  name?: string;
  assistantStyle?: AssistantStyle;
  detailLevel?: DetailLevel;
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
const PULL_TO_PLUS_THRESHOLD = 120;
const PULL_TO_PLUS_MAX_DISTANCE = 140;

const normalizeTripName = (tripName: string) => {
  return tripName.trim() || "Sem nome";
};

const createCurrentTrip = (
  name = "Sem nome",
  destination = "",
): CurrentTrip => ({
  id: crypto.randomUUID(),
  name,
  destination,
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

const userProfileStorageKey = "travel-whisperer-user-profile";

const assistantStyleLabels: Record<
  AssistantStyle,
  { title: string; description: string }
> = {
  localFriend: {
    title: "Amigo Local",
    description: "Interações informais e dicas autênticas",
  },
  storyteller: {
    title: "Contador de histórias",
    description: "Narrativas, lendas e contexto cultural",
  },
  expertGuide: {
    title: "Guia especialista",
    description: "Factos, história e explicações profundas",
  },
  curiousExplorer: {
    title: "Explorador curioso",
    description: "Sugestões alternativas e segredos escondidos",
  },
};

const detailLevelLabels: Record<DetailLevel, string> = {
  quick: "Curto",
  balanced: "Equilibrado",
  complete: "Completo",
};

const assistantStyleValues: AssistantStyle[] = [
  "localFriend",
  "storyteller",
  "expertGuide",
  "curiousExplorer",
];

const detailLevelValues: DetailLevel[] = ["quick", "balanced", "complete"];

interface StoredTripPreferenceMeta {
  assistantStyle?: AssistantStyle;
  detailLevel?: DetailLevel;
  source?: TripPreferenceSource;
}

const getStoredUserProfile = (): StoredUserProfile => {
  try {
    const saved = localStorage.getItem(userProfileStorageKey);
    if (!saved) return {};

    const parsed = JSON.parse(saved) as Partial<StoredUserProfile>;
    const assistantStyle = assistantStyleValues.includes(
      parsed.assistantStyle as AssistantStyle,
    )
      ? parsed.assistantStyle
      : undefined;
    const detailLevel = detailLevelValues.includes(
      parsed.detailLevel as DetailLevel,
    )
      ? parsed.detailLevel
      : undefined;

    return {
      name: parsed.name,
      assistantStyle,
      detailLevel,
    };
  } catch {
    return {};
  }
};

const updateStoredUserProfile = (updates: Partial<StoredUserProfile>) => {
  try {
    const saved = localStorage.getItem(userProfileStorageKey);
    const current = saved ? JSON.parse(saved) : {};

    localStorage.setItem(
      userProfileStorageKey,
      JSON.stringify({
        ...current,
        ...updates,
      }),
    );
  } catch {
    localStorage.setItem(userProfileStorageKey, JSON.stringify(updates));
  }
};

const hasStoredUserProfile = () => {
  const profile = getStoredUserProfile();

  return Boolean(
    profile.name?.trim() || profile.assistantStyle || profile.detailLevel,
  );
};

const getStoredCurrentTripPreferenceMeta = (): StoredTripPreferenceMeta => {
  try {
    const saved = localStorage.getItem(
      "travel-whisperer-current-trip-preferences",
    );

    if (!saved) return {};

    const parsed = JSON.parse(saved) as Partial<
      StoredTripPreferenceMeta & TravelPreferences
    >;
    const assistantStyle = assistantStyleValues.includes(
      parsed.assistantStyle as AssistantStyle,
    )
      ? parsed.assistantStyle
      : undefined;
    const detailLevel = detailLevelValues.includes(
      parsed.detailLevel as DetailLevel,
    )
      ? parsed.detailLevel
      : undefined;
    const source =
      parsed.source === "base" || parsed.source === "custom"
        ? parsed.source
        : undefined;

    return {
      assistantStyle,
      detailLevel,
      source,
    };
  } catch {
    return {};
  }
};

const getProfileInitial = (name?: string) => {
  const trimmedName = name?.trim();
  return trimmedName ? trimmedName.charAt(0).toUpperCase() : "T";
};

const isLocalDataImage = (value?: string) =>
  typeof value === "string" && value.startsWith("data:image/");

const getStorageSafeCompanionInteractions = (
  interactions: CompanionInteraction[],
): CompanionInteraction[] =>
  interactions.map((interaction) => {
    const safeInteraction = { ...interaction };

    if (isLocalDataImage(safeInteraction.imageUrl)) {
      delete safeInteraction.imageUrl;
    }

    if (isLocalDataImage(safeInteraction.photoDataUrl)) {
      delete safeInteraction.photoDataUrl;
    }

    return safeInteraction;
  });

const parseDateValue = (value?: string | null) => {
  if (!value) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatTripDate = (value?: string | null) => {
  if (!value) return "";

  const parsed = parseDateValue(value);
  if (!parsed) return value.split(",")[0]?.trim() || value;

  return new Intl.DateTimeFormat("pt-PT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
};

const formatTripDateRange = (trip: CurrentTrip) => {
  const start = formatTripDate(trip.startedAt);

  if (!trip.endedAt) return start ? `Desde ${start}` : "Viagem em curso";

  const end = formatTripDate(trip.endedAt);
  return [start, end].filter(Boolean).join(" - ");
};

const getTimeValue = (value?: string | null) => {
  const parsed = parseDateValue(value);
  return parsed?.getTime() ?? 0;
};

const formatRelativeTime = (value?: string | null) => {
  const timestamp = getTimeValue(value);

  if (!timestamp) return value || "Agora";

  const diffMs = Date.now() - timestamp;
  if (diffMs < 60_000) return "Agora";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `Há ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours} h`;

  const days = Math.floor(hours / 24);
  return `Há ${days} ${days === 1 ? "dia" : "dias"}`;
};

const homeInteractionLabels: Record<
  CompanionInteraction["type"],
  { label: string; badge: string }
> = {
  ai: { label: "Pergunta com IA", badge: "Pergunta" },
  photo: { label: "Momento captado", badge: "Foto" },
  translation: { label: "Tradução com Óculos", badge: "Tradução" },
  transcription: { label: "Transcrição", badge: "Transcrição" },
  triple_tap: { label: "Descrição visual", badge: "Visão" },
  long_press: { label: "Tradução com Óculos", badge: "Tradução" },
  recommendation: { label: "Recomendação", badge: "Sugestão" },
  itinerary: { label: "Atualização do roteiro", badge: "Roteiro" },
};

const getInteractionImageUrl = (
  interaction: CompanionInteraction,
  photos: Photo[],
) => {
  if (interaction.imageUrl || interaction.photoDataUrl) {
    return interaction.imageUrl || interaction.photoDataUrl || "";
  }

  if (!interaction.photoId) return "";

  return (
    photos.find(
      (photo) =>
        photo.id === interaction.photoId ||
        photo.requestId === interaction.photoId,
    )?.url ?? ""
  );
};

const areTravelPreferencesEqual = (
  firstPreferences: TravelPreferences,
  secondPreferences: TravelPreferences,
) => {
  const firstInterests = [...firstPreferences.interests].sort().join("|");
  const secondInterests = [...secondPreferences.interests].sort().join("|");

  return (
    firstInterests === secondInterests &&
    firstPreferences.travelPace === secondPreferences.travelPace &&
    firstPreferences.budget === secondPreferences.budget
  );
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
  const pullStartYRef = useRef<number | null>(null);
  const pullLastVibrationStepRef = useRef(0);
  const pullTriggeredRef = useRef(false);

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
        destination: parsed.destination ?? "",
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
  const [isModeSheetOpen, setIsModeSheetOpen] = useState(false);
  const [isSmartGlassesGuideOpen, setIsSmartGlassesGuideOpen] = useState(false);
  const [tripSetupStep, setTripSetupStep] = useState(1);
  const [tripDraftDestination, setTripDraftDestination] = useState("");
  const [pullToPlusDistance, setPullToPlusDistance] = useState(0);
  const [isPullingToPlus, setIsPullingToPlus] = useState(false);
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

  const [isEditingTripPreferences, setIsEditingTripPreferences] =
    useState(false);
  const [tripPreferenceEditMode, setTripPreferenceEditMode] = useState<
    "trip" | "base"
  >("trip");
  const [tripAdjustInitialStep, setTripAdjustInitialStep] =
    useState<TripAdjustStep>("interests");
  const [tripBaseNameDraft, setTripBaseNameDraft] = useState(
    () => getStoredUserProfile().name ?? "",
  );
  const [tripDraftPreferences, setTripDraftPreferences] =
    useState<TravelPreferences>(preferences);
  const [tripDraftAssistantStyle, setTripDraftAssistantStyle] =
    useState<AssistantStyle>(
      () => getStoredUserProfile().assistantStyle ?? "localFriend",
    );
  const [tripDraftDetailLevel, setTripDraftDetailLevel] = useState<DetailLevel>(
    () => getStoredUserProfile().detailLevel ?? "balanced",
  );
  const [currentTripPreferences, setCurrentTripPreferences] =
    useState<TravelPreferences>(() => {
      try {
        const saved = localStorage.getItem(
          "travel-whisperer-current-trip-preferences",
        );
        if (!saved) return preferences;

        const parsed = JSON.parse(saved) as Partial<TravelPreferences>;

        return {
          interests: parsed.interests ?? preferences.interests,
          travelPace: parsed.travelPace ?? preferences.travelPace,
          budget: parsed.budget ?? preferences.budget,
        };
      } catch {
        return preferences;
      }
    });

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
      JSON.stringify(
        getStorageSafeCompanionInteractions(companionInteractions),
      ),
    );
  }, [companionInteractions]);

  const upsertCompanionInteraction = useCallback(
    (interaction: CompanionInteraction) => {
      setCompanionInteractions((previous) => {
        const next = previous.filter((item) => item.id !== interaction.id);
        return [...next, interaction].slice(-100);
      });
    },
    [],
  );

  const deleteCompanionInteractions = useCallback(
    (interactionIds: string[]) => {
      if (!interactionIds.length) return;

      setCompanionInteractions((previous) =>
        previous.filter(
          (interaction) => !interactionIds.includes(interaction.id),
        ),
      );
    },
    [],
  );

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

  const saveBaseProfileName = useCallback(() => {
    const normalizedName = tripBaseNameDraft.trim();

    if (!normalizedName) return;

    updateStoredUserProfile({ name: normalizedName });
    setTripBaseNameDraft(normalizedName);
    addLog("Base profile name completed", "success");
  }, [addLog, tripBaseNameDraft]);

  const saveBaseProfileFromTripDraft = useCallback(() => {
    savePreferences(tripDraftPreferences);
    updateStoredUserProfile({
      assistantStyle: tripDraftAssistantStyle,
      detailLevel: tripDraftDetailLevel,
    });
    setTripPreferenceEditMode("trip");
    setIsEditingTripPreferences(false);
    addLog("Base profile completed from trip setup", "success");
  }, [
    addLog,
    savePreferences,
    tripDraftAssistantStyle,
    tripDraftDetailLevel,
    tripDraftPreferences,
  ]);

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
          addLog(`Added back to favorites: ${recommendation.name}`, "info");

          return prev.map((item) =>
            item.tripId === currentTrip.id && item.id === recommendation.id
              ? {
                  ...item,
                  isFavorite: true,
                  imageUrl:
                    item.imageUrl || recommendation.imageUrl || recommendation.image,
                }
              : item,
          );
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
          status: "favorite",
          isFavorite: true,
          imageUrl: recommendation.imageUrl || recommendation.image,
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
        prev.flatMap((itineraryItem) => {
          const isTargetItem =
            itineraryItem.tripId === currentTrip.id &&
            itineraryItem.id === item.id;

          if (!isTargetItem) return [itineraryItem];

          const status = itineraryItem.status ?? "favorite";

          if (status === "toVisit" || status === "visited") {
            return [
              {
                ...itineraryItem,
                isFavorite: false,
              },
            ];
          }

          return [];
        }),
      );

      addLog(`Removed from favorites: ${item.name}`, "info");
    },
    [addLog, currentTrip],
  );

  const moveItineraryItemToVisit = useCallback(
    (item: ItineraryItem) => {
      if (!currentTrip) return;

      setItineraryItems((prev) =>
        prev.map((itineraryItem) =>
          itineraryItem.tripId === currentTrip.id &&
          itineraryItem.id === item.id
            ? {
                ...itineraryItem,
                status: "toVisit",
                isFavorite: itineraryItem.isFavorite ?? true,
              }
            : itineraryItem,
        ),
      );

      addLog(`Added to visit list: ${item.name}`, "success");
    },
    [addLog, currentTrip],
  );

  const markItineraryItemAsVisited = useCallback(
    (item: ItineraryItem) => {
      if (!currentTrip) return;

      setItineraryItems((prev) =>
        prev.map((itineraryItem) =>
          itineraryItem.tripId === currentTrip.id &&
          itineraryItem.id === item.id
            ? {
                ...itineraryItem,
                status: "visited",
              }
            : itineraryItem,
        ),
      );

      addLog(`Marked as visited: ${item.name}`, "success");
    },
    [addLog, currentTrip],
  );

  const removeItineraryItemFromVisit = useCallback(
    (item: ItineraryItem) => {
      if (!currentTrip) return;

      setItineraryItems((prev) =>
        prev.flatMap((itineraryItem) => {
          const isTargetItem =
            itineraryItem.tripId === currentTrip.id &&
            itineraryItem.id === item.id;

          if (!isTargetItem) return [itineraryItem];

          const isFavorite = itineraryItem.isFavorite ?? true;

          if (isFavorite) {
            return [
              {
                ...itineraryItem,
                status: "favorite",
              },
            ];
          }

          return [];
        }),
      );

      addLog(`Removed from route list: ${item.name}`, "info");
    },
    [addLog, currentTrip],
  );

  const optimizeItineraryItems = useCallback(
    async (itemsToOptimize: ItineraryItem[]) => {
      if (!currentTrip || itemsToOptimize.length < 2) return;

      const response = await fetch("/api/itinerary/optimize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination: currentTrip.destination || currentTrip.name,
          preferences: currentTripPreferences,
          items: itemsToOptimize.map((item, index) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            description: item.description,
            estimatedTime: item.estimatedTime,
            budget: item.budget,
            interests: item.interests,
            reason: item.reason,
            currentOrder: index + 1,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(errorData?.error || "Erro ao otimizar o roteiro.");
      }

      const data = (await response.json()) as {
        items?: Array<{
          id?: string;
          optimizedOrder?: number;
          optimizedPeriod?: "morning" | "afternoon" | "night";
          aiOptimizationReason?: string;
        }>;
      };

      const optimizedById = new Map(
        (data.items || [])
          .filter((item) => typeof item.id === "string")
          .map((item, index) => [
            item.id as string,
            {
              optimizedOrder:
                typeof item.optimizedOrder === "number"
                  ? item.optimizedOrder
                  : index + 1,
              optimizedPeriod: item.optimizedPeriod,
              aiOptimizationReason: item.aiOptimizationReason,
            },
          ]),
      );

      if (optimizedById.size === 0) {
        throw new Error("A IA não devolveu uma ordem válida.");
      }

      setItineraryItems((prev) =>
        prev.map((item) => {
          if (item.tripId !== currentTrip.id || item.status !== "toVisit") {
            return item;
          }

          const optimized = optimizedById.get(item.id);
          if (!optimized) return item;

          return {
            ...item,
            optimizedOrder: optimized.optimizedOrder,
            optimizedPeriod: optimized.optimizedPeriod,
            aiOptimizationReason: optimized.aiOptimizationReason,
          };
        }),
      );

      addLog("Itinerary optimized with AI", "success");
    },
    [addLog, currentTrip, currentTripPreferences],
  );

  const startTripWithDraftPreferences = useCallback(
    (
      source: TripPreferenceSource = "custom",
      nextPreferences = tripDraftPreferences,
      nextAssistantStyle = tripDraftAssistantStyle,
      nextDetailLevel = tripDraftDetailLevel,
    ) => {
      setTripDraftPreferences(nextPreferences);
      setTripDraftAssistantStyle(nextAssistantStyle);
      setTripDraftDetailLevel(nextDetailLevel);
      setCurrentTripPreferences(nextPreferences);

      localStorage.setItem(
        "travel-whisperer-current-trip-preferences",
        JSON.stringify({
          ...nextPreferences,
          assistantStyle: nextAssistantStyle,
          detailLevel: nextDetailLevel,
          source,
        }),
      );

      setIsEditingTripPreferences(false);
      setIsSettingsOpen(false);
      setIsEditingPreferences(false);
      setIsTripActive(true);
      setActiveBottomNavItem("companion");
      continueToApp();

      addLog(
        source === "base"
          ? "Trip started with base preferences"
          : "Trip started with custom preferences",
        "success",
      );
    },
    [
      addLog,
      continueToApp,
      tripDraftAssistantStyle,
      tripDraftDetailLevel,
      tripDraftPreferences,
    ],
  );

  const startTripWithBasePreferences = useCallback(() => {
    const baseProfile = getStoredUserProfile();
    const missingBaseStep: TripAdjustStep | null =
      preferences.interests.length < 3
        ? "interests"
        : !preferences.travelPace
          ? "pace"
          : !preferences.budget
            ? "budget"
            : !baseProfile.assistantStyle || !baseProfile.detailLevel
              ? "companion"
              : null;

    if (missingBaseStep) {
      setTripDraftPreferences(preferences);
      setTripDraftAssistantStyle(
        baseProfile.assistantStyle ?? "localFriend",
      );
      setTripDraftDetailLevel(baseProfile.detailLevel ?? "balanced");
      setTripPreferenceEditMode("base");
      setTripAdjustInitialStep(missingBaseStep);
      setIsEditingTripPreferences(true);
      addLog("Base profile needs completion before starting a trip", "warning");
      return;
    }

    startTripWithDraftPreferences(
      "base",
      preferences,
      baseProfile.assistantStyle,
      baseProfile.detailLevel,
    );
  }, [addLog, preferences, startTripWithDraftPreferences]);

  const getSuggestedTripDestination = useCallback(() => {
    const locationDestination = getTripDestination(currentLocation);

    if (locationDestination !== "A identificar cidade") {
      return locationDestination;
    }

    return "Porto";
  }, [currentLocation]);

  const getSuggestedTripName = useCallback(() => {
    const destination = getSuggestedTripDestination();
    const cityName = destination.split(",")[0]?.trim();

    return cityName || "Porto";
  }, [getSuggestedTripDestination]);

  const handleTripDestinationChange = useCallback(
    (destination: string) => {
      const previousGeneratedName =
        tripDraftDestination.split(",")[0]?.trim() || getSuggestedTripName();
      const nextGeneratedName =
        destination.split(",")[0]?.trim() || getSuggestedTripName();

      setTripDraftDestination(destination);
      setCurrentTrip((prev) => {
        const shouldSyncName =
          !prev.name.trim() ||
          prev.name === "Sem nome" ||
          prev.name === previousGeneratedName;

        return {
          ...prev,
          destination,
          name: shouldSyncName ? nextGeneratedName : prev.name,
        };
      });
    },
    [getSuggestedTripName, tripDraftDestination],
  );

  const handleTripNameChange = useCallback((tripName: string) => {
    setCurrentTrip((prev) => ({
      ...prev,
      name: tripName,
    }));
  }, []);

  const handleUseCurrentTripLocation = useCallback(() => {
    const destination = getSuggestedTripDestination();
    const suggestedName = destination.split(",")[0]?.trim() || "Porto";

    setTripDraftDestination(destination);
    setCurrentTrip((prev) => ({
      ...prev,
      destination,
      name:
        !prev.name.trim() || prev.name === "Sem nome"
          ? suggestedName
          : prev.name,
    }));
  }, [getSuggestedTripDestination]);

  const continueTripDestinationStep = useCallback(() => {
    const destination =
      tripDraftDestination.trim() || getSuggestedTripDestination();
    const generatedName =
      destination.split(",")[0]?.trim() || getSuggestedTripName();
    const tripName = currentTrip.name.trim() || generatedName;

    setCurrentTrip((prev) => ({
      ...prev,
      destination,
      name: tripName,
    }));
    setTripSetupStep(2);
    setIsEditingTripPreferences(false);
  }, [
    currentTrip.name,
    getSuggestedTripDestination,
    getSuggestedTripName,
    tripDraftDestination,
  ]);

  const startNewTrip = useCallback(() => {
    const baseProfile = getStoredUserProfile();
    const suggestedTripName = getSuggestedTripName();
    const suggestedTripDestination = getSuggestedTripDestination();

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

    setCurrentTrip(
      createCurrentTrip(suggestedTripName, suggestedTripDestination),
    );
    setTripDraftDestination(suggestedTripDestination);
    setTripSetupStep(2);
    setTripDraftPreferences(preferences);
    setTripDraftAssistantStyle(baseProfile.assistantStyle ?? "localFriend");
    setTripDraftDetailLevel(baseProfile.detailLevel ?? "balanced");
    setHasCompletedIntro(false);
    setIsTripActive(false);
    setIsEditingPreferences(false);
    setIsSettingsOpen(false);
    setActiveBottomNavItem("dashboard");
    setIsEditingTripPreferences(false);
    setTripPreferenceEditMode("trip");
    setTripAdjustInitialStep("interests");
    setTripBaseNameDraft(baseProfile.name ?? "");
    setSelectedPhotoIds([]);

    addLog("New trip started", "info");
  }, [
    activeBottomNavItem,
    addLog,
    currentTrip,
    getSuggestedTripDestination,
    getSuggestedTripName,
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
    setTripPreferenceEditMode("trip");
    setTripAdjustInitialStep("interests");
    setTripSetupStep(1);
    setTripDraftDestination(returnState.currentTrip.destination ?? "");
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
    const belongsToFinishedTrip = <Item extends { tripId?: string | null }>(
      item: Item,
    ) =>
      !item.tripId ||
      item.tripId === finishedTrip.id ||
      item.tripId === "current-trip";
    const finishedTripPhotos = photos.filter(belongsToFinishedTrip);
    const finishedTripPlaces = visitedPlaces.filter(belongsToFinishedTrip);

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
          photoCount: finishedTripPhotos.length,
          visitedPlacesCount: finishedTripPlaces.length,
          coverPhotoUrl: finishedTripPhotos[0]?.url,
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

  const openPlusSheet = useCallback(() => {
    if (isTripActive) {
      openCompanionFromTripButton();
      return;
    }

    setIsModeSheetOpen(false);
    setActiveBottomNavItem("newTrip");
    setIsEditingPreferences(false);
    setIsSettingsOpen(false);
  }, [isTripActive, openCompanionFromTripButton]);

  const handleCenterNavAction = openPlusSheet;

  const vibratePullHint = useCallback((duration: number) => {
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;

    navigator.vibrate(duration);
  }, []);

  const resetPullToPlus = useCallback(() => {
    pullStartYRef.current = null;
    pullLastVibrationStepRef.current = 0;
    pullTriggeredRef.current = false;
    setIsPullingToPlus(false);
    setPullToPlusDistance(0);
  }, []);

  const canStartPullToPlus =
    activeBottomNavItem === "dashboard" &&
    !isModeSheetOpen &&
    !isTripActive &&
    !isEditingPreferences &&
    !isSettingsOpen &&
    !isSmartGlassesGuideOpen &&
    hasCompletedIntro;

  const handleHomeTouchStart = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      if (!canStartPullToPlus) return;
      if (window.scrollY > 2) return;

      pullStartYRef.current = event.touches[0]?.clientY ?? null;
      pullLastVibrationStepRef.current = 0;
      pullTriggeredRef.current = false;
    },
    [canStartPullToPlus],
  );

  const handleHomeTouchMove = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      if (
        !canStartPullToPlus ||
        pullStartYRef.current === null ||
        pullTriggeredRef.current
      ) {
        return;
      }

      if (window.scrollY > 2) {
        resetPullToPlus();
        return;
      }

      const currentY = event.touches[0]?.clientY;
      if (currentY === undefined) return;

      const distance = Math.max(0, currentY - pullStartYRef.current);
      if (distance <= 4) return;

      const clampedDistance = Math.min(distance, PULL_TO_PLUS_MAX_DISTANCE);
      const progress = Math.min(clampedDistance / PULL_TO_PLUS_THRESHOLD, 1);

      setIsPullingToPlus(true);
      setPullToPlusDistance(clampedDistance);

      const nextVibrationStep =
        progress >= 1 ? 3 : progress >= 0.75 ? 2 : progress >= 0.4 ? 1 : 0;

      if (nextVibrationStep > pullLastVibrationStepRef.current) {
        pullLastVibrationStepRef.current = nextVibrationStep;
        vibratePullHint(nextVibrationStep === 3 ? 28 : 12);
      }

      if (clampedDistance >= PULL_TO_PLUS_THRESHOLD) {
        pullTriggeredRef.current = true;
        openPlusSheet();
        setIsPullingToPlus(false);
        setPullToPlusDistance(0);
        window.setTimeout(resetPullToPlus, 240);
      }
    },
    [canStartPullToPlus, openPlusSheet, resetPullToPlus, vibratePullHint],
  );

  const handleHomeTouchEnd = useCallback(() => {
    if (pullTriggeredRef.current) {
      window.setTimeout(resetPullToPlus, 220);
      return;
    }

    resetPullToPlus();
  }, [resetPullToPlus]);

  const pullToPlusProgress = Math.min(
    pullToPlusDistance / PULL_TO_PLUS_THRESHOLD,
    1,
  );

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

              const photoTimestamp = new Date(
                data.timestamp,
              ).toLocaleTimeString();
              const tripId = isTripActive ? currentTrip.id : "current-trip";

              upsertCompanionInteraction({
                id: `photo-${data.requestId}`,
                tripId,
                type: "photo",
                title: "Foto rápida",
                content: "Fotografia capturada com os óculos durante a viagem.",
                createdAt: photoTimestamp,
                source: "single_tap",
                photoId: data.requestId,
              });

              return [
                {
                  id: data.requestId,
                  requestId: data.requestId,
                  url: data.dataUrl,
                  timestamp: photoTimestamp,
                  tripId,
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
  }, [
    addLog,
    currentTrip.id,
    isTripActive,
    upsertCompanionInteraction,
    userId,
  ]);

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
              const discoveries = Array.isArray(data.discoveries)
                ? data.discoveries.map((discovery: VisualDiscovery) => ({
                    ...discovery,
                    tripId:
                      discovery.tripId ||
                      (isTripActive ? currentTrip.id : "current-trip"),
                  }))
                : [];

              setVisualDiscoveries(discoveries);

              for (const discovery of discoveries) {
                upsertCompanionInteraction({
                  id: `visual-${discovery.id}`,
                  tripId: discovery.tripId || "current-trip",
                  type: "ai",
                  title: "Descrição visual gerada",
                  content: discovery.description,
                  createdAt: discovery.timestamp,
                  source: discovery.source,
                  imageUrl: discovery.photoDataUrl,
                  photoDataUrl: discovery.photoDataUrl,
                });
              }

              return;
            }

            if (data.type !== "visual_discovery") return;

            const discovery = {
              ...data.discovery,
              tripId:
                data.discovery?.tripId ||
                (isTripActive ? currentTrip.id : "current-trip"),
            } as VisualDiscovery;

            setVisualDiscoveries((prev) => [discovery, ...prev]);

            upsertCompanionInteraction({
              id: `visual-${discovery.id}`,
              tripId: discovery.tripId || "current-trip",
              type: "ai",
              title: "Descrição visual gerada",
              content: discovery.description,
              createdAt: discovery.timestamp,
              source: discovery.source,
              imageUrl: discovery.photoDataUrl,
              photoDataUrl: discovery.photoDataUrl,
            });
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
  }, [currentTrip.id, isTripActive, upsertCompanionInteraction, userId]);

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

            const nextPlace: VisitedPlace = {
              ...data.place,
              tripId: isTripActive ? currentTrip.id : data.place.tripId,
            };

            setVisitedPlaces((prev) => {
              const next = [
                nextPlace,
                ...prev.filter((place) => place.id !== nextPlace.id),
              ];

              return next.sort((a, b) => b.timestamp - a.timestamp);
            });

            addLog(`Visited place saved: ${nextPlace.name}`, "success");
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
  }, [addLog, currentTrip.id, isTripActive, userId]);

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
                tripId: isTripActive ? currentTrip.id : undefined,
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
  }, [addLog, currentTrip.id, isTripActive, userId]);

  /* COMPANION STREAM */
  useEffect(() => {
    if (!userId) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isClosed = false;

    const normalizeCompanionInteraction = (
      interaction: Partial<CompanionInteraction> & { id?: string },
    ): CompanionInteraction | null => {
      if (!interaction || !interaction.id) return null;

      return {
        id: interaction.id,
        tripId:
          interaction.tripId ||
          (isTripActive ? currentTrip.id : "current-trip"),
        type: interaction.type ?? "ai",
        title: interaction.title ?? "Interação do Companion",
        content: interaction.content ?? "",
        createdAt:
          interaction.createdAt ||
          new Date().toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        source: interaction.source,
        imageUrl: isLocalDataImage(interaction.imageUrl)
          ? undefined
          : interaction.imageUrl,
        photoDataUrl: isLocalDataImage(interaction.photoDataUrl)
          ? undefined
          : interaction.photoDataUrl,
        photoId: interaction.photoId,
      };
    };

    const mergeCompanionInteractions = (
      previous: CompanionInteraction[],
      incoming: CompanionInteraction[],
    ) => {
      const byId = new Map<string, CompanionInteraction>();

      for (const interaction of [...previous, ...incoming]) {
        if (!interaction?.id) continue;
        byId.set(interaction.id, interaction);
      }

      return Array.from(byId.values()).slice(-100);
    };

    const connect = () => {
      if (isClosed) return;

      try {
        eventSource = new EventSource(
          `/api/companion-stream?userId=${encodeURIComponent(userId)}`,
        );

        eventSource.onopen = () => {
          console.log("[Companion Stream] connected", userId);
          addLog("Connected to companion stream", "success");
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "connected") {
              const incomingInteractions = Array.isArray(data.interactions)
                ? data.interactions
                    .map(normalizeCompanionInteraction)
                    .filter(Boolean)
                : [];

              if (incomingInteractions.length > 0) {
                setCompanionInteractions((previous) =>
                  mergeCompanionInteractions(
                    previous,
                    incomingInteractions as CompanionInteraction[],
                  ),
                );
              }

              return;
            }

            if (data.type !== "companion_interaction" || !data.interaction) {
              return;
            }

            const nextInteraction = normalizeCompanionInteraction(
              data.interaction,
            );

            if (!nextInteraction) return;

            setCompanionInteractions((previous) =>
              mergeCompanionInteractions(previous, [nextInteraction]),
            );

            addLog(
              `Companion interaction received: ${nextInteraction.title}`,
              "info",
            );
          } catch {
            addLog("Failed to parse companion stream event", "error");
          }
        };

        eventSource.onerror = () => {
          addLog("Companion stream disconnected, reconnecting...", "warning");
          eventSource?.close();

          if (!isClosed) {
            reconnectTimeout = setTimeout(connect, 3000);
          }
        };
      } catch {
        addLog("Failed to connect to companion stream", "error");
      }
    };

    connect();

    return () => {
      isClosed = true;

      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }

      eventSource?.close();
    };
  }, [addLog, currentTrip.id, isTripActive, userId]);

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
    const hasSavedBasePreferences = Boolean(
      localStorage.getItem("travel-whisperer-preferences"),
    );
    const profile = getStoredUserProfile();
    const hasProfileName = Boolean(profile.name?.trim());
    const hasAssistantStyle = Boolean(profile.assistantStyle);
    const hasDetailLevel = Boolean(profile.detailLevel);
    const selectedInterests = hasSavedBasePreferences
      ? preferences.interests
          .map((interest) =>
            onboardingInterestOptions.find((option) => option.id === interest),
          )
          .filter(Boolean)
      : [];
    const baseAssistantStyle = profile.assistantStyle ?? "localFriend";
    const baseDetailLevel = profile.detailLevel ?? "balanced";
    const assistantCopy = profile.assistantStyle
      ? assistantStyleLabels[profile.assistantStyle]
      : null;
    const hasBaseTravelPace =
      hasSavedBasePreferences && Boolean(preferences.travelPace);
    const hasBaseBudget =
      hasSavedBasePreferences && Boolean(preferences.budget);
    const hasAnyMissingBaseInfo =
      !hasProfileName ||
      !hasSavedBasePreferences ||
      selectedInterests.length === 0 ||
      !hasBaseTravelPace ||
      !hasBaseBudget ||
      !hasAssistantStyle ||
      !hasDetailLevel;
    const missingLabel = "Por preencher";
    const baseProfileName = profile.name?.trim() || missingLabel;
    const baseTravelPaceLabel = hasBaseTravelPace
      ? travelPaceLabels[preferences.travelPace]
      : missingLabel;
    const baseBudgetLabel = hasBaseBudget
      ? budgetLabels[preferences.budget]
      : missingLabel;
    const baseDetailLevelLabel = hasDetailLevel
      ? detailLevelLabels[baseDetailLevel]
      : missingLabel;
    const baseAssistantTitle = assistantCopy?.title ?? missingLabel;
    const baseAssistantDescription =
      assistantCopy?.description ??
      "Define o estilo do Companion para personalizar as respostas.";
    const hasCustomTripPreferences =
      !areTravelPreferencesEqual(tripDraftPreferences, preferences) ||
      tripDraftAssistantStyle !== baseAssistantStyle ||
      tripDraftDetailLevel !== baseDetailLevel;
    const canUseBasePreferences =
      selectedInterests.length >= 3 &&
      hasBaseTravelPace &&
      hasBaseBudget &&
      hasAssistantStyle &&
      hasDetailLevel;
    const firstMissingBaseStep: TripAdjustStep | null =
      selectedInterests.length < 3
        ? "interests"
        : !hasBaseTravelPace
          ? "pace"
          : !hasBaseBudget
            ? "budget"
            : !hasAssistantStyle || !hasDetailLevel
              ? "companion"
              : null;
    const openTripPreferenceAdjustment = (
      initialStep: TripAdjustStep = "interests",
      editMode: "trip" | "base" = "trip",
    ) => {
      setTripDraftPreferences((prev) =>
        editMode === "base" || !hasCustomTripPreferences ? preferences : prev,
      );
      setTripDraftAssistantStyle((prev) =>
        editMode === "base" || !hasCustomTripPreferences
          ? baseAssistantStyle
          : prev,
      );
      setTripDraftDetailLevel((prev) =>
        editMode === "base" || !hasCustomTripPreferences
          ? baseDetailLevel
          : prev,
      );
      setTripPreferenceEditMode(editMode);
      setTripAdjustInitialStep(initialStep);
      setIsEditingTripPreferences(true);
    };
    const openBaseProfileCompletion = () =>
      openTripPreferenceAdjustment(firstMissingBaseStep ?? "interests", "base");

    return (
      <main className="tw-page tw-trip-setup-page">
        <section className="tw-trip-setup-card">
          <div className="tw-trip-setup-header">
            <h1>Vamos usar as tuas preferências base</h1>

            <p>
              Já tens preferências definidas no teu perfil. Podemos usá-las
              nesta viagem ou ajustá-las só para esta aventura.
            </p>
          </div>

          <div className="tw-trip-setup-content">
            <article className="tw-trip-setup-section">
              <div className="tw-trip-setup-profile-title">
                <User
                  className="tw-trip-setup-profile-icon"
                  aria-hidden="true"
                />
                <h2>O teu perfil base</h2>
              </div>

              <div className="tw-trip-setup-summary">
                <h3 className="tw-trip-setup-label">Dados do onboarding</h3>

                <div className="tw-trip-setup-details">
                  <span
                    className={
                      hasProfileName ? "" : "tw-trip-setup-detail-missing"
                    }
                  >
                    <small>Nome</small>
                    {hasProfileName ? (
                      <strong>{baseProfileName}</strong>
                    ) : (
                      <span className="tw-trip-setup-inline-editor">
                        <input
                          value={tripBaseNameDraft}
                          onChange={(event) =>
                            setTripBaseNameDraft(event.target.value)
                          }
                          placeholder="O teu nome"
                          aria-label="Nome do perfil base"
                        />
                        <button
                          type="button"
                          onClick={saveBaseProfileName}
                          disabled={!tripBaseNameDraft.trim()}
                        >
                          Guardar
                        </button>
                      </span>
                    )}
                  </span>

                  <span
                    className={
                      hasBaseTravelPace ? "" : "tw-trip-setup-detail-missing"
                    }
                  >
                    <small>Ritmo</small>
                    <strong>{baseTravelPaceLabel}</strong>
                    {!hasBaseTravelPace && (
                      <button
                        type="button"
                        className="tw-trip-setup-fill-link"
                        onClick={openBaseProfileCompletion}
                      >
                        Preencher
                      </button>
                    )}
                  </span>

                  <span
                    className={
                      hasBaseBudget ? "" : "tw-trip-setup-detail-missing"
                    }
                  >
                    <small>Orçamento</small>
                    <strong>{baseBudgetLabel}</strong>
                    {!hasBaseBudget && (
                      <button
                        type="button"
                        className="tw-trip-setup-fill-link"
                        onClick={openBaseProfileCompletion}
                      >
                        Preencher
                      </button>
                    )}
                  </span>

                  <span
                    className={
                      hasDetailLevel ? "" : "tw-trip-setup-detail-missing"
                    }
                  >
                    <small>Detalhe</small>
                    <strong>{baseDetailLevelLabel}</strong>
                    {!hasDetailLevel && (
                      <button
                        type="button"
                        className="tw-trip-setup-fill-link"
                        onClick={openBaseProfileCompletion}
                      >
                        Preencher
                      </button>
                    )}
                  </span>
                </div>

                <h3 className="tw-trip-setup-label">Interesses</h3>

                <div className="tw-trip-setup-chip-list">
                  {selectedInterests.length > 0 ? (
                    selectedInterests.map((interest) => {
                      if (!interest) return null;

                      const Icon = interest.icon;

                      return (
                        <span key={interest.id} className="tw-trip-setup-chip">
                          <Icon
                            className="tw-trip-setup-chip-icon"
                            aria-hidden="true"
                          />
                          {interest.label}
                        </span>
                      );
                    })
                  ) : (
                    <span className="tw-trip-setup-empty">
                      Ainda não definiste interesses.
                    </span>
                  )}
                </div>

                {!canUseBasePreferences && (
                  <div className="tw-trip-setup-missing-callout">
                    <Info
                      className="tw-trip-setup-missing-icon"
                      aria-hidden="true"
                    />
                    <div>
                      <strong>
                        Completa o perfil para usar o estilo base
                      </strong>
                      <p>
                        Preenche os dados em falta para iniciares a viagem com
                        as tuas preferências base.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openBaseProfileCompletion}
                    >
                      Completar perfil
                    </button>
                  </div>
                )}

                <div className="tw-trip-setup-style">
                  <h3 className="tw-trip-setup-label">Estilo do Companion</h3>

                  <div className="tw-trip-setup-style-card">
                    <span
                      className="tw-trip-setup-style-icon"
                      aria-hidden="true"
                    >
                      <SmilePlus />
                    </span>

                    <div>
                      <h4>{baseAssistantTitle}</h4>
                      <p>{baseAssistantDescription}</p>
                      <small>Detalhe: {baseDetailLevelLabel}</small>
                      {!hasAssistantStyle && (
                        <button
                          type="button"
                          className="tw-trip-setup-fill-link"
                          onClick={openBaseProfileCompletion}
                        >
                          Preencher estilo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <p className="tw-trip-setup-note">
            <Info className="tw-trip-setup-note-icon" aria-hidden="true" />
            {hasAnyMissingBaseInfo
              ? "Há informações do perfil base por preencher. Podes ajustar só para esta viagem ou completar o perfil base mais tarde."
              : "Podes alterar o estilo do teu Companion em qualquer altura nas definições da viagem."}
          </p>

          <div className="tw-trip-setup-actions">
            <button
              type="button"
              className="tw-trip-setup-primary"
              onClick={startTripWithBasePreferences}
              disabled={!canUseBasePreferences}
            >
              Usar estilo base
            </button>

            <button
              type="button"
              className="tw-trip-setup-secondary"
              onClick={() => openTripPreferenceAdjustment("interests", "trip")}
            >
              Ajustar para esta aventura
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
          } ${
            isModeSheetOpen ||
            (!isTripActive && activeBottomNavItem === "newTrip") ||
            (isTripActive && activeBottomNavItem === "companion")
              ? "tw-bottom-nav-plus-active"
              : ""
          }`}
          onClick={handleCenterNavAction}
          aria-pressed={
            isModeSheetOpen ||
            (isTripActive && activeBottomNavItem === "companion")
          }
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
          <MapIcon className="tw-bottom-nav-icon" />
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
          className="tw-mode-sheet-backdrop tw-companion-sheet-backdrop"
          role="presentation"
          onClick={() => setIsModeSheetOpen(false)}
        >
          <section
            className="tw-mode-sheet tw-companion-bottom-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Companion"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="tw-mode-sheet-close"
              onClick={() => setIsModeSheetOpen(false)}
              aria-label="Fechar"
            >
              ×
            </button>

            <CompanionActionSheet
              onUseCompanion={() => {
                setIsModeSheetOpen(false);
                setActiveBottomNavItem("companion");
                setIsEditingPreferences(false);
                setIsSettingsOpen(false);
                addLog("Free companion mode opened", "info");
              }}
              onOpenGlassesGuide={() => {
                setIsModeSheetOpen(false);
                setIsSmartGlassesGuideOpen(true);
              }}
              onConfigureTrip={() => {
                setIsModeSheetOpen(false);
                startNewTrip();
              }}
            />
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

    if (tripSetupStep === 1) {
      return (
        <TripDestinationStep
          destination={tripDraftDestination}
          tripName={currentTrip.name}
          onDestinationChange={handleTripDestinationChange}
          onTripNameChange={handleTripNameChange}
          onUseCurrentLocation={handleUseCurrentTripLocation}
          onBack={cancelNewTrip}
          onContinue={continueTripDestinationStep}
        />
      );
    }

    if (!isEditingTripPreferences) {
      return renderTripSetupSummary();
    }

    return (
      <TripAdventurePreferencesStep
        key={`${tripPreferenceEditMode}-${tripAdjustInitialStep}`}
        preferences={tripDraftPreferences}
        assistantStyle={tripDraftAssistantStyle}
        detailLevel={tripDraftDetailLevel}
        initialStep={tripAdjustInitialStep}
        saveLabel={
          tripPreferenceEditMode === "base"
            ? "Guardar no perfil base"
            : "Guardar para esta viagem"
        }
        secondaryLabel={
          tripPreferenceEditMode === "base" ? "Cancelar" : "Usar estilo base"
        }
        onPreferencesChange={setTripDraftPreferences}
        onAssistantStyleChange={setTripDraftAssistantStyle}
        onDetailLevelChange={setTripDraftDetailLevel}
        onBack={() => {
          setTripSetupStep(2);
          setTripPreferenceEditMode("trip");
          setIsEditingTripPreferences(false);
        }}
        onSaveCustom={
          tripPreferenceEditMode === "base"
            ? saveBaseProfileFromTripDraft
            : () => startTripWithDraftPreferences("custom")
        }
        onUseBase={
          tripPreferenceEditMode === "base"
            ? () => {
                setTripPreferenceEditMode("trip");
                setIsEditingTripPreferences(false);
              }
            : startTripWithBasePreferences
        }
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

  const matchesActiveTrip = <Item extends { tripId?: string | null }>(
    item: Item,
  ) => {
    if (!isTripActive) return true;

    return (
      !item.tripId ||
      item.tripId === currentTrip.id ||
      item.tripId === "current-trip"
    );
  };

  const activeTripPhotos = isTripActive
    ? photos.filter(matchesActiveTrip)
    : photos;
  const activeTripPlaces = isTripActive
    ? visitedPlaces.filter(matchesActiveTrip)
    : visitedPlaces;
  const activeTripTranscriptions = isTripActive
    ? transcriptions.filter(matchesActiveTrip)
    : transcriptions;
  const activeTripVisualDiscoveries = isTripActive
    ? visualDiscoveries.filter(matchesActiveTrip)
    : visualDiscoveries;
  const activeTripCompanionInteractions = isTripActive
    ? companionInteractions.filter(matchesActiveTrip)
    : companionInteractions;

  const activeTripDateLabel = formatTripDateRange(currentTrip);
  const activeTripDisplayDestination =
    currentTrip.destination || activeTripLocation;
  const activeTripInteractionCount =
    activeTripCompanionInteractions.length +
    activeTripVisualDiscoveries.length +
    activeTripTranscriptions.length;
  const activeTripStatsTranscriptionValue = isTripActive
    ? activeTripInteractionCount
    : activeTripTranscriptions.length;
  const latestCompanionInteraction = [...activeTripCompanionInteractions].sort(
    (firstInteraction, secondInteraction) =>
      getTimeValue(secondInteraction.createdAt) -
      getTimeValue(firstInteraction.createdAt),
  )[0];
  const latestVisualDiscovery = [...activeTripVisualDiscoveries].sort(
    (firstDiscovery, secondDiscovery) =>
      getTimeValue(secondDiscovery.timestamp) -
      getTimeValue(firstDiscovery.timestamp),
  )[0];
  const latestHomeInteraction =
    latestCompanionInteraction &&
    (!latestVisualDiscovery ||
      getTimeValue(latestCompanionInteraction.createdAt) >=
        getTimeValue(latestVisualDiscovery.timestamp))
      ? {
          id: latestCompanionInteraction.id,
          label: homeInteractionLabels[latestCompanionInteraction.type].label,
          badge: homeInteractionLabels[latestCompanionInteraction.type].badge,
          title: latestCompanionInteraction.title,
          content: latestCompanionInteraction.content,
          createdAt: latestCompanionInteraction.createdAt,
          imageUrl: getInteractionImageUrl(latestCompanionInteraction, photos),
        }
      : latestVisualDiscovery
        ? {
            id: latestVisualDiscovery.id,
            label: "Descrição visual",
            badge: "Visão",
            title: "O que viste pelas glasses",
            content: latestVisualDiscovery.description,
            createdAt: latestVisualDiscovery.timestamp,
            imageUrl: latestVisualDiscovery.photoDataUrl,
          }
        : null;

  const companionProfileInitial = getProfileInitial(
    getStoredUserProfile().name,
  );
  const companionPreferenceSummary = [
    ...currentTripPreferences.interests
      .slice(0, 2)
      .map((interest) => preferenceInterestLabels[interest] ?? interest),
    `Ritmo ${travelPaceLabels[currentTripPreferences.travelPace].toLowerCase()}`,
  ];
  const baseRecommendationProfile = getStoredUserProfile();
  const tripRecommendationMeta = getStoredCurrentTripPreferenceMeta();
  const exploreRecommendationProfile = {
    name: baseRecommendationProfile.name,
    assistantStyle: isTripActive
      ? (tripRecommendationMeta.assistantStyle ??
        baseRecommendationProfile.assistantStyle)
      : baseRecommendationProfile.assistantStyle,
    detailLevel: isTripActive
      ? (tripRecommendationMeta.detailLevel ??
        baseRecommendationProfile.detailLevel)
      : baseRecommendationProfile.detailLevel,
  };
  const openCompanionPreferences = () => {
    setActiveBottomNavItem("profile");
    setIsEditingPreferences(false);
    setIsSettingsOpen(false);
  };

  const openTripMemories = () => {
    setActiveBottomNavItem("memories");
    setVisibleSections((prev) => ({
      ...prev,
      memories: true,
      photos: true,
      album: true,
      recentMoments: true,
      transcriptions: true,
    }));
    setIsEditingPreferences(false);
    setIsSettingsOpen(false);
  };

  const openExploreNearby = () => {
    setActiveBottomNavItem("recommendations");
    setVisibleSections((prev) => ({
      ...prev,
      recommendations: true,
      nearby: true,
      places: true,
    }));
    setIsEditingPreferences(false);
    setIsSettingsOpen(false);
  };

  const mapPreviewLocation = currentLocation ?? {
    lat: 41.14961,
    lng: -8.61099,
  };

  const locationMapUrl = `https://maps.google.com/maps?ll=${mapPreviewLocation.lat},${mapPreviewLocation.lng}&z=15&output=embed`;

  const homeLocationCity = currentLocation
    ? getLocationTitle(currentLocation)
    : "Porto";

  const homeLocationCoordinates = currentLocation
    ? `${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}`
    : "41.19013, -8.53932";

  const renderProfilePreferenceChips = (
    profilePreferences: TravelPreferences,
  ) => {
    const selectedInterests = profilePreferences.interests
      .map((interest) =>
        onboardingInterestOptions.find((option) => option.id === interest),
      )
      .filter(Boolean);

    if (selectedInterests.length === 0) {
      return (
        <span className="tw-profile-empty-copy">
          Ainda não há interesses definidos.
        </span>
      );
    }

    return selectedInterests.map((interest) => {
      if (!interest) return null;

      const Icon = interest.icon;

      return (
        <span key={interest.id} className="tw-profile-chip">
          <Icon className="tw-profile-chip-icon" />
          {interest.label}
        </span>
      );
    });
  };

  const renderProfilePage = () => {
    const baseProfile = getStoredUserProfile();
    const baseProfileDefined = hasStoredUserProfile();
    const tripPreferenceMeta = getStoredCurrentTripPreferenceMeta();
    const profilePreferences = isTripActive
      ? currentTripPreferences
      : preferences;
    const profileAssistantStyle = isTripActive
      ? (tripPreferenceMeta.assistantStyle ??
        tripDraftAssistantStyle ??
        baseProfile.assistantStyle ??
        "localFriend")
      : (baseProfile.assistantStyle ?? "localFriend");
    const profileDetailLevel = isTripActive
      ? (tripPreferenceMeta.detailLevel ??
        tripDraftDetailLevel ??
        baseProfile.detailLevel ??
        "balanced")
      : (baseProfile.detailLevel ?? "balanced");
    const assistantCopy = assistantStyleLabels[profileAssistantStyle];
    const sourceLabel =
      isTripActive && tripPreferenceMeta.source === "custom"
        ? "Ajustado para esta viagem"
        : isTripActive
          ? "Preferências base"
          : "Definido no onboarding";
    const tripInteractions = currentTrip
      ? companionInteractions.filter(
          (interaction) =>
            interaction.tripId === currentTrip.id ||
            interaction.tripId === "current-trip",
        )
      : companionInteractions;

    if (!isTripActive && !baseProfileDefined) {
      return (
        <section className="tw-profile-dashboard">
          <article className="tw-profile-hero tw-profile-hero-empty">
            <span className="tw-profile-avatar tw-profile-avatar-empty">
              <User />
            </span>

            <div className="tw-profile-hero-copy">
              <span className="tw-profile-kicker">Perfil</span>
              <h2>Perfil não definido</h2>
              <p>
                Ainda não definiste o teu perfil de viagem. Cria um perfil para
                personalizar recomendações, ritmo, orçamento e o estilo do
                Companion.
              </p>
            </div>

            <button
              type="button"
              className="tw-profile-primary-action"
              onClick={() => {
                localStorage.removeItem("travel-whisperer-intro-completed");
                setHasCompletedIntro(false);
                setActiveBottomNavItem("dashboard");
                setIsEditingPreferences(false);
                setIsSettingsOpen(false);
                setIsModeSheetOpen(false);
              }}
            >
              Definir perfil
            </button>
          </article>
        </section>
      );
    }

    return (
      <section className="tw-profile-dashboard">
        <article className="tw-profile-hero">
          <span className="tw-profile-avatar">
            {isTripActive ? <MapPin /> : getProfileInitial(baseProfile.name)}
          </span>

          <div className="tw-profile-hero-copy">
            <span className="tw-profile-kicker">
              {isTripActive ? "Perfil da viagem" : "Perfil base"}
            </span>
            <h2>
              {isTripActive
                ? normalizeTripName(currentTrip.name)
                : baseProfile.name?.trim() || "Viajante"}
            </h2>
            <p>
              {isTripActive
                ? `Contexto ativo em ${currentTrip.destination || activeTripLocation}.`
                : "Preferências guardadas no onboarding para personalizar a experiência."}
            </p>
          </div>

          <span className="tw-profile-status-pill">
            {isTripActive ? "Viagem ativa" : "Perfil base"}
          </span>
        </article>

        {isTripActive && (
          <section className="tw-profile-card">
            <div className="tw-profile-card-header">
              <h3>Informações da viagem</h3>
              <span>{sourceLabel}</span>
            </div>

            <div className="tw-profile-info-grid">
              <div>
                <small>Destino</small>
                <strong>{currentTrip.destination || activeTripLocation}</strong>
              </div>
              <div>
                <small>Início</small>
                <strong>{currentTrip.startedAt}</strong>
              </div>
              <div>
                <small>Fotos</small>
                <strong>{photos.length}</strong>
              </div>
              <div>
                <small>Lugares</small>
                <strong>{visitedPlaces.length}</strong>
              </div>
              <div>
                <small>Transcrições</small>
                <strong>{transcriptions.length}</strong>
              </div>
              <div>
                <small>Interações</small>
                <strong>{tripInteractions.length}</strong>
              </div>
            </div>
          </section>
        )}

        <section className="tw-profile-card">
          <div className="tw-profile-card-header">
            <h3>Interesses</h3>
            <span>{sourceLabel}</span>
          </div>

          <div className="tw-profile-chip-list">
            {renderProfilePreferenceChips(profilePreferences)}
          </div>
        </section>

        <section className="tw-profile-card">
          <div className="tw-profile-card-header">
            <h3>Preferências</h3>
            <span>{isTripActive ? "Desta viagem" : "Globais"}</span>
          </div>

          <div className="tw-profile-preference-list">
            <div className="tw-profile-preference-row">
              <span>Ritmo</span>
              <strong>{travelPaceLabels[profilePreferences.travelPace]}</strong>
            </div>
            <div className="tw-profile-preference-row">
              <span>Orçamento</span>
              <strong>{budgetLabels[profilePreferences.budget]}</strong>
            </div>
            <div className="tw-profile-preference-row">
              <span>Detalhe</span>
              <strong>{detailLevelLabels[profileDetailLevel]}</strong>
            </div>
          </div>
        </section>

        <section className="tw-profile-card tw-profile-companion-card">
          <div className="tw-profile-companion-icon">
            <Bot />
          </div>

          <div>
            <span className="tw-profile-kicker">Companion</span>
            <h3>{assistantCopy.title}</h3>
            <p>{assistantCopy.description}</p>
          </div>
        </section>

        <div className="tw-profile-actions">
          {isTripActive ? (
            <>
              <button
                type="button"
                className="tw-profile-primary-action"
                onClick={openCompanionFromTripButton}
              >
                Abrir companion
              </button>

              <button
                type="button"
                className="tw-profile-secondary-action"
                onClick={endCurrentTrip}
              >
                Terminar viagem
              </button>
            </>
          ) : (
            <button
              type="button"
              className="tw-profile-primary-action"
              onClick={() => setIsEditingPreferences(true)}
            >
              Editar preferências
            </button>
          )}
        </div>
      </section>
    );
  };

  return (
    <main
      id="dashboard"
      className={`tw-page tw-dashboard-main ${
        activeBottomNavItem === "memories" ? "tw-page-memories-active" : ""
      }`}
      onTouchStart={handleHomeTouchStart}
      onTouchMove={handleHomeTouchMove}
      onTouchEnd={handleHomeTouchEnd}
      onTouchCancel={handleHomeTouchEnd}
    >
      {activeBottomNavItem !== "recommendations" &&
        activeBottomNavItem !== "memories" &&
        activeBottomNavItem !== "itinerary" && (
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
                    activeBottomNavItem === "audio"
                      ? "tw-round-action-active"
                      : ""
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
                    setIsEditingPreferences(false);
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
        {/* HERO / ACTIVE TRIP */}
        {isTripActive ? (
          <section className="tw-trip-dashboard-card" aria-label="Viagem atual">
            <div className="tw-trip-dashboard-top">
              <span className="tw-trip-status-pill">
                <span className="tw-trip-status-dot" />
                Viagem a decorrer
              </span>

              <div className="tw-trip-dashboard-actions">

                <button
                  type="button"
                  className="tw-trip-end-button"
                  onClick={endCurrentTrip}
                >
                  Terminar
                </button>
              </div>
            </div>

            <div className="tw-trip-dashboard-main">
              <div className="tw-trip-dashboard-copy">
                <h2>{activeTripName}</h2>
                <p>{activeTripDisplayDestination}</p>
                <time>{activeTripDateLabel}</time>
              </div>
            </div>
          </section>
        ) : (
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
        )}

        {isTripActive && (
          <section
            className="tw-ai-latest-card"
            aria-label="Última interação com IA"
          >
            <div className="tw-ai-latest-header">
              <span className="tw-ai-latest-title">
                <Sparkles className="tw-ai-latest-title-icon" />
                Última interação com IA
              </span>
              {latestHomeInteraction && (
                <time>
                  {formatRelativeTime(latestHomeInteraction.createdAt)}
                </time>
              )}
            </div>

            {latestHomeInteraction ? (
              <div className="tw-ai-latest-body">
                <div className="tw-ai-latest-copy">
                  <span className="tw-ai-latest-badge">
                    {latestHomeInteraction.badge}
                  </span>
                  <h3>{latestHomeInteraction.title}</h3>
                  <p>{latestHomeInteraction.content}</p>
                  <span className="tw-ai-latest-type">
                    {latestHomeInteraction.label}
                  </span>
                </div>

                {latestHomeInteraction.imageUrl && (
                  <span
                    className="tw-ai-latest-thumb"
                    style={{
                      backgroundImage: `url(${
                        latestHomeInteraction.imageUrl
                      })`,
                    }}
                    aria-hidden="true"
                  />
                )}
              </div>
            ) : (
              <div className="tw-ai-latest-empty">
                <span className="tw-ai-latest-empty-icon">
                  <Glasses />
                </span>
                <div>
                  <h3>Ainda não existem interações nesta viagem.</h3>
                  <p>
                    Usa os óculos para traduzir, perguntar ou capturar algo
                    durante a viagem.
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              className="tw-ai-latest-action"
              onClick={openCompanionFromTripButton}
            >
              <span>
                {latestHomeInteraction
                  ? "Ver histórico de interações"
                  : "Abrir Companion"}
              </span>
              <span aria-hidden="true">›</span>
            </button>
          </section>
        )}

        {/* LOCATION */}
        <div
          role="button"
          tabIndex={0}
          className={`tw-location-card ${
            isTripActive ? "tw-location-card-active-trip" : ""
          }`}
          onClick={() => currentLocation && setIsLocationMapOpen(true)}
          onKeyDown={(event) => {
            if (
              currentLocation &&
              (event.key === "Enter" || event.key === " ")
            ) {
              event.preventDefault();
              setIsLocationMapOpen(true);
            }
          }}
          aria-label="Abrir mapa da localização atual"
        >
          {isTripActive ? (
            <span className="tw-location-active-strip">
              <span className="tw-location-badge">
                <span className="tw-location-badge-dot" />
                Online
              </span>
              <span className="tw-location-label">Localização atual</span>
            </span>
          ) : (
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
          )}

          <span className="tw-location-map-preview">
            <iframe
              className="tw-location-map-frame"
              title="Pré-visualização do mapa"
              src={locationMapUrl}
              loading="lazy"
              tabIndex={-1}
            />
            <span className="tw-location-map-overlay" aria-hidden="true" />
            <span className="tw-map-current-pin" />
            {isTripActive && (
              <span className="tw-map-current-button">
                <Navigation />
              </span>
            )}
          </span>
        </div>

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

        {/* STATS */}
        <section className="tw-stats-grid">
          <button
            type="button"
            className="tw-stat-card tw-stat-card-link"
            aria-label={
              isTripActive
                ? "Abrir fotos da viagem nas memórias"
                : "Abrir página de memórias e fotos"
            }
            onClick={() => {
              if (isTripActive) {
                openTripMemories();
                return;
              }

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
              <strong className="tw-stat-value">
                {activeTripPhotos.length}
              </strong>
              <span className="tw-stat-label">Fotos</span>
              <span className="tw-stat-subtext">
                {isTripActive ? "Desta viagem" : "Captura o mundo"}
              </span>
            </div>
          </button>

          <button
            type="button"
            className="tw-stat-card tw-stat-card-link"
            aria-label={
              isTripActive
                ? "Abrir lugares da viagem nas memórias"
                : "Abrir página de lugares e exploração"
            }
            onClick={() => {
              if (isTripActive) {
                openTripMemories();
                return;
              }

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
              <strong className="tw-stat-value">
                {activeTripPlaces.length}
              </strong>
              <span className="tw-stat-label">Lugares</span>
              <span className="tw-stat-subtext">
                {isTripActive ? "Da viagem" : "Descobre mais"}
              </span>
            </div>
          </button>

          <button
            type="button"
            className="tw-stat-card tw-stat-card-link"
            aria-label={
              isTripActive
                ? "Abrir transcrições da viagem nas memórias"
                : "Abrir página de áudio e transcrições"
            }
            onClick={() => {
              if (isTripActive) {
                openTripMemories();
                return;
              }

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
              <strong className="tw-stat-value">
                {activeTripStatsTranscriptionValue}
              </strong>
              <span className="tw-stat-label">Transcrições</span>
              <span className="tw-stat-subtext">
                {isTripActive ? "Interações guardadas" : "Tudo organizado"}
              </span>
            </div>
          </button>
        </section>
      </div>

      <div className="tw-page-view" hidden={activeBottomNavItem !== "newTrip"}>
        <main className="tw-page tw-new-trip-companion-page">
          <section className="tw-new-trip-companion-card">
            <button
              type="button"
              className="tw-new-trip-companion-back"
              onClick={() => setActiveBottomNavItem("dashboard")}
              aria-label="Voltar ao início"
            >
              ×
            </button>

            <CompanionActionSheet
              onUseCompanion={() => {
                setActiveBottomNavItem("companion");
                setIsEditingPreferences(false);
                setIsSettingsOpen(false);
                addLog("Free companion mode opened", "info");
              }}
              onOpenGlassesGuide={() => {
                setIsSmartGlassesGuideOpen(true);
              }}
              onConfigureTrip={() => {
                startNewTrip();
              }}
            />
          </section>
        </main>
      </div>

      <div
        className="tw-page-view"
        hidden={activeBottomNavItem !== "recommendations"}
      >
        <ExplorePage
          preferences={isTripActive ? currentTripPreferences : preferences}
          currentLocation={currentLocation}
          currentTripId={isTripActive ? currentTrip.id : undefined}
          visitedPlaceNames={activeTripPlaces.map((place) => place.name)}
          userProfile={exploreRecommendationProfile}
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
          onMoveToVisit={moveItineraryItemToVisit}
          onMarkAsVisited={markItineraryItemAsVisited}
          onRemoveFromVisit={removeItineraryItemFromVisit}
          onOptimizeItinerary={optimizeItineraryItems}
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
          photos={activeTripPhotos}
          interactions={
            currentTrip
              ? companionInteractions.filter(matchesActiveTrip)
              : companionInteractions
          }
          preferenceSummary={companionPreferenceSummary}
          onBack={() => setActiveBottomNavItem("dashboard")}
          onContinue={() => setActiveBottomNavItem("dashboard")}
          onEditStyle={openCompanionPreferences}
          onChangePreferences={openCompanionPreferences}
          onEndTrip={endCurrentTrip}
          onDeleteInteractions={deleteCompanionInteractions}
        />
      </div>

      <div className="tw-page-view" hidden={activeBottomNavItem !== "memories"}>
        {visibleSections.memories && (
          <MemoriesPage
            photos={activeTripPhotos}
            places={activeTripPlaces}
            transcriptions={activeTripTranscriptions}
            visualDiscoveries={activeTripVisualDiscoveries}
            companionInteractions={
              currentTrip
                ? companionInteractions.filter(matchesActiveTrip)
                : companionInteractions
            }
            pastTrips={pastTrips}
            currentTripId={isTripActive ? currentTrip.id : undefined}
            currentTripName={activeTripName}
            currentTripLocation={activeTripLocation}
            currentTripStartedAt={isTripActive ? currentTrip.startedAt : undefined}
            isTripActive={isTripActive}
            onOpenCompanion={openCompanionFromTripButton}
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
      <div className="tw-page-view" hidden={activeBottomNavItem !== "profile"}>
        {renderProfilePage()}
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

      {isSmartGlassesGuideOpen && (
        <div
          className="tw-guide-modal-backdrop"
          role="presentation"
          onClick={() => setIsSmartGlassesGuideOpen(false)}
        >
          <section
            className="tw-guide-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Como usar os óculos"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="tw-guide-modal-close"
              onClick={() => setIsSmartGlassesGuideOpen(false)}
              aria-label="Fechar guia dos óculos"
            >
              ×
            </button>

            <SmartGlassesGuide
              onComplete={() => setIsSmartGlassesGuideOpen(false)}
            />
          </section>
        </div>
      )}

      <PullToPlusIndicator
        isVisible={
          activeBottomNavItem === "dashboard" &&
          (isPullingToPlus || pullToPlusDistance > 0)
        }
        progress={pullToPlusProgress}
      />

      {renderBottomNav()}
    </main>
  );
}
