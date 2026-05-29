import { useEffect, useMemo, useState, type TouchEvent } from "react";

import {
  ArrowLeft,
  Check,
  Landmark,
  Utensils,
  Trees,
  ShoppingBag,
  Moon,
  Camera,
  Building2,
  UsersRound,
  Waves,
  Compass,
  Gauge,
  Wallet,
} from "lucide-react";


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
  createTripFlow?: boolean;
}

const interestOptions = [
  {
    id: "monuments",
    label: "História e Arte",
    icon: Landmark,
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
    icon: Moon,
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
    icon: Compass,
  },
  {
    id: "beaches",
    label: "Praias",
    icon: Waves,
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
      <section className="ip-card ip-card-simple">
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

        <div className="ip-simple-header">
          <h1 className="ip-simple-title">
            O que gostas de descobrir quando viajas?
          </h1>

          <p className="ip-simple-description">
            Escolhe alguns interesses principais. Isto ajuda-nos a personalizar
            as recomendações e a tua experiência.
          </p>

          <p className="ip-simple-helper">Podes escolher vários</p>
        </div>

        <div className="ip-simple-content">
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
            <div className="ip-pill-grid">
              {interestOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = draftPreferences.interests.includes(
                  option.id,
                );

                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`ip-pill ${
                      isSelected ? "ip-pill-selected" : ""
                    }`}
                    onClick={() => toggleInterest(option.id)}
                  >
                    <Icon className="ip-pill-icon" />
                    <span>{option.label}</span>
                    {isSelected && <Check className="ip-pill-check" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="ip-section">
            <div className="ip-section-heading">
              <Gauge className="ip-section-heading-icon" />
              <h2>Ritmo da viagem</h2>
            </div>

            <div className="ip-segmented-row">
              <button
                type="button"
                className={`ip-segmented-choice ${
                  draftPreferences.travelPace === "relaxed"
                    ? "ip-segmented-choice-selected"
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
                className={`ip-segmented-choice ${
                  draftPreferences.travelPace === "balanced"
                    ? "ip-segmented-choice-selected"
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
                className={`ip-segmented-choice ${
                  draftPreferences.travelPace === "fast"
                    ? "ip-segmented-choice-selected"
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
            <div className="ip-section-heading">
              <Wallet className="ip-section-heading-icon" />
              <h2>Orçamento</h2>
            </div>

            <div className="ip-segmented-row">
              <button
                type="button"
                className={`ip-segmented-choice ${
                  draftPreferences.budget === "low"
                    ? "ip-segmented-choice-selected"
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
                className={`ip-segmented-choice ${
                  draftPreferences.budget === "medium"
                    ? "ip-segmented-choice-selected"
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
                className={`ip-segmented-choice ${
                  draftPreferences.budget === "high"
                    ? "ip-segmented-choice-selected"
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

        <div className="ip-simple-footer">
          {shouldShowSaveButton && (
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
