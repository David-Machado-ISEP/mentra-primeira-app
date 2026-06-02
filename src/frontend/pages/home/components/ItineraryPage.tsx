import { useState } from "react";
import { Heart, MapPin, Navigation, Sparkles, X } from "lucide-react";

import "../estilo/ItineraryPage.css";

export type ItineraryBudget = "low" | "medium" | "high";

export type ItineraryItemStatus = "favorite" | "toVisit";

export interface ItineraryItem {
  id: string;
  name: string;
  category: string;
  description: string;
  estimatedTime: string;
  budget: ItineraryBudget;
  interests: string[];
  reason?: string;
  tripId: string;
  addedAt: string;
  source: "smart" | "nearby";
  status?: ItineraryItemStatus;
}

interface ItineraryTrip {
  id: string;
  name: string;
}

interface ItineraryPageProps {
  currentTrip: ItineraryTrip | null;
  items: ItineraryItem[];
  budgetLabels: Record<ItineraryBudget, string>;
  preferenceInterestLabels: Record<string, string>;
  onRemoveItem: (item: ItineraryItem) => void;
  onMoveToVisit: (item: ItineraryItem) => void;
  onRemoveFromVisit: (item: ItineraryItem) => void;
  onGoToRecommendations: () => void;
}

const normalizeTripTitle = (name?: string | null) => {
  const trimmed = name?.trim();

  if (!trimmed || trimmed.toLowerCase() === "sem nome") {
    return "Roteiro";
  }

  return trimmed;
};

const formatAddedDate = (value: string) => {
  if (!value) return "Adicionado agora";

  const [date] = value.split(",");
  return `Adicionado: ${date.trim()}`;
};

const formatInterest = (
  interest: string,
  preferenceInterestLabels: Record<string, string>,
) => preferenceInterestLabels[interest] ?? interest;

