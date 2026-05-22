import { useMemo, useState, type TouchEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Eye,
  MapPin,
  ScanText,
  Sparkles,
} from "lucide-react";

import { Button, Input } from "../../../../components/ui";
import type { TravelPreferences } from "../IntroPreferences";
import { OnboardingSlide } from "./OnboardingSlide";

type AppLanguage = "pt" | "en" | "es" | "fr";
type AvatarTone = "ocean" | "mint" | "violet";

interface OnboardingProfile {
  name: string;
  avatarTone: AvatarTone;
  primaryLanguage: AppLanguage;
  translationLanguages: string[];
  completedAt: string;
}

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

const languageOptions: Array<{ value: AppLanguage; label: string }> = [
  { value: "pt", label: "Português" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
];

const translationOptions = [
  "English",
  "Português",
  "Español",
  "Français",
  "Deutsch",
  "Italiano",
];

const avatarOptions: Array<{ value: AvatarTone; label: string }> = [
  { value: "ocean", label: "Azul" },
  { value: "mint", label: "Verde" },
  { value: "violet", label: "Violeta" },
];

const gestureCards = [
  {
    icon: Camera,
    label: "Single Tap",
    title: "Tira uma fotografia",
    description: "Guarda rapidamente aquilo que estás a ver.",
  },
  {
    icon: Eye,
    label: "Triple Tap",
    title: "Pergunta o que estás a ver",
    description: "A AI descreve monumentos, locais e detalhes à tua volta.",
  },
  {
    icon: ScanText,
    label: "Long Press",
    title: "Traduz menus e texto",
    description: "Tira foto e traduz automaticamente quando precisares.",
  },
];

const getSavedProfile = (
  initialAppLanguage: AppLanguage,
  initialTargetLanguage: string,
): OnboardingProfile => {
  try {
    const saved = localStorage.getItem(profileStorageKey);

    if (saved) {
      const parsed = JSON.parse(saved) as Partial<OnboardingProfile>;

      return {
        name: parsed.name ?? "",
        avatarTone: parsed.avatarTone ?? "ocean",
        primaryLanguage: parsed.primaryLanguage ?? initialAppLanguage,
        translationLanguages:
          parsed.translationLanguages && parsed.translationLanguages.length > 0
            ? parsed.translationLanguages
            : [initialTargetLanguage],
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

const getInitials = (name: string) => {
  const normalizedName = name.trim();

  if (!normalizedName) return "TW";

  return normalizedName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
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
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const totalSlides = 4;
  const canGoBack = activeSlide > 0;
  const profileName = profile.name.trim();
  const selectedTargetLanguage =
    profile.translationLanguages[0] ?? initialTargetLanguage;

  const progressLabel = useMemo(
    () => `${activeSlide + 1} de ${totalSlides}`,
    [activeSlide],
  );

  const goToSlide = (slideIndex: number) => {
    setActiveSlide(Math.max(0, Math.min(totalSlides - 1, slideIndex)));
  };

  const goNext = () => {
    goToSlide(activeSlide + 1);
  };

  const goBack = () => {
    goToSlide(activeSlide - 1);
  };

  const toggleTranslationLanguage = (language: string) => {
    setProfile((prev) => {
      const isSelected = prev.translationLanguages.includes(language);

      if (isSelected && prev.translationLanguages.length === 1) {
        return prev;
      }

      return {
        ...prev,
        translationLanguages: isSelected
          ? prev.translationLanguages.filter((item) => item !== language)
          : [...prev.translationLanguages, language],
      };
    });
  };

  const handleComplete = () => {
    const nextProfile: OnboardingProfile = {
      ...profile,
      name: profileName,
      completedAt: new Date().toISOString(),
    };

    localStorage.setItem(profileStorageKey, JSON.stringify(nextProfile));
    onSavePreferences(preferences);
    onAppLanguageChange(nextProfile.primaryLanguage);
    onTargetLanguageChange(selectedTargetLanguage);
    onComplete();
  };

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    setTouchStartX(touch.clientX);
    setTouchStartY(touch.clientY);
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (touchStartX === null || touchStartY === null) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = Math.abs(touch.clientY - touchStartY);

    setTouchStartX(null);
    setTouchStartY(null);

    if (Math.abs(deltaX) < 58 || deltaY > 72) return;

    if (deltaX < 0) {
      goNext();
      return;
    }

    if (deltaX > 0) {
      goBack();
    }
  };

  return (
    <main
      className="ob-page"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header className="ob-topbar">
        <div className="ob-brand-mark">
          <Camera className="ob-brand-icon" />
        </div>

        <div>
          <p className="ob-brand-name">Travel Whisperer</p>
          <p className="ob-brand-subtitle">Mentra Live Travel Assistant</p>
        </div>
      </header>

      <div className="ob-frame">
        <div
          className="ob-track"
          style={{ transform: `translateX(-${activeSlide * 100}%)` }}
        >
          <OnboardingSlide
            eyebrow="Smart glasses travel companion"
            title="Explora mais. Olha menos para o telemóvel."
            description="A Travel Whisperer acompanha a tua viagem nos Mentra Live com câmara, voz, localização e AI discreta."
            className="ob-slide-intro"
            media={
              <div className="ob-photo-card" aria-hidden="true">
                <div className="ob-photo-caption">
                  <MapPin className="ob-photo-caption-icon" />
                  <span>Travel mode</span>
                </div>
              </div>
            }
          >
            <p className="ob-quote">
              Informação útil no momento certo, sem interromper a experiência.
            </p>
          </OnboardingSlide>

          <OnboardingSlide
            eyebrow="Como funciona"
            title="Gestos simples para viajar sem fricção."
            description="As ações principais ficam nos óculos, para poderes continuar atento ao lugar onde estás."
          >
            <div className="ob-gesture-grid">
              {gestureCards.map((gesture) => {
                const Icon = gesture.icon;

                return (
                  <article className="ob-gesture-card" key={gesture.label}>
                    <div className="ob-gesture-icon-wrap">
                      <Icon className="ob-gesture-icon" />
                    </div>

                    <div className="ob-gesture-copy">
                      <p>{gesture.label}</p>
                      <h2>{gesture.title}</h2>
                      <span>{gesture.description}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </OnboardingSlide>

          <OnboardingSlide
            eyebrow="Perfil"
            title="Configura só o essencial."
            description="Podes alterar estes dados mais tarde no perfil e nas definições da aplicação."
          >
            <div className="ob-profile-layout">
              <div className={`ob-avatar-preview ob-avatar-${profile.avatarTone}`}>
                <span>{getInitials(profile.name)}</span>
              </div>

              <div className="ob-avatar-options" aria-label="Escolher avatar">
                {avatarOptions.map((avatar) => (
                  <button
                    key={avatar.value}
                    type="button"
                    className={`ob-avatar-option ob-avatar-${avatar.value} ${
                      profile.avatarTone === avatar.value
                        ? "ob-avatar-option-selected"
                        : ""
                    }`}
                    onClick={() =>
                      setProfile((prev) => ({
                        ...prev,
                        avatarTone: avatar.value,
                      }))
                    }
                    aria-label={`Avatar ${avatar.label}`}
                  />
                ))}
              </div>

              <label className="ob-field">
                <span>Nome</span>
                <Input
                  className="ob-input"
                  value={profile.name}
                  placeholder="Como te devemos chamar?"
                  onChange={(event) =>
                    setProfile((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="ob-field">
                <span>Idioma principal</span>
                <select
                  className="ob-select"
                  value={profile.primaryLanguage}
                  onChange={(event) =>
                    setProfile((prev) => ({
                      ...prev,
                      primaryLanguage: event.target.value as AppLanguage,
                    }))
                  }
                >
                  {languageOptions.map((language) => (
                    <option key={language.value} value={language.value}>
                      {language.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="ob-field">
                <span>Idiomas de tradução</span>

                <div className="ob-language-grid">
                  {translationOptions.map((language) => {
                    const isSelected =
                      profile.translationLanguages.includes(language);

                    return (
                      <button
                        key={language}
                        type="button"
                        className={`ob-language-chip ${
                          isSelected ? "ob-language-chip-selected" : ""
                        }`}
                        onClick={() => toggleTranslationLanguage(language)}
                      >
                        {isSelected && <Check className="ob-chip-check" />}
                        {language}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </OnboardingSlide>

          <OnboardingSlide
            eyebrow="Tudo pronto"
            title="A tua viagem começa mais leve."
            description="A Travel Whisperer fica pronta para guardar momentos, explicar o que estás a ver e ajudar quando precisares de tradução."
            className="ob-slide-final"
          >
            <div className="ob-summary-card">
              <div className="ob-summary-icon">
                <Sparkles className="ob-summary-icon-svg" />
              </div>

              <div>
                <h2>{profileName ? `Boa viagem, ${profileName}.` : "Boa viagem."}</h2>
                <p>
                  Câmera, voz, GPS e recomendações ficam alinhados para a tua
                  experiência.
                </p>
              </div>
            </div>
          </OnboardingSlide>
        </div>
      </div>

      <footer className="ob-footer">
        <div className="ob-progress" aria-label={`Página ${progressLabel}`}>
          {Array.from({ length: totalSlides }).map((_, index) => (
            <button
              key={index}
              type="button"
              className={`ob-dot ${index === activeSlide ? "ob-dot-active" : ""}`}
              onClick={() => goToSlide(index)}
              aria-label={`Ir para página ${index + 1}`}
              aria-current={index === activeSlide ? "step" : undefined}
            />
          ))}
        </div>

        <div className="ob-navigation">
          <Button
            variant="secondary"
            className="ob-button ob-button-secondary"
            onClick={goBack}
            disabled={!canGoBack}
          >
            <ArrowLeft className="ob-button-icon" />
            Voltar
          </Button>

          {activeSlide < totalSlides - 1 ? (
            <Button className="ob-button ob-button-primary" onClick={goNext}>
              {activeSlide === 0 ? "Começar" : "Continuar"}
              <ArrowRight className="ob-button-icon" />
            </Button>
          ) : (
            <Button
              className="ob-button ob-button-primary"
              onClick={handleComplete}
            >
              Entrar na experiência
              <ArrowRight className="ob-button-icon" />
            </Button>
          )}
        </div>
      </footer>
    </main>
  );
}
