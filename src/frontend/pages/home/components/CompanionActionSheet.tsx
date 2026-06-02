import {
  CircleHelp,
  Compass,
  Glasses,
  Map,
  Settings2,
  Sparkles,
} from "lucide-react";

import glassesImageUrl from "../../../assets/glasses/mentra-live-angled.png";

import "../estilo/CompanionActionSheet.css";

interface CompanionActionSheetProps {
  onOpenGlassesGuide: () => void;
  onConfigureTrip: () => void;
}

export function CompanionActionSheet({
  onOpenGlassesGuide,
  onConfigureTrip,
}: CompanionActionSheetProps) {
  return (
    <section className="tw-companion-sheet" aria-label="Companion">
      <header className="tw-companion-sheet-header">
        <span className="tw-companion-sheet-icon" aria-hidden="true">
          <Glasses />
        </span>

        <h2>Companion</h2>

        <span className="tw-companion-sheet-glasses" aria-hidden="true">
          <Glasses />
        </span>
      </header>

      <article className="tw-companion-primary-card">
        <div className="tw-companion-visual" aria-hidden="true">
          <span className="tw-companion-visual-glow" />
          <span className="tw-companion-visual-orbit" />
          <span className="tw-companion-visual-mark tw-companion-visual-mark-left">
            <Compass />
          </span>
          <span className="tw-companion-visual-mark tw-companion-visual-mark-right">
            <Sparkles />
          </span>
          <img src={glassesImageUrl} alt="" />
        </div>

        <div className="tw-companion-primary-copy">
          <h3>O teu Companion começa nos óculos</h3>
          <p>
            Usa os óculos para fazer perguntas, traduzir e captar momentos. Tudo
            o que fizeres aparece aqui para continuares a explorar, guardares
            descobertas e reveres mais tarde.
          </p>
        </div>

        <div className="tw-companion-primary-actions">
          <button
            type="button"
            className="tw-companion-ghost-button"
            onClick={onOpenGlassesGuide}
          >
            <CircleHelp />
            Como usar os óculos
          </button>
        </div>
      </article>

      <article className="tw-companion-trip-card">
        <span className="tw-companion-trip-icon" aria-hidden="true">
          <Settings2 />
        </span>

        <div className="tw-companion-trip-copy">
          <h3>Configurar viagem</h3>
          <p>
            Cria uma viagem para organizar perguntas, lugares e momentos no
            mesmo contexto. Também podes definir ritmo, orçamento e preferências
            para esta aventura.
          </p>
        </div>

        <button
          type="button"
          className="tw-companion-trip-button"
          onClick={onConfigureTrip}
        >
          <Map />
          Configurar viagem
        </button>
      </article>

      <p className="tw-companion-note">
        Se começares sem viagem, as tuas interações ficam guardadas nos
        Momentos.
      </p>
    </section>
  );
}