export function ItineraryPage({
  currentTrip,
  items,
  budgetLabels,
  preferenceInterestLabels,
  onRemoveItem,
  onMoveToVisit,
  onRemoveFromVisit,
  onGoToRecommendations,
}: ItineraryPageProps) {
  const [activeList, setActiveList] = useState<"favorite" | "toVisit">(
    "favorite",
  );

  const normalizedItems = items.map((item) => ({
    ...item,
    status: item.status ?? "toVisit",
  }));

  const favoriteItems = normalizedItems;

  const toVisitItems = normalizedItems.filter(
    (item) => item.status === "toVisit",
  );

  const activeItems = activeList === "favorite" ? favoriteItems : toVisitItems;

  const smartCount = normalizedItems.filter(
    (item) => item.source === "smart",
  ).length;

  const nearbyCount = normalizedItems.filter(
    (item) => item.source === "nearby",
  ).length;

  const topInterests = Array.from(
    new Set(normalizedItems.flatMap((item) => item.interests)),
  ).slice(0, 4);

  const tripTitle = normalizeTripTitle(currentTrip?.name);

  return (
    <section className="tw-itinerary-shell" aria-label="Roteiro da viagem">
      <div className="tw-itinerary-hero">
        <div className="tw-itinerary-hero-copy">
          <p className="tw-itinerary-hero-kicker">Roteiro da viagem</p>

          <h1>{tripTitle}</h1>

          <p className="tw-itinerary-hero-description">
            Organiza os teus locais favoritos numa sequência simples, visual e
            pronta a seguir ao longo da viagem.
          </p>
        </div>

        <div
          className="tw-itinerary-hero-pill"
          aria-label={`${items.length} locais guardados`}
        >
          <strong>{items.length}</strong>
          <span>locais guardados</span>
        </div>
      </div>

      <div
        className="tw-itinerary-overview-grid"
        aria-label="Resumo do roteiro"
      >
        <article className="tw-itinerary-overview-card">
          <div className="tw-itinerary-overview-icon">
            <Heart size={16} />
          </div>

          <div className="tw-itinerary-overview-copy">
            <strong>{favoriteItems.length}</strong>
            <span>Favoritos</span>
          </div>
        </article>

        <article className="tw-itinerary-overview-card">
          <div className="tw-itinerary-overview-icon tw-itinerary-overview-icon--smart">
            <Sparkles size={16} />
          </div>

          <div className="tw-itinerary-overview-copy">
            <strong>{smartCount}</strong>
            <span>Smart picks</span>
          </div>
        </article>

        <article className="tw-itinerary-overview-card">
          <div className="tw-itinerary-overview-icon tw-itinerary-overview-icon--nearby">
            <Navigation size={16} />
          </div>

          <div className="tw-itinerary-overview-copy">
            <strong>{toVisitItems.length}</strong>
            <span>A visitar</span>
          </div>
        </article>
      </div>

      {topInterests.length > 0 && (
        <div
          className="tw-itinerary-overview-tags"
          aria-label="Interesses principais do roteiro"
        >
          {topInterests.map((interest) => (
            <span key={interest}>
              {formatInterest(interest, preferenceInterestLabels)}
            </span>
          ))}
        </div>
      )}

      {currentTrip && normalizedItems.length > 0 && (
        <div
          className="tw-itinerary-tabs"
          aria-label="Tipo de lista do roteiro"
        >
          <button
            type="button"
            className={`tw-itinerary-tab ${
              activeList === "favorite" ? "tw-itinerary-tab--active" : ""
            }`}
            onClick={() => setActiveList("favorite")}
          >
            <Heart size={14} />
            <span>Favoritos</span>
            <strong>{favoriteItems.length}</strong>
          </button>

          <button
            type="button"
            className={`tw-itinerary-tab ${
              activeList === "toVisit" ? "tw-itinerary-tab--active" : ""
            }`}
            onClick={() => setActiveList("toVisit")}
          >
            <MapPin size={14} />
            <span>A visitar</span>
            <strong>{toVisitItems.length}</strong>
          </button>
        </div>
      )}

      {!currentTrip ? (
        <div className="tw-itinerary-empty">
          <div className="tw-itinerary-empty-icon">
            <MapPin size={22} />
          </div>

          <h2>Não há nenhuma viagem ativa</h2>

          <p>
            Cria ou ativa uma viagem para começares a guardar locais no teu
            roteiro.
          </p>
        </div>
      ) : normalizedItems.length === 0 ? (
        <div className="tw-itinerary-empty">
          <div className="tw-itinerary-empty-icon">
            <MapPin size={22} />
          </div>

          <h2>Ainda não há locais no roteiro</h2>

          <p>
            Vai às recomendações e carrega em “Gostei” para adicionares locais
            automaticamente ao roteiro da viagem.
          </p>

          <button
            type="button"
            className="tw-itinerary-empty-action"
            onClick={onGoToRecommendations}
          >
            Ver recomendações
          </button>
        </div>
      ) : (
        <div className="tw-itinerary-route">
          {activeItems.map((item, index) => (
            <article key={item.id} className="tw-itinerary-stop">
              <div className="tw-itinerary-stop-rail" aria-hidden="true">
                <div className="tw-itinerary-stop-marker">{index + 1}</div>

                {index < items.length - 1 && (
                  <span className="tw-itinerary-stop-line" />
                )}
              </div>

              <div className="tw-itinerary-stop-card">
                <div className="tw-itinerary-stop-top">
                  <div className="tw-itinerary-stop-badges">
                    <span
                      className={`tw-itinerary-source-badge tw-itinerary-source-badge--${item.source}`}
                    >
                      {item.source === "smart" ? "Smart" : "Nearby"}
                    </span>

                    <span className="tw-itinerary-category-badge">
                      {item.category}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="tw-itinerary-remove-icon"
                    aria-label={`Remover ${item.name} do roteiro`}
                    onClick={() => onRemoveItem(item)}
                  >
                    <X size={15} />
                  </button>
                </div>

                <h2 className="tw-itinerary-stop-title">{item.name}</h2>

                <p className="tw-itinerary-stop-description">
                  {item.description}
                </p>

                <div className="tw-itinerary-stop-meta">
                  <span>{item.estimatedTime}</span>
                  <span>
                    Orçamento: {budgetLabels[item.budget] ?? item.budget}
                  </span>
                  <span>{formatAddedDate(item.addedAt)}</span>
                </div>

                {item.reason && (
                  <div className="tw-itinerary-stop-insight">
                    <Sparkles size={14} />
                    <p>{item.reason}</p>
                  </div>
                )}

                {item.interests.length > 0 && (
                  <div className="tw-itinerary-stop-tags">
                    {item.interests.map((interest) => (
                      <span key={interest}>
                        {formatInterest(interest, preferenceInterestLabels)}
                      </span>
                    ))}
                  </div>
                )}

                {activeList === "favorite" && item.status !== "toVisit" && (
                  <button
                    type="button"
                    className="tw-itinerary-visit-action"
                    onClick={() => onMoveToVisit(item)}
                  >
                    Adicionar a visitar
                  </button>
                )}

                {activeList === "favorite" && item.status === "toVisit" && (
                  <div className="tw-itinerary-visit-badge">
                    Já está na lista a visitar
                  </div>
                )}

                <button
  type="button"
  className="tw-itinerary-remove"
  onClick={() =>
    activeList === "favorite"
      ? onRemoveItem(item)
      : onRemoveFromVisit(item)
  }
>
  {activeList === "favorite"
    ? "Remover dos favoritos"
    : "Remover da lista a visitar"}
</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
