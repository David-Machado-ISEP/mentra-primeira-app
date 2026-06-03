import {
  ArrowRight,
  Bot,
  Glasses,
  Gauge,
  Heart,
  Radio,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";

import type { TravelPreferences } from "../IntroPreferences";
import {
  assistantStyleOptions,
  type AssistantStyle,
  type DetailLevel,
} from "./OnboardingAssistantStep";
import { onboardingInterestOptions } from "./OnboardingInterestsStep";

interface OnboardingSummaryProps {
  userName: string;
  preferences: Omit<TravelPreferences, "travelPace" | "budget"> & {
    travelPace?: TravelPreferences["travelPace"] | "";
    budget?: TravelPreferences["budget"] | "";
  };
  assistantStyle: AssistantStyle;
  detailLevel: DetailLevel;
  smartglassesConnected?: boolean;
  onStartExploring: () => void;
  onEditPreferences: () => void;
}

const assistantName = "Atlas";

const toneLabels: Record<AssistantStyle, string> = {
  localFriend: "Casual",
  storyteller: "Narrativo",
  expertGuide: "Especialista",
  curiousExplorer: "Curioso",
};

const detailLabels: Record<DetailLevel, string> = {
  quick: "Curto e direto",
  balanced: "Equilibrado",
  complete: "Mais completo",
};

const detailProgress: Record<DetailLevel, string> = {
  quick: "34%",
  balanced: "66%",
  complete: "100%",
};

const paceLabels: Record<TravelPreferences["travelPace"], string> = {
  relaxed: "Ritmo calmo",
  balanced: "Ritmo equilibrado",
  fast: "Ritmo rápido",
};

const budgetLabels: Record<TravelPreferences["budget"], string> = {
  low: "Orçamento económico",
  medium: "Orçamento médio",
  high: "Orçamento premium",
};

const getInterestLabels = (interests: string[]) => {
  const labels = interests
    .map(
      (interestId) =>
        onboardingInterestOptions.find((option) => option.id === interestId)
          ?.label,
    )
    .filter(Boolean) as string[];

  return labels;
};

const getAssistantSubtitle = (interestLabels: string[]) => {
  const primaryInterest = interestLabels[0] ?? "Viagem";
  const secondaryInterest = interestLabels[1] ?? "descobertas locais";

  return `Especialista em ${primaryInterest} e ${secondaryInterest}`;
};

export function OnboardingSummary({
  userName,
  preferences,
  assistantStyle,
  detailLevel,
  smartglassesConnected = false,
  onStartExploring,
  onEditPreferences,
}: OnboardingSummaryProps) {
  const displayName = userName.trim();
  const interestLabels = getInterestLabels(preferences.interests);
  const hasInterestLabels = interestLabels.length > 0;
  const glassesStatus = smartglassesConnected ? "Ligados" : "Não ligados";
  const selectedAssistantStyle =
    assistantStyleOptions.find((option) => option.id === assistantStyle) ??
    assistantStyleOptions[0];
  const assistantSubtitle = getAssistantSubtitle(interestLabels);

  return (
    <main className="ob-summary-page">
      <section className="ob-summary-scroll" aria-labelledby="ob-summary-title">
        <header className="ob-summary-header">
          <div className="ob-summary-main-icon" aria-hidden="true">
            <Bot className="ob-summary-main-icon-svg" />
          </div>

          <h1 id="ob-summary-title">
            {displayName
              ? `${displayName}, o teu companheiro está pronto`
              : "O teu companheiro está pronto"}
          </h1>
          <p>
            Tudo configurado com as tuas preferências. Conhece o teu guia
            virtual para a próxima aventura.
          </p>
        </header>

        <article className="ob-summary-assistant-card">
          <div className="ob-summary-orb" aria-hidden="true">
            <span />
          </div>

          <span className="ob-summary-status">
            <span />
            Online e pronto
          </span>

          <h2>{assistantName}</h2>
          <strong className="ob-summary-user-link">
            {displayName ? `Configurado para ${displayName}` : "Perfil configurado"}
          </strong>
          <p>{assistantSubtitle}</p>
        </article>

        <article className="ob-summary-info-card">
          <div className="ob-summary-info-title">
            <Heart className="ob-summary-info-icon" />
            <h2>Preferências</h2>
          </div>

          <div className="ob-summary-chip-list">
            {hasInterestLabels ? (
              interestLabels.map((interest) => (
                <span className="ob-summary-chip" key={interest}>
                  {interest}
                </span>
              ))
            ) : (
              <span className="ob-summary-chip">Interesses por preencher</span>
            )}
          </div>

          <div className="ob-summary-preference-meta">
            <span>
              <Gauge className="ob-summary-meta-icon" />
              {preferences.travelPace
                ? paceLabels[preferences.travelPace]
                : "Ritmo por preencher"}
            </span>
            <span>
              <Wallet className="ob-summary-meta-icon" />
              {preferences.budget
                ? budgetLabels[preferences.budget]
                : "Orçamento por preencher"}
            </span>
          </div>
        </article>

        <article className="ob-summary-info-card ob-summary-communication-card">
          <div className="ob-summary-info-title">
            <SlidersHorizontal className="ob-summary-info-icon" />
            <h2>Comunicação</h2>
          </div>

          <div className="ob-summary-setting-row">
            <span>Tom</span>
            <strong>{toneLabels[assistantStyle]}</strong>
          </div>

          <div className="ob-summary-setting-row">
            <span>Estilo</span>
            <strong>{selectedAssistantStyle.title}</strong>
          </div>

          <div className="ob-summary-meter" aria-hidden="true">
            <span style={{ width: detailProgress[detailLevel] }} />
          </div>

          <div className="ob-summary-setting-row">
            <span>Detalhe</span>
            <strong>{detailLabels[detailLevel]}</strong>
          </div>
        </article>

        <article className="ob-summary-glasses-card">
          <div className="ob-summary-glasses-copy">
            <div className="ob-summary-glasses-icon" aria-hidden="true">
              <Glasses className="ob-summary-info-icon" />
            </div>

            <div>
              <h2>Smartglasses</h2>
              <p>{glassesStatus}</p>
            </div>
          </div>

          <button
            type="button"
            className="ob-summary-connect-button"
            onClick={() => {
              console.log("[Onboarding] Ligar smartglasses ainda não implementado");
            }}
          >
            <Radio className="ob-summary-connect-icon" />
            Ligar smartglasses
          </button>
        </article>
      </section>

      <footer className="ob-summary-footer">
        <button
          type="button"
          className="ob-setup-primary ob-summary-start-button"
          onClick={onStartExploring}
        >
          Começar a explorar
          <ArrowRight className="ob-summary-start-icon" />
        </button>

        <button
          type="button"
          className="ob-summary-edit-button"
          onClick={onEditPreferences}
        >
          Editar preferências
        </button>
      </footer>
    </main>
  );
}
