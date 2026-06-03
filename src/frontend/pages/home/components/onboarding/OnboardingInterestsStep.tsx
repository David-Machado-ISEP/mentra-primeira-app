import {
  ArrowLeft,
  Building2,
  Camera,
  Coins,
  Footprints,
  Gauge,
  Martini,
  Palette,
  ShoppingBag,
  Trees,
  UsersRound,
  Utensils,
  Waves,
  type LucideIcon,
} from "lucide-react";

interface InterestOption {
  id: string;
  label: string;
  icon: LucideIcon;
}

type TravelPace = "relaxed" | "balanced" | "fast";
type TravelBudget = "low" | "medium" | "high";
export type OnboardingTravelPace = TravelPace | "";
export type OnboardingTravelBudget = TravelBudget | "";

interface PreferenceChoice<TValue extends string> {
  id: TValue;
  label: string;
  description: string;
}

interface OnboardingInterestsStepProps {
  selectedInterests: string[];
  travelPace: OnboardingTravelPace;
  budget: OnboardingTravelBudget;
  onToggleInterest: (interestId: string) => void;
  onTravelPaceChange: (pace: TravelPace) => void;
  onBudgetChange: (budget: TravelBudget) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}

export const onboardingInterestOptions: InterestOption[] = [
  {
    id: "monuments",
    label: "História e Arte",
    icon: Palette, 
  },
  {
    id: "local_food",
    label: "Gastronomia",
    icon: Utensils,
  },
  {
    id: "nature",
    label: "Natureza",
    icon: Trees,
  },
  {
    id: "architecture",
    label: "Arquitetura",
    icon: Building2,
  },
  {
    id: "nightlife",
    label: "Vida Noturna",
    icon: Martini,
  },
  {
    id: "local_culture",
    label: "Cultura Local",
    icon: UsersRound,
  },
  {
    id: "shopping",
    label: "Compras",
    icon: ShoppingBag,
  },
  {
    id: "photography",
    label: "Fotografia",
    icon: Camera,
  },
  {
    id: "adventure",
    label: "Aventura",
    icon: Footprints,
  },
  {
    id: "beaches",
    label: "Praias",
    icon: Waves,
  },
];

const travelPaceOptions: PreferenceChoice<TravelPace>[] = [
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
    label: "Rápido",
    description: "Mais locais e menos tempo parado.",
  },
];

const budgetOptions: PreferenceChoice<TravelBudget>[] = [
  {
    id: "low",
    label: "Baixo",
    description: "Sugestões económicas e locais acessíveis.",
  },
  {
    id: "medium",
    label: "Médio",
    description: "Equilíbrio entre preço e experiência.",
  },
  {
    id: "high",
    label: "Alto",
    description: "Experiências premium quando fizer sentido.",
  },
];

export function OnboardingInterestsStep({
  selectedInterests,
  travelPace,
  budget,
  onToggleInterest,
  onTravelPaceChange,
  onBudgetChange,
  onBack,
  onContinue,
  onSkip,
}: OnboardingInterestsStepProps) {
  const canContinue =
    selectedInterests.length >= 3 &&
    selectedInterests.length <= 6 &&
    Boolean(travelPace) &&
    Boolean(budget);

  return (
    <main className="ob-setup-page ob-interests-page">
      <header className="ob-setup-header">
        <button
          type="button"
          className="ob-setup-icon-button"
          onClick={onBack}
          aria-label="Voltar"
        >
          <ArrowLeft className="ob-setup-back-icon" />
        </button>

        <div className="ob-setup-progress" aria-label="Passo 2 de 3">
          <span className="ob-setup-progress-bar ob-setup-progress-bar-active" />
          <span className="ob-setup-progress-bar ob-setup-progress-bar-active" />
          <span className="ob-setup-progress-bar" />
        </div>

        <button type="button" className="ob-setup-skip" onClick={onSkip}>
          Saltar
        </button>

        <p className="ob-setup-step-label">Passo 2 de 3</p>
      </header>

      <section
        className="ob-setup-content ob-interests-content"
        aria-labelledby="ob-interests-title"
      >
        <div className="ob-setup-copy ob-interests-copy">
          <h1 id="ob-interests-title">
            O que gostas de descobrir quando viajas?
          </h1>
          <p>
            Escolhe alguns interesses. Vamos usá-los como ponto de partida para
            personalizar as tuas descobertas.
          </p>
          <span className="ob-interests-helper">Escolhe 3 a 6 favoritos.</span>
        </div>

        <section className="ob-onboarding-preference-section">
          <h2 className="ob-setup-section-label">Interesses</h2>

          <div className="ob-interest-chip-grid" aria-label="Interesses">
            {onboardingInterestOptions.map((interest) => {
              const Icon = interest.icon;
              const isSelected = selectedInterests.includes(interest.id);
              const isDisabled = !isSelected && selectedInterests.length >= 6;

              return (
                <button
                  key={interest.id}
                  type="button"
                  className={`ob-interest-chip ${
                    isSelected ? "ob-interest-chip-selected" : ""
                  }`}
                  onClick={() => onToggleInterest(interest.id)}
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
            Ritmo da viagem
          </h2>

          <div className="ob-preference-choice-grid" role="group">
            {travelPaceOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`ob-preference-choice ${
                  travelPace === option.id ? "ob-preference-choice-selected" : ""
                }`}
                onClick={() => onTravelPaceChange(option.id)}
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
            Orçamento
          </h2>

          <div className="ob-preference-choice-grid" role="group">
            {budgetOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`ob-preference-choice ${
                  budget === option.id ? "ob-preference-choice-selected" : ""
                }`}
                onClick={() => onBudgetChange(option.id)}
              >
                <span>{option.label}</span>
                <small>{option.description}</small>
              </button>
            ))}
          </div>
        </section>
      </section>

      <footer className="ob-setup-footer">
        <button
          type="button"
          className="ob-setup-primary"
          onClick={onContinue}
          disabled={!canContinue}
        >
          Continuar
        </button>
      </footer>
    </main>
  );
}
