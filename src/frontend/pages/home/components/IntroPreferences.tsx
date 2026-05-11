import { useState } from "react";
import {
  Compass,
  Settings2,
  Check,
  ChevronDown,
  Sparkles,
  Landmark,
  Utensils,
  Trees,
  ShoppingBag,
  Moon,
  Camera,
} from "lucide-react";

import { Badge } from "../../../components/ui";

import "../estilo/IntroPreferences.css";

export interface TravelPreferences {
  interests: string[];
  travelPace: "relaxed" | "balanced" | "fast";
  budget: "low" | "medium" | "high";
}

interface IntroPreferencesProps {
  preferences: TravelPreferences;
  onSave: (preferences: TravelPreferences) => void;
  onContinue: () => void;
}

const interestOptions = [
  {
    id: "monuments",
    label: "Monuments & history",
    icon: Landmark,
  },
  {
    id: "local_food",
    label: "Local food",
    icon: Utensils,
  },
  {
    id: "nature",
    label: "Nature & viewpoints",
    icon: Trees,
  },
  {
    id: "shopping",
    label: "Shopping",
    icon: ShoppingBag,
  },
  {
    id: "nightlife",
    label: "Nightlife",
    icon: Moon,
  },
  {
    id: "hidden_gems",
    label: "Hidden gems",
    icon: Camera,
  },
];

export function IntroPreferences({
  preferences,
  onSave,
  onContinue,
}: IntroPreferencesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftPreferences, setDraftPreferences] =
    useState<TravelPreferences>(preferences);
  const [saved, setSaved] = useState(false);

  const toggleInterest = (interestId: string) => {
    setDraftPreferences((prev) => {
      const alreadySelected = prev.interests.includes(interestId);

      return {
        ...prev,
        interests: alreadySelected
          ? prev.interests.filter((id) => id !== interestId)
          : [...prev.interests, interestId],
      };
    });

    setSaved(false);
  };

  const savePreferences = () => {
    onSave(draftPreferences);
    setSaved(true);
  };

  return (
    <main className="ip-page">
      <section className="ip-card">
        <div className="ip-hero">
          <Badge variant="outline" className="ip-badge">
            <Sparkles className="ip-badge-icon" />
            Smart Glasses AI/AX
          </Badge>

          <div className="ip-icon">
            <Compass className="ip-icon-svg" />
          </div>

          <h1 className="ip-title">Travel Whisperer</h1>

          <p className="ip-subtitle">
            Um assistente de viagem inteligente, discreto e hands-free para os
            Mentra Live.
          </p>

          <p className="ip-description">
            Antes de começares, podes definir preferências simples para que as
            sugestões futuras sejam mais personalizadas ao teu estilo de viagem.
          </p>
        </div>

        <div className="ip-actions">
          <button
            type="button"
            className="ip-preferences-toggle"
            onClick={() => setIsOpen((prev) => !prev)}
          >
            <span>
              <Settings2 className="ip-button-icon" />
              Preferências de viagem
            </span>

            <ChevronDown
              className={`ip-chevron ${isOpen ? "ip-chevron-open" : ""}`}
            />
          </button>

          {isOpen && (
            <div className="ip-dropdown">
              <div className="ip-section">
                <h2 className="ip-section-title">Interesses principais</h2>

                <div className="ip-interests-grid">
                  {interestOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = draftPreferences.interests.includes(
                      option.id,
                    );

                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={`ip-interest ${
                          isSelected ? "ip-interest-selected" : ""
                        }`}
                        onClick={() => toggleInterest(option.id)}
                      >
                        <Icon className="ip-interest-icon" />
                        <span>{option.label}</span>

                        {isSelected && <Check className="ip-check-icon" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="ip-section">
                <h2 className="ip-section-title">Ritmo da viagem</h2>

                <div className="ip-choice-row">
                  <button
                    type="button"
                    className={`ip-choice ${
                      draftPreferences.travelPace === "relaxed"
                        ? "ip-choice-selected"
                        : ""
                    }`}
                    onClick={() => {
                      setDraftPreferences((prev) => ({
                        ...prev,
                        travelPace: "relaxed",
                      }));
                      setSaved(false);
                    }}
                  >
                    Relaxado
                  </button>

                  <button
                    type="button"
                    className={`ip-choice ${
                      draftPreferences.travelPace === "balanced"
                        ? "ip-choice-selected"
                        : ""
                    }`}
                    onClick={() => {
                      setDraftPreferences((prev) => ({
                        ...prev,
                        travelPace: "balanced",
                      }));
                      setSaved(false);
                    }}
                  >
                    Equilibrado
                  </button>

                  <button
                    type="button"
                    className={`ip-choice ${
                      draftPreferences.travelPace === "fast"
                        ? "ip-choice-selected"
                        : ""
                    }`}
                    onClick={() => {
                      setDraftPreferences((prev) => ({
                        ...prev,
                        travelPace: "fast",
                      }));
                      setSaved(false);
                    }}
                  >
                    Rápido
                  </button>
                </div>
              </div>

              <div className="ip-section">
                <h2 className="ip-section-title">Orçamento</h2>

                <div className="ip-choice-row">
                  <button
                    type="button"
                    className={`ip-choice ${
                      draftPreferences.budget === "low"
                        ? "ip-choice-selected"
                        : ""
                    }`}
                    onClick={() => {
                      setDraftPreferences((prev) => ({
                        ...prev,
                        budget: "low",
                      }));
                      setSaved(false);
                    }}
                  >
                    Baixo
                  </button>

                  <button
                    type="button"
                    className={`ip-choice ${
                      draftPreferences.budget === "medium"
                        ? "ip-choice-selected"
                        : ""
                    }`}
                    onClick={() => {
                      setDraftPreferences((prev) => ({
                        ...prev,
                        budget: "medium",
                      }));
                      setSaved(false);
                    }}
                  >
                    Médio
                  </button>

                  <button
                    type="button"
                    className={`ip-choice ${
                      draftPreferences.budget === "high"
                        ? "ip-choice-selected"
                        : ""
                    }`}
                    onClick={() => {
                      setDraftPreferences((prev) => ({
                        ...prev,
                        budget: "high",
                      }));
                      setSaved(false);
                    }}
                  >
                    Alto
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="ip-save-button"
                onClick={savePreferences}
              >
                <Check className="ip-button-icon" />
                {saved ? "Preferências guardadas" : "Guardar preferências"}
              </button>
            </div>
          )}

          <button type="button" className="ip-continue-button" onClick={onContinue}>
            Continuar para a aplicação
          </button>
        </div>
      </section>
    </main>
  );
}