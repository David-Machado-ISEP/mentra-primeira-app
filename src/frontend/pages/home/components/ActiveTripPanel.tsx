import { MapPin, Camera, BookOpenText, Flag } from "lucide-react";

import "../estilo/ActiveTripPanel.css";

interface ActiveTripPanelProps {
  tripName: string;
  locationLabel: string;
  photoCount: number;
  visitedPlacesCount: number;
  isTripEnded: boolean;
  onEndTrip: () => void;
  onStartNewTrip: () => void;
}

export function ActiveTripPanel({
  tripName,
  locationLabel,
  photoCount,
  visitedPlacesCount,
  isTripEnded,
  onEndTrip,
  onStartNewTrip,
}: ActiveTripPanelProps) {
  return (
    <section className="atp-card">
      <div className="atp-main">
        <div className="atp-icon-wrap">
          <Flag className="atp-icon" />
        </div>

        <div className="atp-copy">
          <span className="atp-label">Viagem atual</span>
          <h2>{tripName}</h2>

          <p className="atp-location">
            <MapPin className="atp-location-icon" />
            {locationLabel}
          </p>
        </div>
      </div>

      <div className="atp-stats">
        <div className="atp-stat">
          <Camera className="atp-stat-icon" />
          <span>Fotos</span>
          <strong>{photoCount}</strong>
        </div>

        <div className="atp-stat">
          <BookOpenText className="atp-stat-icon" />
          <span>Locais</span>
          <strong>{visitedPlacesCount}</strong>
        </div>
      </div>

      <button
  type="button"
  className="atp-end-button"
  onClick={isTripEnded ? onStartNewTrip : onEndTrip}
>
  {isTripEnded ? "Nova viagem" : "Terminar viagem"}
</button>
    </section>
  );
}