import { useEffect, useState } from "react";

import chargingCaseUrl from "../../../../assets/glasses/chargingcase.png";
import closedGlassesUrl from "../../../../assets/glasses/closed-mentra-live.png";
import frontFrameUrl from "../../../../assets/glasses/mentra-frame-front.png";
import sideFrameUrl from "../../../../assets/glasses/mentra-frame-side.png";

const animationSteps = [
  {
    id: "case",
    label: "Na caixa",
    imageUrl: chargingCaseUrl,
    imageClassName: "ob-glasses-case",
  },
  {
    id: "closed",
    label: "A preparar",
    imageUrl: closedGlassesUrl,
    imageClassName: "ob-glasses-closed",
  },
  {
    id: "front",
    label: "Vista frontal",
    imageUrl: frontFrameUrl,
    imageClassName: "ob-glasses-front",
  },
  {
    id: "side",
    label: "Haste direita",
    imageUrl: sideFrameUrl,
    imageClassName: "ob-glasses-side",
  },
] as const;

const hotspots = [
  {
    label: "1 toque",
    detail: "Fotografia",
    className: "ob-glasses-hotspot-single",
  },
  {
    label: "3 toques",
    detail: "Explicar",
    className: "ob-glasses-hotspot-triple",
  },
  {
    label: "Long press",
    detail: "Traduzir menu",
    className: "ob-glasses-hotspot-long",
  },
];

export function GlassesIntroAnimation() {
  const [activeStep, setActiveStep] = useState(0);
  const [visibleHotspots, setVisibleHotspots] = useState(0);

  useEffect(() => {
    setVisibleHotspots(0);

    if (activeStep === animationSteps.length - 1) return;

    const stepDurations = [620, 600, 640];
    const timeoutId = window.setTimeout(() => {
      setActiveStep((currentStep) =>
        Math.min(currentStep + 1, animationSteps.length - 1),
      );
    }, stepDurations[activeStep] ?? 820);

    return () => window.clearTimeout(timeoutId);
  }, [activeStep]);

  useEffect(() => {
    const isLastStep = activeStep === animationSteps.length - 1;

    if (!isLastStep || visibleHotspots >= hotspots.length) return;

    const timeoutId = window.setTimeout(() => {
      setVisibleHotspots((currentCount) =>
        Math.min(currentCount + 1, hotspots.length),
      );
    }, visibleHotspots === 0 ? 260 : 430);

    return () => window.clearTimeout(timeoutId);
  }, [activeStep, visibleHotspots]);

  const currentStep = animationSteps[activeStep];

  return (
    <section
      className={`ob-glasses-stage ob-glasses-stage-${currentStep.id}`}
      aria-label="Animação dos Mentra Smart Glasses"
    >
      <div className="ob-glasses-product-wrap" aria-hidden="true">
        <img
          key={currentStep.id}
          className={`ob-glasses-image ${currentStep.imageClassName}`}
          src={currentStep.imageUrl}
          alt=""
        />

        {hotspots.map((hotspot, index) => (
          <span
            key={hotspot.label}
            className={`ob-glasses-hotspot ${hotspot.className} ${
              index < visibleHotspots ? "ob-glasses-hotspot-visible" : ""
            }`}
          >
            <span className="ob-glasses-hotspot-pulse" />
            <span className="ob-glasses-hotspot-label">
              <strong>{hotspot.label}</strong>
              <small>{hotspot.detail}</small>
            </span>
          </span>
        ))}
      </div>

      <div className="ob-glasses-stepper" aria-hidden="true">
        {animationSteps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            className={`ob-glasses-step ${
              activeStep === index ? "ob-glasses-step-active" : ""
            }`}
            onClick={() => setActiveStep(index)}
            aria-label={step.label}
          />
        ))}
      </div>
    </section>
  );
}
