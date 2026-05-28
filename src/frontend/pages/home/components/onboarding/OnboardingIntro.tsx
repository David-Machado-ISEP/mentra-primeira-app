import { useEffect } from "react";
import { Compass } from "lucide-react";

interface OnboardingIntroProps {
  onStart: () => void;
}

export function OnboardingIntro({ onStart }: OnboardingIntroProps) {
  useEffect(() => {
    document.documentElement.classList.add("tw-ob-intro-active");
    document.body.classList.add("tw-ob-intro-active");

    return () => {
      document.documentElement.classList.remove("tw-ob-intro-active");
      document.body.classList.remove("tw-ob-intro-active");
    };
  }, []);

  return (
    <main className="ob-intro-page">
      <header className="ob-intro-brand" aria-label="Travel Whisperer">
        <span className="ob-intro-logo">
          <Compass className="ob-intro-logo-icon" />
        </span>
        <span>Travel Whisperer</span>
      </header>

      <section className="ob-intro-content" aria-labelledby="ob-intro-title">
        <div className="ob-intro-copy">
          <h1 id="ob-intro-title">
            <span>Explora mais</span>
            <span>Aprende pelo caminho</span>
            <span>Guarda cada aventura</span>
          </h1>

          <p>
            O teu companheiro de viagem inteligente para descobrir lugares,
            fazer perguntas através das tuas glasses e guardar os momentos que
            importam.
          </p>
        </div>

        <button type="button" className="ob-intro-button" onClick={onStart}>
          Começar
        </button>
      </section>
    </main>
  );
}
