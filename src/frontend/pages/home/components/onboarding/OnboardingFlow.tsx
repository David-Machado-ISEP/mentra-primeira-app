import { useState } from "react";
import type { TravelPreferences } from "../IntroPreferences";
import {
  OnboardingAssistantStep,
  type AssistantStyle,
  type DetailLevel,
} from "./OnboardingAssistantStep";
import {
  OnboardingInterestsStep,
  type OnboardingTravelBudget,
  type OnboardingTravelPace,
} from "./OnboardingInterestsStep";
import { OnboardingIntro } from "./OnboardingIntro";
import { OnboardingNameStep } from "./OnboardingNameStep";
import { OnboardingSummary } from "./OnboardingSummary";
import { SmartGlassesGuide } from "./SmartGlassesGuide";

type AppLanguage = "pt" | "en" | "es" | "fr";
type AvatarTone = "ocean" | "mint" | "violet";

interface OnboardingProfile {
  name: string;
  avatarTone: AvatarTone;
  primaryLanguage: AppLanguage;
  translationLanguages: string[];
  assistantStyle?: AssistantStyle;
  detailLevel?: DetailLevel;
  completedAt: string;
}

type OnboardingDraftPreferences = Omit<
  TravelPreferences,
  "travelPace" | "budget"
> & {
  travelPace: OnboardingTravelPace;
  budget: OnboardingTravelBudget;
};

interface OnboardingFlowProps {
  preferences: TravelPreferences;
  initialAppLanguage: AppLanguage;
  initialTargetLanguage: string;
  onSavePreferences: (preferences: TravelPreferences) => void;
  onAppLanguageChange: (language: AppLanguage) => void;
  onTargetLanguageChange: (language: string) => void;
  onComplete: () => void;
}

const profileStorageKey = "travel-whisperer-user-profile";

const getSavedProfile = (
  initialAppLanguage: AppLanguage,
  initialTargetLanguage: string,
): OnboardingProfile => {
  try {
    const saved = localStorage.getItem(profileStorageKey);

    if (saved) {
      const parsed = JSON.parse(saved) as Partial<OnboardingProfile>;

      return {
        name: parsed.name && parsed.name !== "Viajante" ? parsed.name : "",
        avatarTone: parsed.avatarTone ?? "ocean",
        primaryLanguage: parsed.primaryLanguage ?? initialAppLanguage,
        translationLanguages:
          parsed.translationLanguages && parsed.translationLanguages.length > 0
            ? parsed.translationLanguages
            : [initialTargetLanguage],
        assistantStyle: parsed.assistantStyle,
        detailLevel: parsed.detailLevel,
        completedAt: parsed.completedAt ?? "",
      };
    }
  } catch {
    // Fall back to the current app settings.
  }

  return {
    name: "",
    avatarTone: "ocean",
    primaryLanguage: initialAppLanguage,
    translationLanguages: [initialTargetLanguage],
    completedAt: "",
  };
};

export function OnboardingFlow({
  preferences,
  initialAppLanguage,
  initialTargetLanguage,
  onSavePreferences,
  onAppLanguageChange,
  onTargetLanguageChange,
  onComplete,
}: OnboardingFlowProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [profile, setProfile] = useState<OnboardingProfile>(() =>
    getSavedProfile(initialAppLanguage, initialTargetLanguage),
  );
  const [draftPreferences, setDraftPreferences] =
    useState<OnboardingDraftPreferences>(() => ({
      interests: [],
      travelPace: "",
      budget: "",
    }));

  const totalSlides = 6;
  const profileName = profile.name.trim();
  const selectedTargetLanguage =
    profile.translationLanguages[0] ?? initialTargetLanguage;

  const goToSlide = (slideIndex: number) => {
    setActiveSlide(Math.max(0, Math.min(totalSlides - 1, slideIndex)));
  };

  const goNext = () => {
    goToSlide(activeSlide + 1);
  };

  const goBack = () => {
    goToSlide(activeSlide - 1);
  };

  const handleComplete = () => {
    if (!profile.assistantStyle || !profile.detailLevel) {
      goToSlide(3);
      return;
    }

    const nextProfile: OnboardingProfile = {
      ...profile,
      name: profileName,
      completedAt: new Date().toISOString(),
    };
    const hasCompletePreferences =
      draftPreferences.interests.length >= 3 &&
      draftPreferences.interests.length <= 6 &&
      Boolean(draftPreferences.travelPace) &&
      Boolean(draftPreferences.budget);

    localStorage.setItem(profileStorageKey, JSON.stringify(nextProfile));

    if (hasCompletePreferences) {
      onSavePreferences(draftPreferences as TravelPreferences);
    } else {
      localStorage.removeItem("travel-whisperer-preferences");
    }

    onAppLanguageChange(nextProfile.primaryLanguage);
    onTargetLanguageChange(selectedTargetLanguage);
    onComplete();
  };

  const handleNameContinue = () => {
    goNext();
  };

  const toggleOnboardingInterest = (interestId: string) => {
    setDraftPreferences((prev) => {
      const isSelected = prev.interests.includes(interestId);

      if (!isSelected && prev.interests.length >= 6) {
        return prev;
      }

      return {
        ...prev,
        interests: isSelected
          ? prev.interests.filter((id) => id !== interestId)
          : [...prev.interests, interestId],
      };
    });
  };

  if (activeSlide === 0) {
    return <OnboardingIntro onStart={goNext} />;
  }

  if (activeSlide === 1) {
    return (
      <OnboardingNameStep
        name={profile.name}
        onNameChange={(name) =>
          setProfile((prev) => ({
            ...prev,
            name,
          }))
        }
        onBack={goBack}
        onContinue={handleNameContinue}
        onSkip={goNext}
      />
    );
  }

  if (activeSlide === 2) {
    return (
      <OnboardingInterestsStep
        selectedInterests={draftPreferences.interests}
        travelPace={draftPreferences.travelPace}
        budget={draftPreferences.budget}
        onToggleInterest={toggleOnboardingInterest}
        onTravelPaceChange={(travelPace) =>
          setDraftPreferences((prev) => ({
            ...prev,
            travelPace,
          }))
        }
        onBudgetChange={(budget) =>
          setDraftPreferences((prev) => ({
            ...prev,
            budget,
          }))
        }
        onBack={goBack}
        onContinue={goNext}
        onSkip={goNext}
      />
    );
  }

  if (activeSlide === 3) {
    return (
      <OnboardingAssistantStep
        assistantStyle={profile.assistantStyle ?? ""}
        detailLevel={profile.detailLevel ?? ""}
        onAssistantStyleChange={(assistantStyle) =>
          setProfile((prev) => ({
            ...prev,
            assistantStyle,
          }))
        }
        onDetailLevelChange={(detailLevel) =>
          setProfile((prev) => ({
            ...prev,
            detailLevel,
          }))
        }
        onBack={goBack}
        onContinue={goNext}
      />
    );
  }

  if (activeSlide === 4) {
    return <SmartGlassesGuide onComplete={goNext} />;
  }

  if (activeSlide === 5) {
    return (
      <OnboardingSummary
        userName={profileName || profile.name}
        preferences={draftPreferences}
        assistantStyle={profile.assistantStyle ?? "localFriend"}
        detailLevel={profile.detailLevel ?? "balanced"}
        onStartExploring={handleComplete}
        onEditPreferences={() => goToSlide(1)}
      />
    );
  }

  return (
    <OnboardingIntro onStart={() => goToSlide(1)} />
  );
}
