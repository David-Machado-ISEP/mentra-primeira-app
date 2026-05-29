import sideFrameUrl from "../../../../assets/glasses/mentra-frame-side.png";

const hotspots = [
  {
    label: "1 toque",
    detail: "Fotografia",
  },
  {
    label: "3 toques",
    detail: "Explicar",
  },
  {
    label: "Long press",
    detail: "Traduzir menu",
  },
];

export function GlassesIntroAnimation() {
  return (
    <section
      className="ob-glasses-stage ob-glasses-stage-side"
      aria-label="Instruções dos Mentra Smart Glasses"
    >
      <div className="ob-glasses-product-wrap" aria-hidden="true">
        <img
          className="ob-glasses-image ob-glasses-side ob-glasses-image-active"
          src={sideFrameUrl}
          alt=""
        />

        <span className="ob-glasses-gesture-target ob-glasses-gesture-target-visible">
          <span className="ob-glasses-hotspot-pulse" />
        </span>

        <div className="ob-glasses-hotspot-list">
          {hotspots.map((hotspot) => (
            <span
              key={hotspot.label}
              className="ob-glasses-hotspot-item ob-glasses-hotspot-item-visible"
            >
              <strong>{hotspot.label}</strong>
              <small>{hotspot.detail}</small>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
