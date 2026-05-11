import { useState } from "react";
import { Mic, Volume2, Send } from "lucide-react";

import { Card, Button, Input } from "../../../components/ui";

import "../estilo/AudioControls.css";

interface AudioControlsProps {
  userId: string;
  onLog: (message: string) => void;
}

export function AudioControls({ userId, onLog }: AudioControlsProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakText, setSpeakText] = useState("");

  const handleSpeak = async () => {
    if (!speakText.trim()) {
      onLog("Please enter text to speak");
      return;
    }

    try {
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: speakText, userId }),
      });

      const data = await response.json();

      if (response.ok) {
        onLog(`Speaking: "${speakText}"`);
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), 2000);
        setSpeakText("");
      } else {
        onLog(`Error: ${data.error}`);
      }
    } catch (error) {
      onLog(`Failed to speak: ${error}`);
    }
  };

  return (
    <Card className="ac-card">
      <div className="ac-header">
        <div className="ac-heading">
          <div className="ac-heading-icon">
            <Mic className="ac-heading-icon-svg" />
          </div>

          <div>
            <h2 className="ac-title">Text-to-Speech</h2>
            <p className="ac-description">
              Send short audio responses to the Mentra Live glasses.
            </p>
          </div>
        </div>

        <div className={`ac-status ${isSpeaking ? "ac-status-active" : ""}`}>
          <span className="ac-status-dot" />
          <span>{isSpeaking ? "Speaking" : "Ready"}</span>
        </div>
      </div>

      <div className="ac-body">
        <div className="ac-input-wrap">
          <Volume2 className="ac-input-icon" />

          <Input
            value={speakText}
            onChange={(e) => setSpeakText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSpeak()}
            placeholder="Type something to speak..."
            className="ac-input"
          />
        </div>

        <Button
          onClick={handleSpeak}
          disabled={!speakText.trim()}
          className="ac-button"
        >
          {isSpeaking ? (
            <Mic className="ac-button-icon ac-pulse" />
          ) : (
            <Send className="ac-button-icon" />
          )}

          <span>{isSpeaking ? "Speaking..." : "Speak"}</span>
        </Button>
      </div>
    </Card>
  );
}