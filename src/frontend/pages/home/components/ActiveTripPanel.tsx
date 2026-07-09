import {
  MapPin,
  Camera,
  BookOpenText,
  Flag,
  CheckCircle2,
  Power,
} from "lucide-react";

interface ActiveTripPanelProps {
  tripName: string;
  locationLabel: string;
  gpsLabel: string;
  hasCurrentLocation: boolean;
  photoCount: number;
  visitedPlacesCount: number;
  isTripEnded: boolean;
  onEndTrip: () => void;
  onStartNewTrip: () => void;
  onOpenLocationMap: () => void;
}

export function ActiveTripPanel({
  tripName,
  locationLabel,
  gpsLabel,
  hasCurrentLocation,
  photoCount,
  visitedPlacesCount,
  isTripEnded,
  onEndTrip,
  onStartNewTrip,
  onOpenLocationMap,
}: ActiveTripPanelProps) {
  const hasMemories = photoCount + visitedPlacesCount > 0;
  const memoryLabel = hasMemories
    ? "Memórias em progresso"
    : "Pronta para começar";

  const currentGpsLabel = hasCurrentLocation ? gpsLabel : "A aguardar GPS";
  const gpsStatusLabel = hasCurrentLocation ? "GPS ativo" : "GPS";
  const tripStatusLabel = isTripEnded ? "Finalizada" : "Em curso";
  const tripActionLabel = isTripEnded ? "Nova viagem" : "Terminar viagem";
  const gpsActionLabel = hasCurrentLocation ? "Abrir mapa" : locationLabel;

  const tripActionHandler = isTripEnded ? onStartNewTrip : onEndTrip;
  const tripActionClassName = isTripEnded
    ? "atp-end-button"
    : "atp-end-button tw-end-trip-action";

  return (
    <section className={`atp-card ${isTripEnded ? "atp-card-ended" : ""}`}>
      <div className="atp-main">
        <div className="atp-icon-wrap">
          <Flag className="atp-icon" />
        </div>

        <div className="atp-copy">
          <div className="atp-kicker-row">
            <span className="atp-label">Viagem atual</span>

            <span className="atp-online">
              <span className="atp-status-dot" />
              {gpsStatusLabel}
            </span>

            <span className="atp-status">
              <span className="atp-status-dot" />
              {tripStatusLabel}
            </span>
          </div>

          <h2>
            <MapPin className="atp-title-icon" />
            {tripName}
          </h2>

          <div className="atp-meta">
            <span>
              <Camera className="atp-meta-icon" />
              {photoCount} fotos
            </span>

            <span>
              <BookOpenText className="atp-meta-icon" />
              {visitedPlacesCount} locais
            </span>

            <span className="atp-meta-ready">
              <CheckCircle2 className="atp-meta-icon" />
              {memoryLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="atp-actions">
        <button
          type="button"
          className={tripActionClassName}
          onClick={tripActionHandler}
        >
          {!isTripEnded && <Power />}
          {tripActionLabel}
        </button>
      </div>

      <button
        type="button"
        className="atp-gps-row"
        onClick={onOpenLocationMap}
        disabled={!hasCurrentLocation}
      >
        <span className="atp-gps-icon-wrap">
          <MapPin className="atp-gps-icon" />
        </span>

        <span className="atp-gps-copy">
          <span>Localização atual</span>
          <strong>{currentGpsLabel}</strong>
        </span>

        <span className="atp-gps-action">{gpsActionLabel}</span>
      </button>
    </section>
  );
}