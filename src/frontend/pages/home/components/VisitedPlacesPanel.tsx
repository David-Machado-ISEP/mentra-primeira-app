import { BookmarkCheck, Clock, MapPin } from "lucide-react";
import { Badge } from "../../../components/ui";


export interface VisitedPlace {
  id: string;
  name: string;
  city: string;
  category: string;
  description: string;
  detectedFrom: "photo" | "menu" | "manual";
  timestamp: number;
  firstVisitedAt?: number;
  visitCount?: number;
  lat?: number;
  lng?: number;
  accuracy?: number;
  address?: string;
  photoRequestId?: string;
  tripId?: string;
}

interface VisitedPlacesPanelProps {
  places: VisitedPlace[];
}

const sourceLabel: Record<VisitedPlace["detectedFrom"], string> = {
  photo: "Foto",
  menu: "Menu",
  manual: "Manual",
};

export function VisitedPlacesPanel({ places }: VisitedPlacesPanelProps) {
  return (
    <section className="tw-visited-card">
      <div className="tw-visited-header">
        <div>
          <div className="tw-visited-title-row">
            <BookmarkCheck className="tw-visited-icon" />
            <h2 className="tw-card-title">Visited Places</h2>
          </div>

          <p className="tw-card-description">
            Locais guardados automaticamente durante a viagem.
          </p>
        </div>

        <Badge variant="outline">
          {places.length} locais
        </Badge>
      </div>

      {places.length === 0 ? (
        <div className="tw-visited-empty">
          Ainda não há locais guardados automaticamente.
        </div>
      ) : (
        <div className="tw-visited-list">
          {places.map((place) => (
            <article key={place.id} className="tw-visited-item">
              <div className="tw-visited-main">
                <div className="tw-visited-item-title-row">
                  <h3 className="tw-visited-name">{place.name}</h3>
                  <Badge variant="outline">{sourceLabel[place.detectedFrom]}</Badge>
                </div>

                <div className="tw-visited-meta">
                  <span>
                    <MapPin className="tw-visited-meta-icon" />
                    {place.city} · {place.category}
                  </span>

                  <span>
                    <Clock className="tw-visited-meta-icon" />
                    {new Date(place.timestamp).toLocaleTimeString()}
                  </span>

                  {place.visitCount && place.visitCount > 1 && (
                    <span>{place.visitCount} visitas</span>
                  )}
                </div>

                {place.address && (
                  <p className="tw-visited-address">{place.address}</p>
                )}

                <p className="tw-visited-description">{place.description}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
