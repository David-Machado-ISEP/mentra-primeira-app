import { useState } from "react";
import { Play, Mic } from "lucide-react";
import { Card, Button, Input } from "../../../components/ui";

interface AudioControlsProps {
  userId: string;
  onLog: (message: string) => void;
}

export function AudioControls({ userId, onLog }: AudioControlsProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakText, setSpeakText] = useState("");

  const handlePlayAudio = async () => {
    try {
      onLog("Starting audio playback...");
      const audioUrl = (import.meta as any).env?.VITE_AUDIO_URL || "nothing";

      const response = await fetch("/api/play-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioUrl, userId }),
      });

      const data = await response.json();
      onLog(response.ok ? "Audio playback started" : `Error: ${data.error}`);
    } catch (error) {
      onLog(`Failed to play audio: ${error}`);
    }
  };

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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Button
        variant="outline"
        className="h-auto py-3 justify-start gap-3"
        onClick={handlePlayAudio}
      >
        <Play className="w-4 h-4" />
        <span>Play Audio</span>
      </Button>

      <Card className="gap-0 p-0">
        <div className="p-3 flex items-center gap-2 border-b">
          <Mic className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Text-to-Speech</span>
        </div>
        <div className="p-3 flex gap-2">
          <Input
            value={speakText}
            onChange={(e) => setSpeakText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSpeak()}
            placeholder="Type something to speak..."
            className="h-8 text-sm"
          />
          <Button
            size="sm"
            onClick={handleSpeak}
            disabled={!speakText.trim()}
            className="shrink-0"
          >
            {isSpeaking ? (
              <Mic className="w-3.5 h-3.5 animate-pulse" />
            ) : (
              <Mic className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {isSpeaking ? "Speaking..." : "Speak"}
            </span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
