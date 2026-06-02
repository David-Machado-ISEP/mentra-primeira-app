import type { TravelPreferences } from "./IntroPreferences";

import "../estilo/CreateTripPage.css";

interface CurrentTripLike {
  name?: string | null;
}

interface CreateTripPageProps {
  currentTrip: CurrentTripLike | null;
  preferences: TravelPreferences;
  interestLabels: Record<string, string>;
  paceLabels: Record<TravelPreferences["travelPace"], string>;
  budgetLabels: Record<TravelPreferences["budget"], string>;
  onBack: () => void;
  onTripNameSave: (tripName: string) => void;
  onEditPreferences: () => void;
  onStartTrip: () => void;
}

const normalizeTripNameValue = (name?: string | null) => {
  const trimmed = name?.trim();
  return trimmed || "Sem nome";
};

export function CreateTripPage({
  currentTrip,
  preferences,
  interestLabels,
  paceLabels,
  budgetLabels,
  onBack,
  onTripNameSave,
  onEditPreferences,
  onStartTrip,
}: CreateTripPageProps) {
  const tripNameValue = normalizeTripNameValue(currentTrip?.name);

  const selectedInterestLabels = preferences.interests
    .map((interest) => interestLabels[interest] ?? interest)
    .filter(Boolean);

  return (
    <main className="tw-page tw-trip-setup-page">
      <section className="tw-trip-setup-card" aria-label="Criar viagem">
        <button
          type="button"
          className="tw-trip-setup-back"
          onClick={onBack}
        >
          ← Voltar
        </button>

        <div className="tw-trip-setup-progress" aria-hidden="true">
          <span />
        </div>

        <header className="tw-trip-setup-header">
          <span className="tw-trip-setup-kicker">Nova viagem</span>

          <h1>Criar viagem</h1>

          <p>
            Configura a tua próxima aventura numa página completa, com o nome
            da viagem e as preferências base prontas para ajustar.
          </p>
        </header>

        <div className="tw-trip-setup-content">
          <section className="tw-trip-setup-section">
            <label className="tw-trip-setup-label" htmlFor="trip-setup-name">
              Nome da viagem
            </label>

            <input
              id="trip-setup-name"
              className="tw-trip-setup-input"
              type="text"
              value={tripNameValue}
              maxLength={60}
              placeholder="Ex: Porto com amigos"
              onChange={(event) => onTripNameSave(event.target.value)}
            />
          </section>

          <section className="tw-trip-setup-section">
            <div className="tw-trip-setup-preferences-header">
              <div>
                <span className="tw-trip-setup-label">
                  Preferências desta viagem
                </span>

                <p>Baseadas nas preferências guardadas no teu perfil.</p>
              </div>

              <button
                type="button"
                className="tw-trip-setup-edit"
                onClick={onEditPreferences}
              >
                Editar
              </button>
            </div>

            <div className="tw-trip-setup-summary">
              <div className="tw-trip-setup-chip-list">
                {selectedInterestLabels.length > 0 ? (
                  selectedInterestLabels.map((label) => (
                    <span key={label} className="tw-trip-setup-chip">
                      {label}
                    </span>
                  ))
                ) : (
                  <span className="tw-trip-setup-empty">
                    Nenhum interesse selecionado
                  </span>
                )}
              </div>

              <div className="tw-trip-setup-details">
                <span>
                  Ritmo
                  <strong>{paceLabels[preferences.travelPace]}</strong>
                </span>

                <span>
                  Orçamento
                  <strong>{budgetLabels[preferences.budget]}</strong>
                </span>
              </div>
            </div>
          </section>
        </div>

        <div className="tw-trip-setup-note">
          <span className="tw-trip-setup-note-icon" aria-hidden="true">
            ✦
          </span>

          <p>
            Podes alterar estas preferências só para esta viagem antes de
            começar. As tuas preferências base continuam guardadas no perfil.
          </p>
        </div>

        <div className="tw-trip-setup-actions">
          <button
            type="button"
            className="tw-trip-setup-secondary"
            onClick={onEditPreferences}
          >
            Ajustar aventura
          </button>

          <button
            type="button"
            className="tw-trip-setup-primary"
            onClick={onStartTrip}
          >
            Começar viagem
          </button>
        </div>
      </section>
    </main>
  );
}
