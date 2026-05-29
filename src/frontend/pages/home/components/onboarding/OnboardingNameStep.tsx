import { ArrowLeft } from "lucide-react";

interface OnboardingNameStepProps {
  name: string;
  onNameChange: (name: string) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}

export function OnboardingNameStep({
  name,
  onNameChange,
  onBack,
  onContinue,
  onSkip,
}: OnboardingNameStepProps) {
  const canContinue = name.trim().length > 0;

  return (
    <main className="ob-setup-page ob-name-page">
      <header className="ob-setup-header">
        <button
          type="button"
          className="ob-setup-icon-button"
          onClick={onBack}
          aria-label="Voltar"
        >
          <ArrowLeft className="ob-setup-back-icon" />
        </button>

        <div className="ob-setup-progress" aria-label="Passo 1 de 3">
          <span className="ob-setup-progress-bar ob-setup-progress-bar-active" />
          <span className="ob-setup-progress-bar" />
          <span className="ob-setup-progress-bar" />
        </div>

        <button type="button" className="ob-setup-skip" onClick={onSkip}>
          Saltar
        </button>

        <p className="ob-setup-step-label">Passo 1 de 3</p>
      </header>

      <section className="ob-setup-content" aria-labelledby="ob-name-title">
        <div className="ob-setup-copy">
          <h1 id="ob-name-title">Vamos configurar o teu companheiro</h1>
          <p>
            Diz-nos como te devemos chamar e ajustamos a experiência ao teu
            estilo de viagem.
          </p>
        </div>

        <label className="ob-name-field" htmlFor="onboarding-name">
          <span>Como te devemos chamar?</span>
          <input
            id="onboarding-name"
            type="text"
            value={name}
            placeholder="O teu nome"
            autoComplete="given-name"
            onChange={(event) => onNameChange(event.target.value)}
          />
        </label>
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

        <button type="button" className="ob-setup-secondary" onClick={onSkip}>
          Saltar por agora
        </button>
      </footer>
    </main>
  );
}
