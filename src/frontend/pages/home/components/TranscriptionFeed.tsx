import { useEffect, useState } from "react";
import { MessageCircle, Radio, Languages, CheckCircle2 } from "lucide-react";

import { Card, CardContent, ScrollArea, Badge } from "../../../components/ui";


export interface Transcription {
  id: number;
  text: string;
  time: string;
  isFinal: boolean;
}

interface TranscriptionFeedProps {
  transcriptions: Transcription[];
  translationEnabled: boolean;
  targetLanguage: string;
  userId: string;
}

export function TranscriptionFeed({
  transcriptions,
  translationEnabled,
  targetLanguage,
  userId,
}: TranscriptionFeedProps) {
  const [translations, setTranslations] = useState<Record<number, string>>({});

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

        /* AUTO SPEAK */
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
          [latest.id]: "Translation failed",
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

  return (
    <Card className="tf-card">
      <CardContent className="tf-content">
        <div className="tf-header">
          <div className="tf-heading">
            <div className="tf-heading-icon">
              <MessageCircle className="tf-heading-icon-svg" />
            </div>

            <div>
              <h2 className="tf-title">Transcriptions</h2>
              <p className="tf-description">
                Live audio captured from the glasses.
              </p>
            </div>
          </div>

          <div className="tf-status">
            <span className="tf-status-dot" />
            <span>{transcriptions.length > 0 ? "Listening" : "Waiting"}</span>
          </div>
        </div>

        <ScrollArea className="tf-scroll">
          {transcriptions.length === 0 ? (
            <div className="tf-empty-state">
              <div className="tf-empty-icon">
                <Radio className="tf-empty-icon-svg" />
              </div>

              <p className="tf-empty-title">Listening for audio input</p>
              <p className="tf-empty-text">
                When speech is detected, live transcriptions will appear here.
              </p>
            </div>
          ) : (
            <div className="tf-list">
              {transcriptions.map((trans) => (
                <article
                  key={trans.id}
                  className={`tf-item ${
                    trans.isFinal ? "tf-item-final" : "tf-item-live"
                  }`}
                >
                  <div className="tf-item-header">
                    <div className="tf-item-meta">
                      <span
                        className={`tf-live-dot ${
                          trans.isFinal ? "tf-live-dot-final" : ""
                        }`}
                      />

                      <span className="tf-time">{trans.time}</span>
                    </div>

                    <div className="tf-badges">
                      {trans.isFinal ? (
                        <Badge variant="secondary" className="tf-badge">
                          <CheckCircle2 className="tf-badge-icon" />
                          final
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="tf-badge">
                          live
                        </Badge>
                      )}

                      {translationEnabled && (
                        <Badge className="tf-badge tf-translation-badge">
                          <Languages className="tf-badge-icon" />
                          {targetLanguage}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="tf-text">{trans.text}</p>

                  {translationEnabled && trans.isFinal && (
                    <div className="tf-translation-box">
                      <div className="tf-translation-label">
                        <Languages className="tf-translation-label-icon" />
                        Translation
                      </div>

                      <p className="tf-translation-text">
                        {translations[trans.id] || "Translating..."}
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
