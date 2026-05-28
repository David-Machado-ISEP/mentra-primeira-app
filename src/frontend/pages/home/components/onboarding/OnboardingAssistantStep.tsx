import {
  ArrowLeft,
  BookOpen,
  Bot,
  Compass,
  GraduationCap,
  Handshake,
  type LucideIcon,
} from "lucide-react";

export type AssistantStyle =
  | "localFriend"
  | "storyteller"
  | "expertGuide"
  | "curiousExplorer";

export type DetailLevel = "quick" | "balanced" | "complete";

interface AssistantStyleOption {
  id: AssistantStyle;
  title: string;
  description: string;
  icon: LucideIcon;
  preview: string;
}

interface DetailLevelOption {
  id: DetailLevel;
  label: string;
}

interface OnboardingAssistantStepProps {
  assistantStyle: AssistantStyle;
  detailLevel: DetailLevel;
  onAssistantStyleChange: (style: AssistantStyle) => void;
  onDetailLevelChange: (level: DetailLevel) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}

export const assistantStyleOptions: AssistantStyleOption[] = [
  {
    id: "localFriend",
    title: "Amigo local",
    description: "Descontraído e íntimo",
    icon: Handshake,
    preview:
      "A Torre de Belém fica mesmo ali à frente! É um sítio brutal para tirar umas fotos ao pôr do sol. Queres que te mostre o caminho mais rápido ou preferes ir pelas ruas com as melhores vistas do rio?",
  },
  {
    id: "storyteller",
    title: "Contador de histórias",
    description: "Focado em lendas",
    icon: BookOpen,
    preview:
      "A Torre de Belém guarda histórias de partidas, descobertas e regressos. Daqui saíam sonhos de mar aberto. Queres ouvir uma curiosidade antes de seguirmos?",
  },
  {
    id: "expertGuide",
    title: "Guia especialista",
    description: "Factos e história profunda",
    icon: GraduationCap,
    preview:
      "A Torre de Belém foi construída no século XVI como parte do sistema defensivo de Lisboa. É um exemplo marcante do estilo manuelino e está classificada como Património Mundial da UNESCO.",
  },
  {
    id: "curiousExplorer",
    title: "Explorador curioso",
    description: "Sugere sempre caminhos alternativos e segredos escondidos.",
    icon: Compass,
    preview:
      "A Torre de Belém está mesmo à frente, mas há um caminho mais bonito junto ao rio. Posso levar-te por ali e ainda mostrar um ponto menos óbvio para fotografar.",
  },
];

const detailLevelOptions: DetailLevelOption[] = [
  {
    id: "quick",
    label: "Rápido",
  },
  {
    id: "balanced",
    label: "Equilibrado",
  },
  {
    id: "complete",
    label: "Mais completo",
  },
];

export function OnboardingAssistantStep({
  assistantStyle,
  detailLevel,
  onAssistantStyleChange,
  onDetailLevelChange,
  onBack,
  onContinue,
  onSkip,
}: OnboardingAssistantStepProps) {
  const selectedStyle =
    assistantStyleOptions.find((option) => option.id === assistantStyle) ??
    assistantStyleOptions[0];

  return (
    <main className="ob-setup-page ob-assistant-page">
      <header className="ob-setup-header">
        <button
          type="button"
          className="ob-setup-icon-button"
          onClick={onBack}
          aria-label="Voltar"
        >
          <ArrowLeft className="ob-setup-back-icon" />
        </button>

        <div className="ob-setup-progress" aria-label="Passo 3 de 3">
          <span className="ob-setup-progress-bar ob-setup-progress-bar-active" />
          <span className="ob-setup-progress-bar ob-setup-progress-bar-active" />
          <span className="ob-setup-progress-bar ob-setup-progress-bar-active" />
        </div>

        <button type="button" className="ob-setup-skip" onClick={onSkip}>
          Saltar
        </button>

        <p className="ob-setup-step-label">Passo 3 de 3</p>
      </header>

      <section
        className="ob-setup-content ob-assistant-content"
        aria-labelledby="ob-assistant-title"
      >
        <div className="ob-setup-copy ob-assistant-copy">
          <h1 id="ob-assistant-title">
            Como queres que o teu companheiro responda?
          </h1>
          <p>Personaliza a personalidade do teu assistente de viagem.</p>
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
              <h3>O teu assistente</h3>
              <p>“{selectedStyle.preview}”</p>
            </div>
          </article>
        </section>
      </section>

      <footer className="ob-setup-footer">
        <button type="button" className="ob-setup-primary" onClick={onContinue}>
          Continuar
        </button>
      </footer>
    </main>
  );
}
