import { ArrowLeft, CalendarDays, LocateFixed, Search } from "lucide-react";

interface TripDestinationStepProps {
  destination: string;
  tripName: string;
  startDate: string;
  endDate: string;
  onDestinationChange: (destination: string) => void;
  onTripNameChange: (tripName: string) => void;
  onStartDateChange: (startDate: string) => void;
  onEndDateChange: (endDate: string) => void;
  onUseCurrentLocation: () => void;
  onBack: () => void;
  onContinue: () => void;
}

export function TripDestinationStep({
  destination,
  tripName,
  startDate,
  endDate,
  onDestinationChange,
  onTripNameChange,
  onStartDateChange,
  onEndDateChange,
  onUseCurrentLocation,
  onBack,
  onContinue,
}: TripDestinationStepProps) {
  const canContinue = tripName.trim().length > 0 || destination.trim().length > 0;

  return (
    <main className="ob-setup-page ob-trip-destination-page">
      <header className="ob-trip-destination-topbar">
        <button
          type="button"
          className="ob-setup-icon-button"
          onClick={onBack}
          aria-label="Voltar"
        >
          <ArrowLeft className="ob-setup-back-icon" />
        </button>

        <h1>Configurar viagem</h1>
      </header>

      <section
        className="ob-trip-destination-content"
        aria-labelledby="trip-destination-title"
      >
        <div className="ob-trip-flow-progress">
          <span>PASSO 1 DE 5</span>
          <div aria-hidden="true">
            <i />
          </div>
        </div>

        <div className="ob-setup-copy ob-trip-destination-copy">
          <h2 id="trip-destination-title">Onde vais explorar?</h2>
          <p>
            Escolhe um destino ou usa a tua localização atual. Vamos usar isto
            para organizar perguntas, lugares e momentos no contexto certo.
          </p>
        </div>

        <label className="ob-trip-search-field" htmlFor="trip-destination">
          <Search className="ob-trip-search-icon" aria-hidden="true" />
          <input
            id="trip-destination"
            type="text"
            value={destination}
            placeholder="Ex.: Porto, Lisboa, Roma..."
            onChange={(event) => onDestinationChange(event.target.value)}
          />
        </label>

        <button
          type="button"
          className="ob-trip-location-button"
          onClick={onUseCurrentLocation}
        >
          <LocateFixed className="ob-trip-location-icon" aria-hidden="true" />
          Usar localização atual
        </button>

        <label className="ob-trip-name-field" htmlFor="trip-name">
          <span>Nome da viagem</span>
          <input
            id="trip-name"
            type="text"
            value={tripName}
            placeholder="Ex.: Porto"
            onChange={(event) => onTripNameChange(event.target.value)}
          />
          <small>
            Gerado automaticamente a partir do destino. Podes alterar.
          </small>
        </label>

        <div className="ob-trip-dates-compact" aria-labelledby="trip-dates-title">
          <div className="ob-trip-dates-compact-header">
            <div className="ob-trip-dates-compact-title">
              <CalendarDays
                className="ob-trip-dates-compact-icon"
                aria-hidden="true"
              />
              <span id="trip-dates-title">Datas da viagem</span>
            </div>

            <span className="ob-trip-dates-compact-badge">Opcional</span>
          </div>

          <div className="ob-trip-dates-compact-fields">
            <div className="ob-trip-date-compact-field">
              <label htmlFor="trip-start-date">Início</label>
              <input
                id="trip-start-date"
                type="date"
                value={startDate}
                onChange={(event) => onStartDateChange(event.target.value)}
              />
            </div>

            <div className="ob-trip-date-compact-field">
              <label htmlFor="trip-end-date">Fim</label>
              <input
                id="trip-end-date"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => onEndDateChange(event.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      <footer className="ob-setup-footer ob-trip-destination-footer">
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
