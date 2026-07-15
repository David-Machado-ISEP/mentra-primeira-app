import { Camera, Languages, Search, Smartphone } from "lucide-react";

import { GlassesIntroAnimation } from "./GlassesIntroAnimation";

interface SmartGlassesGuideProps {
  onComplete: () => void;
  onSkip: () => void;
}

const glassesGuideItems = [
  {
    title: "Capta momentos",
    description:
      "Faz um toque simples na haste direita para tirar uma fotografia do teu ponto de vista.",
    icon: Camera,
  },
  {
    title: "Pergunta sobre o que vês",
    description:
      "Faz três toques na haste direita para tirar uma fotografia e ouvir uma explicação sobre o que está à tua frente.",
    icon: Search,
  },
  {
    title: "Traduz o que vês",
    description:
      "Mantém a haste direita pressionada para fotografar um menu de restaurante e receber a tradução.",
    icon: Languages,
  },
  {
    title: "Continua na app",
    description:
      "Tudo o que captas e pesquisas fica guardado em segurança na tua aplicação para consultares mais tarde.",
    icon: Smartphone,
  },
];

export function SmartGlassesGuide({
  onComplete,
  onSkip,
}: SmartGlassesGuideProps) {
  return (
    <main className="ob-glasses-page">
      <section className="ob-glasses-scroll">
        <header className="ob-glasses-header">
          <div className="ob-glasses-heading-row">
            <h1>Como funcionam os teus smart glasses</h1>

            <button type="button" className="ob-glasses-skip" onClick={onSkip}>
              Saltar
            </button>
          </div>

          <p>
            Um guia rápido para tirares o máximo partido da tua experiência com
            os teus Mentra Smart Glasses.
          </p>
        </header>

        <GlassesIntroAnimation />

        <section className="ob-glasses-actions" aria-label="Ações principais">
          {glassesGuideItems.map((item) => {
            const Icon = item.icon;

            return (
              <article className="ob-glasses-action" key={item.title}>
                <div className="ob-glasses-action-icon">
                  <Icon className="ob-glasses-action-svg" />
                </div>

                <div>
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                </div>
              </article>
            );
          })}
        </section>
      </section>

      <footer className="ob-glasses-footer">
        <button
          type="button"
          className="ob-setup-primary ob-glasses-done-button"
          onClick={onComplete}
        >
          Entendi
        </button>
      </footer>
    </main>
  );
}
