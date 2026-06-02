import { useState } from "react";
import {
  ArrowLeft,
  Bot,
  Footprints,
  Leaf,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { TravelPreferences } from "./IntroPreferences";
import {
  assistantStyleOptions,
  type AssistantStyle,
  type DetailLevel,
} from "./onboarding/OnboardingAssistantStep";
import { onboardingInterestOptions } from "./onboarding/OnboardingInterestsStep";

interface TripAdventurePreferencesStepProps {
  preferences: TravelPreferences;
  assistantStyle: AssistantStyle;
  detailLevel: DetailLevel;
  onPreferencesChange: (preferences: TravelPreferences) => void;
  onAssistantStyleChange: (assistantStyle: AssistantStyle) => void;
  onDetailLevelChange: (detailLevel: DetailLevel) => void;
  onBack: () => void;
  onSaveCustom: () => void;
  onUseBase: () => void;
}

type TripAdjustStep = "pace" | "interests" | "companion";

const tripAdjustStepOrder: TripAdjustStep[] = [
  "pace",
  "interests",
  "companion",
];

const travelPaceOptions: Array<{
  id: TravelPreferences["travelPace"];
  label: string;
  description: string;
  icon: LucideIcon;
  tone: "calm" | "balanced" | "intense";
}> = [
  {
    id: "relaxed",
    label: "Tranquilo",
    description: "Focado em relaxar e desfrutar calmamente de cada local.",
    icon: Leaf,
    tone: "calm",
  },
  {
    id: "balanced",
    label: "Equilibrado",
    description: "O melhor de dois mundos: visitas organizadas e tempo livre.",
    icon: Footprints,
    tone: "balanced",
  },
  {
    id: "fast",
    label: "Intenso",
    description: "Máxima exploração, dias cheios de atividades e movimento.",
    icon: Zap,
    tone: "intense",
  },
];

const detailLevelOptions: Array<{ id: DetailLevel; label: string }> = [
  { id: "quick", label: "Rápido" },
  { id: "balanced", label: "Equilibrado" },
  { id: "complete", label: "Mais completo" },
];

export function TripAdventurePreferencesStep({
  preferences,
  assistantStyle,
  detailLevel,
  onPreferencesChange,
  onAssistantStyleChange,
  onDetailLevelChange,
  onBack,
  onSaveCustom,
  onUseBase,
}: TripAdventurePreferencesStepProps) {
  const [adjustStep, setAdjustStep] = useState<TripAdjustStep>("pace");

  const stepIndex = tripAdjustStepOrder.indexOf(adjustStep);
  const progress =
    adjustStep === "pace" ? 60 : adjustStep === "interests" ? 80 : 100;
  const canContinueInterests =
    preferences.interests.length >= 3 && preferences.interests.length <= 6;
  const canSave =
    canContinueInterests &&
    Boolean(preferences.travelPace) &&
    Boolean(preferences.budget) &&
    Boolean(assistantStyle) &&
    Boolean(detailLevel);
  const selectedStyle =
    assistantStyleOptions.find((option) => option.id === assistantStyle) ??
    assistantStyleOptions[0];

  const goBack = () => {
    if (stepIndex === 0) {
      onBack();
      return;
    }

    setAdjustStep(tripAdjustStepOrder[stepIndex - 1]);
  };

  const goNext = () => {
    if (stepIndex < tripAdjustStepOrder.length - 1) {
      setAdjustStep(tripAdjustStepOrder[stepIndex + 1]);
      return;
    }

    onSaveCustom();
  };

  const toggleInterest = (interestId: string) => {
    const isSelected = preferences.interests.includes(interestId);

    if (!isSelected && preferences.interests.length >= 6) return;

    onPreferencesChange({
      ...preferences,
      interests: isSelected
        ? preferences.interests.filter((id) => id !== interestId)
        : [...preferences.interests, interestId],
    });
  };

  const continueDisabled =
    adjustStep === "interests"
      ? !canContinueInterests
      : adjustStep === "companion"
        ? !canSave
        : false;

  return (
    <main className="ob-setup-page ob-trip-adjust-flow-page">
      <header className="ob-trip-adjust-flow-header">
        <button
          type="button"
          className="ob-setup-icon-button"
          onClick={goBack}
          aria-label="Voltar"
        >
          <ArrowLeft className="ob-setup-back-icon" />
        </button>

        <div
          className="ob-trip-adjust-flow-progress"
          aria-label="Configurar viagem"
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      </header>

      <section className="ob-trip-adjust-flow-content">
        {adjustStep === "pace" && (
          <>
            <div className="ob-setup-copy ob-trip-adjust-flow-copy">
              <h1>Qual é o ritmo desta aventura?</h1>
              <p>Como queres equilibrar o descanso e a exploração?</p>
            </div>

            <div
              className="ob-trip-pace-list"
              role="group"
              aria-label="Ritmo da viagem"
            >
              {travelPaceOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = preferences.travelPace === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`ob-trip-pace-card ${
                      isSelected ? "ob-trip-pace-card-selected" : ""
                    }`}
                    onClick={() =>
                      onPreferencesChange({
                        ...preferences,
                        travelPace: option.id,
                      })
                    }
                    aria-pressed={isSelected}
                  >
                    <span
                      className={`ob-trip-pace-icon ob-trip-pace-icon-${option.tone}`}
                      aria-hidden="true"
                    >
                      <Icon />
                    </span>

                    <span className="ob-trip-pace-copy">
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {adjustStep === "interests" && (
          <>
            <div className="ob-setup-copy ob-trip-adjust-flow-copy">
              <h1>O que queres descobrir nesta viagem?</h1>
              <p>
                Escolhe os interesses que fazem mais sentido para esta
                aventura.
              </p>
              <span className="ob-interests-helper">
                Escolhe 3 a 6 favoritos.
              </span>
            </div>

            <div className="ob-interest-chip-grid" aria-label="Interesses">
              {onboardingInterestOptions.map((interest) => {
                const Icon = interest.icon;
                const isSelected = preferences.interests.includes(interest.id);
                const isDisabled =
                  !isSelected && preferences.interests.length >= 6;

                return (
                  <button
                    key={interest.id}
                    type="button"
                    className={`ob-interest-chip ${
                      isSelected ? "ob-interest-chip-selected" : ""
                    }`}
                    onClick={() => toggleInterest(interest.id)}
                    disabled={isDisabled}
                    aria-pressed={isSelected}
                  >
                    <Icon className="ob-interest-chip-icon" />
                    <span>{interest.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {adjustStep === "companion" && (
          <>
            <div className="ob-setup-copy ob-trip-adjust-flow-copy">
              <h1>Como queres que o Companion responda?</h1>
              <p>Escolhe o tom e o nível de detalhe só para esta viagem.</p>
            </div>

            <section className="ob-assistant-section">
              <h2 className="ob-setup-section-label">Estilo de conversa</h2>

              <div className="ob-assistant-card-grid">
                {assistantStyleOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = option.id === assistantStyle;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`ob-assistant-card ${
                        isSelected ? "ob-assistant-card-selected" : ""
                      }`}
                      onClick={() => onAssistantStyleChange(option.id)}
                      aria-pressed={isSelected}
                    >
                      <Icon className="ob-assistant-card-icon" />
                      <span>{option.title}</span>
                      <p>{option.description}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="ob-assistant-section">
              <h2 className="ob-setup-section-label">Nível de detalhe</h2>

              <div className="ob-detail-segment" role="group">
                {detailLevelOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`ob-detail-choice ${
                      option.id === detailLevel
                        ? "ob-detail-choice-selected"
                        : ""
                    }`}
                    onClick={() => onDetailLevelChange(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>

            <article className="ob-preview-card">
              <div className="ob-preview-avatar">
                <Bot className="ob-preview-avatar-icon" />
              </div>

              <div className="ob-preview-copy">
                <h3>O teu Companion</h3>
                <p>{selectedStyle.preview}</p>
              </div>
            </article>
          </>
        )}
      </section>

      <footer className="ob-setup-footer ob-trip-adjust-flow-footer">
        <button
          type="button"
          className="ob-setup-primary"
          onClick={goNext}
          disabled={continueDisabled}
        >
          {adjustStep === "companion" ? "Guardar para esta viagem" : "Continuar"}
        </button>

        <button type="button" className="ob-setup-secondary" onClick={onUseBase}>
          Usar estilo base
        </button>
      </footer>
    </main>
  );
}
