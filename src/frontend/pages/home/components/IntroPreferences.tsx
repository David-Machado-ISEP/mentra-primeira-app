import { useEffect, useMemo, useState, type TouchEvent } from "react";
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
  ArrowLeft,
} from "lucide-react";

import { Badge } from "../../../components/ui";


export interface TravelPreferences {
  interests: string[];
  travelPace: "relaxed" | "balanced" | "fast";
  budget: "low" | "medium" | "high";
}

interface IntroPreferencesProps {
  preferences: TravelPreferences;
  onSave: (preferences: TravelPreferences) => void;
  tripName?: string;
  onTripNameSave?: (tripName: string) => void;
  onContinue?: () => void;
  onBack?: () => void;
  continueLabel?: string;
  defaultOpen?: boolean;
  panel?: boolean;
  saveLabel?: string;
  savedLabel?: string;
  showContinueButton?: boolean;
  showSaveOnlyWhenDirty?: boolean;
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

const arePreferencesEqual = (
  firstPreferences: TravelPreferences,
  secondPreferences: TravelPreferences,
) => {
  const firstInterests = [...firstPreferences.interests].sort().join("|");
  const secondInterests = [...secondPreferences.interests].sort().join("|");

  return (
    firstInterests === secondInterests &&
    firstPreferences.travelPace === secondPreferences.travelPace &&
    firstPreferences.budget === secondPreferences.budget
  );
};

const normalizeTripName = (tripName: string) => {
  return tripName.trim() || "Sem nome";
};

export function IntroPreferences({
  preferences,
  onSave,
  tripName,
  onTripNameSave,
  onContinue,
  onBack,
  continueLabel = "Continuar para a aplicação",
  defaultOpen = false,
  panel = false,
  saveLabel = "Guardar preferências",
  savedLabel = "Preferências guardadas",
  showContinueButton = true,
  showSaveOnlyWhenDirty = false,
}: IntroPreferencesProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [draftPreferences, setDraftPreferences] =
    useState<TravelPreferences>(preferences);
  const [draftTripName, setDraftTripName] = useState(tripName ?? "Sem nome");
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraftPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    setDraftTripName(tripName ?? "Sem nome");
  }, [tripName]);

  const hasPreferenceChanges = useMemo(
    () => !arePreferencesEqual(draftPreferences, preferences),
    [draftPreferences, preferences],
  );

  const hasTripNameChanges = useMemo(
    () =>
      onTripNameSave
        ? normalizeTripName(draftTripName) !==
          normalizeTripName(tripName ?? "Sem nome")
        : false,
    [draftTripName, onTripNameSave, tripName],
  );

  const hasChanges = hasPreferenceChanges || hasTripNameChanges;
  const shouldShowSaveButton = !showSaveOnlyWhenDirty || hasChanges;

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
    if (showSaveOnlyWhenDirty && !hasChanges) return;

    if (!showSaveOnlyWhenDirty || hasPreferenceChanges) {
      onSave(draftPreferences);
    }

    if (onTripNameSave && (!showSaveOnlyWhenDirty || hasTripNameChanges)) {
      onTripNameSave(draftTripName);
    }

    setSaved(true);
  };

  const continueWithSavedDrafts = () => {
    if (hasChanges) {
      if (hasPreferenceChanges) {
        onSave(draftPreferences);
      }

      if (onTripNameSave && hasTripNameChanges) {
        onTripNameSave(draftTripName);
      }

      setSaved(true);
    }

    onContinue?.();
  };

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (!onBack || panel) return;

    const touch = event.touches[0];
    setTouchStartX(touch.clientX);
    setTouchStartY(touch.clientY);
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (!onBack || panel || touchStartX === null || touchStartY === null) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = Math.abs(touch.clientY - touchStartY);

    setTouchStartX(null);
    setTouchStartY(null);

    if (touchStartX < 72 && deltaX > 90 && deltaY < 70) {
      onBack();
    }
  };

  const Root = panel ? "section" : "main";

  return (
    <Root
      className={`ip-page ${panel ? "ip-page-panel" : ""}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <section className="ip-card">
        {onBack && !panel && (
          <button
            type="button"
            className="ip-back-button"
            onClick={onBack}
            aria-label="Voltar à página anterior"
          >
            <ArrowLeft className="ip-back-icon" />
            Voltar
          </button>
        )}

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
            {panel
              ? "Atualiza as tuas preferências para recalcular sugestões e adaptar a viagem ao teu estilo atual."
              : "Antes de começares, podes definir preferências simples para que as sugestões futuras sejam mais personalizadas ao teu estilo de viagem."}
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
              {onTripNameSave && (
                <div className="ip-section">
                  <label className="ip-section-title" htmlFor="trip-name">
                    Nome da viagem
                  </label>

                  <input
                    id="trip-name"
                    className="ip-trip-name-input"
                    type="text"
                    value={draftTripName}
                    maxLength={60}
                    placeholder="Ex: Porto com amigos"
                    onChange={(event) => {
                      setDraftTripName(event.target.value);
                      setSaved(false);
                    }}
                  />
                </div>
              )}

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

            </div>
          )}

          {isOpen && shouldShowSaveButton && (
            <button
              type="button"
              className="ip-save-button"
              onClick={savePreferences}
            >
              <Check className="ip-button-icon" />
              {saved && !hasChanges ? savedLabel : saveLabel}
            </button>
          )}

          {showContinueButton && onContinue && (
            <button
              type="button"
              className="ip-continue-button"
              onClick={continueWithSavedDrafts}
            >
              {continueLabel}
            </button>
          )}
        </div>
      </section>
    </Root>
  );
}
