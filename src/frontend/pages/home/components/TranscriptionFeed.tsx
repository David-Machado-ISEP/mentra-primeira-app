import { useEffect, useMemo, useState } from "react";
import {
  Globe2,
  Languages,
  MessageCircle,
  Mic2,
  Radio,
  Volume2,
  Wand2,
} from "lucide-react";

export interface Transcription {
  id: number;
  text: string;
  time: string;
  isFinal: boolean;
  tripId?: string;
}

interface TranscriptionFeedProps {
  transcriptions: Transcription[];
  translationEnabled: boolean;
  targetLanguage: string;
  userId: string;
}

type AudioFilter = "translations" | "transcriptions";

const getShortTime = (time: string) => {
  const match = time.match(/\d{1,2}:\d{2}/);
  return match ? match[0].padStart(5, "0") : time;
};

const getDetectedLanguageCode = (text: string) => {
  const normalized = text.toLowerCase();

  if (/[áàâãçéêíóôõú]/i.test(text)) return "PT";
  if (
    /\b(can|where|station|ticket|how|much|tell|train|the|is|this|cost)\b/.test(
      normalized,
    )
  ) {
    return "EN";
  }
  if (/\b(vamos|visitar|guardar|ideia|almoço|jantar|fica)\b/.test(normalized)) {
    return "PT";
  }

  return "PT";
};

export function TranscriptionFeed({
  transcriptions,
  translationEnabled,
  targetLanguage,
  userId,
}: TranscriptionFeedProps) {
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [activeFilter, setActiveFilter] = useState<AudioFilter>("translations");

  useEffect(() => {
    const latest = transcriptions[0];

    if (!latest) return;
    if (!latest.isFinal) return;
    if (!translationEnabled) return;
    if (translations[latest.id]) return;

    const runTranslation = async () => {
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: latest.text,
            targetLanguage,
          }),
        });

        const data = await res.json();
        const translatedText = data.translation;

        setTranslations((prev) => ({
          ...prev,
          [latest.id]: translatedText,
        }));

        await fetch("/api/speak", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: userId || "",
            text: translatedText,
          }),
        });
      } catch {
        setTranslations((prev) => ({
          ...prev,
          [latest.id]: "Falha na tradução",
        }));
      }
    };

    runTranslation();
  }, [
    transcriptions,
    translationEnabled,
    targetLanguage,
    userId,
    translations,
  ]);

  const audioItems = useMemo(
    () =>
      transcriptions.map((transcription) => {
        const translatedText = translations[transcription.id];
        const hasTranslation =
          translationEnabled &&
          transcription.isFinal &&
          Boolean(translatedText) &&
          translatedText !== "Falha na tradução";

        return {
          ...transcription,
          translatedText,
          kind: hasTranslation ? "translation" : "transcription",
        };
      }),
    [transcriptions, translationEnabled, translations],
  );

  const filteredItems = audioItems.filter((item) => {
    if (activeFilter === "translations") return item.kind === "translation";
    if (activeFilter === "transcriptions") return item.kind === "transcription";
  });

  const filterOptions: Array<{
    value: AudioFilter;
    label: string;
  }> = [
    { value: "translations", label: "Traduções" },
    { value: "transcriptions", label: "Transcrições" },
  ];

  return (
    <section className="tf-audio-panel" aria-label="Histórico de áudios">
      <div className="tf-filter-row" role="tablist" aria-label="Filtrar áudios">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`tf-filter-pill ${
              activeFilter === option.value ? "tf-filter-pill-active" : ""
            }`}
            aria-selected={activeFilter === option.value}
            onClick={() => setActiveFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {transcriptions.length === 0 ? (
        <div className="tf-empty-state">
          <div className="tf-empty-icon">
            <Radio className="tf-empty-icon-svg" />
          </div>

          <p className="tf-empty-title">Ainda não existem interações de áudio</p>
          <p className="tf-empty-text">
            As transcrições e traduções feitas pelos óculos vão aparecer aqui
            durante a viagem.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="tf-empty-state tf-empty-state-compact">
          <div className="tf-empty-icon">
            <Mic2 className="tf-empty-icon-svg" />
          </div>

          <p className="tf-empty-title">Sem resultados neste filtro</p>
          <p className="tf-empty-text">
            Escolhe outro filtro para veres as restantes interações de áudio.
          </p>
        </div>
      ) : (
        <div className="tf-card-list">
          {filteredItems.map((item) => {
            const isTranslation = item.kind === "translation";
            const Icon = isTranslation ? Languages : MessageCircle;
            const translatedText = item.translatedText;
            const detectedLanguageCode = getDetectedLanguageCode(item.text);

            return (
              <article
                key={item.id}
                className={`tf-audio-card ${
                  isTranslation ? "tf-audio-card-translation" : "tf-audio-card-transcription"
                }`}
              >
                <div className="tf-card-topline">
                  <div className="tf-card-type">
                    <span className="tf-type-icon" aria-hidden="true">
                      <Icon />
                    </span>

                    <span className="tf-type-badge">
                      {isTranslation ? "Tradução" : "Transcrição"}
                    </span>
                  </div>

                  <time className="tf-card-time">{getShortTime(item.time)}</time>
                </div>

                <div className="tf-card-content">
                  <div className="tf-audio-row">
                    <Volume2 className="tf-row-icon" aria-hidden="true" />
                    <p className="tf-original-text">{item.text}</p>
                  </div>

                  {translationEnabled && item.isFinal && (
                    <>
                      <div className="tf-divider" />

                      <div className="tf-audio-row tf-translation-row">
                        <Wand2 className="tf-row-icon" aria-hidden="true" />
                        <p className="tf-translated-text">
                          {translatedText || "A traduzir..."}
                        </p>
                      </div>
                    </>
                  )}

                  <div className="tf-language-line">
                    <span className="tf-language-chip">
                      <Globe2 />
                      {detectedLanguageCode} detetado
                    </span>

                    {!item.isFinal && <span className="tf-live-chip">ao vivo</span>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
