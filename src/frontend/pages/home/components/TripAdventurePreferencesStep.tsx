import { ArrowLeft, Bot, Coins, Gauge } from "lucide-react";

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

const travelPaceOptions: Array<{
  id: TravelPreferences["travelPace"];
  label: string;
  description: string;
}> = [
  {
    id: "relaxed",
    label: "Relaxado",
    description: "Mais tempo para apreciar cada paragem.",
  },
  {
    id: "balanced",
    label: "Equilibrado",
    description: "Mistura descoberta com pausas naturais.",
  },
  {
    id: "fast",
    label: "Intenso",
    description: "Mais locais e menos tempo parado.",
  },
];

const budgetOptions: Array<{
  id: TravelPreferences["budget"];
  label: string;
  description: string;
}> = [
  {
    id: "low",
    label: "Económico",
    description: "Sugestões acessíveis e locais simples.",
  },
  {
    id: "medium",
    label: "Médio",
    description: "Equilíbrio entre preço e experiência.",
  },
  {
    id: "high",
    label: "Premium",
    description: "Experiências especiais quando fizer sentido.",
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
  const canSave =
    preferences.interests.length >= 3 &&
    preferences.interests.length <= 6 &&
    Boolean(preferences.travelPace) &&
    Boolean(preferences.budget) &&
    Boolean(assistantStyle) &&
    Boolean(detailLevel);

  const selectedStyle =
    assistantStyleOptions.find((option) => option.id === assistantStyle) ??
    assistantStyleOptions[0];

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

  return (
    <main className="ob-setup-page ob-interests-page ob-trip-adjust-page">
      <header className="ob-setup-header">
        <button
          type="button"
          className="ob-setup-icon-button"
          onClick={onBack}
          aria-label="Voltar"
        >
          <ArrowLeft className="ob-setup-back-icon" />
        </button>

        <div className="ob-setup-progress" aria-label="Configurar viagem">
          <span className="ob-setup-progress-bar ob-setup-progress-bar-active" />
          <span className="ob-setup-progress-bar ob-setup-progress-bar-active" />
          <span className="ob-setup-progress-bar" />
        </div>

        <button type="button" className="ob-setup-skip" onClick={onUseBase}>
          Base
        </button>

        <p className="ob-setup-step-label">Preferências desta viagem</p>
      </header>

      <section
        className="ob-setup-content ob-interests-content ob-trip-adjust-content"
        aria-labelledby="trip-adjust-title"
      >
        <div className="ob-setup-copy ob-interests-copy">
          <h1 id="trip-adjust-title">Ajustar esta aventura</h1>
          <p>
            Personaliza as preferências só para esta viagem. O teu perfil base
            não será alterado.
          </p>
        </div>

        <section className="ob-onboarding-preference-section">
          <div className="ob-setup-copy ob-trip-adjust-section-copy">
            <h2 className="ob-setup-section-label">
              O que queres descobrir nesta viagem?
            </h2>
            <p>Escolhe os interesses que fazem mais sentido para esta aventura.</p>
            <span className="ob-interests-helper">Escolhe 3 a 6 favoritos.</span>
          </div>

          <div className="ob-interest-chip-grid" aria-label="Interesses">
            {onboardingInterestOptions.map((interest) => {
              const Icon = interest.icon;
              const isSelected = preferences.interests.includes(interest.id);
              const isDisabled = !isSelected && preferences.interests.length >= 6;

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
        </section>

        <section className="ob-onboarding-preference-section">
          <h2 className="ob-setup-section-label">
            <Gauge className="ob-preference-section-icon" />
            Qual é o ritmo desta aventura?
          </h2>

          <div className="ob-preference-choice-grid" role="group">
            {travelPaceOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`ob-preference-choice ${
                  preferences.travelPace === option.id
                    ? "ob-preference-choice-selected"
                    : ""
                }`}
                onClick={() =>
                  onPreferencesChange({
                    ...preferences,
                    travelPace: option.id,
                  })
                }
              >
                <span>{option.label}</span>
                <small>{option.description}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="ob-onboarding-preference-section">
          <h2 className="ob-setup-section-label">
            <Coins className="ob-preference-section-icon" />
            Qual é o orçamento desta viagem?
          </h2>

          <div className="ob-preference-choice-grid" role="group">
            {budgetOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`ob-preference-choice ${
                  preferences.budget === option.id
                    ? "ob-preference-choice-selected"
                    : ""
                }`}
                onClick={() =>
                  onPreferencesChange({
                    ...preferences,
                    budget: option.id,
                  })
                }
              >
                <span>{option.label}</span>
                <small>{option.description}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="ob-assistant-section">
          <h2 className="ob-setup-section-label">
            Como queres que o Companion responda nesta viagem?
          </h2>

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
                  option.id === detailLevel ? "ob-detail-choice-selected" : ""
                }`}
                onClick={() => onDetailLevelChange(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="ob-assistant-section">
          <h2 className="ob-setup-section-label">Pré-visualização</h2>

          <article className="ob-preview-card">
            <div className="ob-preview-avatar">
              <Bot className="ob-preview-avatar-icon" />
            </div>

            <div className="ob-preview-copy">
              <h3>O teu Companion</h3>
              <p>
                “O teu Companion vai adaptar as sugestões desta viagem com base
                nestas escolhas, sem alterar o teu perfil base.”
              </p>
              <p className="ob-trip-adjust-preview-note">
                Estilo selecionado: {selectedStyle.title}
              </p>
            </div>
          </article>
        </section>
      </section>

      <footer className="ob-setup-footer">
        <button
          type="button"
          className="ob-setup-primary"
          onClick={onSaveCustom}
          disabled={!canSave}
        >
          Guardar para esta viagem
        </button>

        <button type="button" className="ob-setup-secondary" onClick={onUseBase}>
          Usar estilo base
        </button>
      </footer>
    </main>
  );
}
