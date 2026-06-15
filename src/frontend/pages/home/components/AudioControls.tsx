import { useState } from "react";
import { Mic, Volume2, Send } from "lucide-react";

import { Card, Button, Input } from "../../../components/ui";


type LogType = "info" | "success" | "warning" | "error";

interface AudioControlsProps {
  userId: string;
  onLog: (message: string, type?: LogType) => void;
}

export function AudioControls({ userId, onLog }: AudioControlsProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakText, setSpeakText] = useState("");

  const handleSpeak = async () => {
    const textToSpeak = speakText.trim();

    if (!textToSpeak) {
      onLog("Please enter text to speak", "warning");
      return;
    }

    try {
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSpeak, userId }),
      });

      const data = await response.json();

      if (response.ok) {
        onLog(`Speaking: "${textToSpeak}"`, "success");
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), 2000);
        setSpeakText("");
      } else {
        onLog(`Text-to-Speech error: ${data.error}`, "error");
      }
    } catch (error) {
      onLog(`Failed to speak: ${error}`, "error");
    }
  };

  return (
    <Card className="ac-card">
      <div className="ac-header">
        <div className="ac-heading">
          <div className="ac-heading-icon">
            <Volume2 className="ac-heading-icon-svg" />
          </div>

          <div>
            <span className="ac-kicker">Saída de voz</span>
            <h2 className="ac-title">Enviar resposta para os óculos</h2>
            <p className="ac-description">
              Escreve uma resposta curta para ser reproduzida nos Mentra Live.
            </p>
          </div>
        </div>

        <div className={`ac-status ${isSpeaking ? "ac-status-active" : ""}`}>
          <span className="ac-status-dot" />
          <span>{isSpeaking ? "A reproduzir" : "Pronto"}</span>
        </div>
      </div>

      <div className="ac-body">
        <div className="ac-input-wrap">
          <Mic className="ac-input-icon" />

          <Input
            value={speakText}
            onChange={(e) => setSpeakText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSpeak()}
            placeholder="Escreve uma mensagem para os óculos..."
            className="ac-input"
          />
        </div>

        <Button
          onClick={handleSpeak}
          disabled={!speakText.trim()}
          className="ac-button"
        >
          {isSpeaking ? (
            <Volume2 className="ac-button-icon ac-pulse" />
          ) : (
            <Send className="ac-button-icon" />
          )}

          <span>{isSpeaking ? "A enviar..." : "Enviar"}</span>
        </Button>
      </div>
    </Card>
  );
}
