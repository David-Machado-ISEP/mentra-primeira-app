import { useState, useEffect, useCallback, useRef } from "react";
import {
  Camera,
  Play,
  Mic,
  Image,
  Zap,
  Terminal,
  Moon,
  Sun,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Badge,
  ScrollArea,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Switch,
} from "../components/ui";
import { useTheme } from "../App";

interface Photo {
  id: string;
  url: string;
  timestamp: string;
  requestId: string;
}

interface Transcription {
  id: number;
  text: string;
  time: string;
  isFinal: boolean;
}

interface Log {
  id: number;
  message: string;
  time: string;
}

interface TemplateProps {
  userId: string;
}

export default function Template({ userId }: TemplateProps) {
  const { isDarkMode, toggleTheme } = useTheme();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakText, setSpeakText] = useState("");
  const logIdCounter = useRef(Date.now());

  const addLog = useCallback((message: string) => {
    setLogs((prev) =>
      [
        {
          id: logIdCounter.current++,
          message,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 20),
    );
  }, []);

  // Connect to SSE photo stream
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectToPhotoStream = () => {
      try {
        eventSource = new EventSource(
          `/api/photo-stream?userId=${encodeURIComponent(userId)}`,
        );

        eventSource.onopen = () => {
          addLog("Connected to photo stream");
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "connected") return;

            setPhotos((prev) => {
              if (prev.some((p) => p.requestId === data.requestId)) return prev;

              const newPhoto: Photo = {
                id: data.requestId,
                requestId: data.requestId,
                url: data.dataUrl,
                timestamp: new Date(data.timestamp).toLocaleTimeString(),
              };

              addLog(`Photo captured at ${newPhoto.timestamp}`);
              return [newPhoto, ...prev].slice(0, 6);
            });
          } catch {
            // Ignore parse errors
          }
        };

        eventSource.onerror = () => {
          addLog("Photo stream disconnected, reconnecting...");
          eventSource?.close();
          setTimeout(connectToPhotoStream, 3000);
        };
      } catch {
        addLog("Failed to connect to photo stream");
      }
    };

    connectToPhotoStream();
    return () => eventSource?.close();
  }, [addLog, userId]);

  // Connect to SSE transcription stream
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let idCounter = Date.now();

    const connectToTranscriptionStream = () => {
      try {
        eventSource = new EventSource(
          `/api/transcription-stream?userId=${encodeURIComponent(userId)}`,
        );

        eventSource.onopen = () => {
          addLog("Connected to transcription stream");
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "connected") return;

            setTranscriptions((prev) => {
              if (data.isFinal) {
                if (prev.length > 0 && !prev[0].isFinal) {
                  const updated = [...prev];
                  updated[0] = {
                    id: updated[0].id,
                    text: data.text,
                    time: new Date(data.timestamp).toLocaleTimeString(),
                    isFinal: true,
                  };
                  return updated.slice(0, 10);
                }
                return [
                  {
                    id: idCounter++,
                    text: data.text,
                    time: new Date(data.timestamp).toLocaleTimeString(),
                    isFinal: true,
                  },
                  ...prev,
                ].slice(0, 10);
              } else {
                if (prev.length === 0 || prev[0].isFinal) {
                  return [
                    {
                      id: idCounter++,
                      text: data.text,
                      time: new Date(data.timestamp).toLocaleTimeString(),
                      isFinal: false,
                    },
                    ...prev,
                  ].slice(0, 10);
                }
                const updated = [...prev];
                updated[0] = {
                  id: updated[0].id,
                  text: data.text,
                  time: new Date(data.timestamp).toLocaleTimeString(),
                  isFinal: false,
                };
                return updated;
              }
            });
          } catch {
            // Ignore parse errors
          }
        };

        eventSource.onerror = () => {
          addLog("Transcription stream disconnected, reconnecting...");
          eventSource?.close();
          setTimeout(connectToTranscriptionStream, 3000);
        };
      } catch {
        addLog("Failed to connect to transcription stream");
      }
    };

    connectToTranscriptionStream();
    return () => eventSource?.close();
  }, [addLog, userId]);

  const handlePlayAudio = async () => {
    try {
      addLog("Starting audio playback...");
      const audioUrl = (import.meta as any).env?.VITE_AUDIO_URL || "nothing";

      const response = await fetch("/api/play-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioUrl, userId }),
      });

      const data = await response.json();
      addLog(response.ok ? "Audio playback started" : `Error: ${data.error}`);
    } catch (error) {
      addLog(`Failed to play audio: ${error}`);
    }
  };

  const handleSpeak = async () => {
    if (!speakText.trim()) {
      addLog("Please enter text to speak");
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
        addLog(`Speaking: "${speakText}"`);
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), 2000);
        setSpeakText("");
      } else {
        addLog(`Error: ${data.error}`);
      }
    } catch (error) {
      addLog(`Failed to speak: ${error}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Camera className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Camera App</h1>
            <p className="text-xs text-muted-foreground">MentraOS</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono text-xs">
            {userId?.substring(0, 8)}...
          </Badge>
          <div className="flex items-center gap-2">
            <Sun className="w-3.5 h-3.5 text-muted-foreground" />
            <Switch checked={isDarkMode} onCheckedChange={toggleTheme} />
            <Moon className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Photo Stream */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm">Photo Stream</CardTitle>
          </div>
          <CardDescription className="text-xs">
            {photos.length} captured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <div className="text-center py-10">
              <div className="inline-flex p-3 rounded-xl bg-muted mb-3">
                <Image className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Waiting for photo captures...
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Images will appear here in real-time
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative aspect-video rounded-lg overflow-hidden bg-muted animate-photo-in"
                >
                  <img
                    src={photo.url}
                    alt={`Captured at ${photo.timestamp}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-2 left-2">
                      <span className="text-[10px] text-white font-mono">
                        {photo.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controls */}
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

      {/* Transcriptions & Logs */}
      <Tabs defaultValue="transcriptions">
        <TabsList className="w-full">
          <TabsTrigger value="transcriptions" className="flex-1">
            <Zap className="w-3.5 h-3.5" />
            Transcriptions
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex-1">
            <Terminal className="w-3.5 h-3.5" />
            System Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transcriptions">
          <Card>
            <CardContent className="pt-4">
              <ScrollArea className="h-72">
                {transcriptions.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-muted-foreground">
                      Listening for audio input...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 pr-3">
                    {transcriptions.map((trans) => (
                      <div
                        key={trans.id}
                        className="p-2.5 rounded-lg bg-muted/50 animate-slide-down"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              trans.isFinal
                                ? "bg-chart-4"
                                : "bg-chart-2 animate-pulse"
                            }`}
                          />
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {trans.time}
                          </span>
                          {trans.isFinal && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] h-4"
                            >
                              final
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-foreground">{trans.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardContent className="pt-4">
              <ScrollArea className="h-72">
                {logs.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-muted-foreground">
                      No system logs yet...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0.5 font-mono text-[11px] pr-3">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="px-2 py-1 rounded text-foreground/80 animate-slide-down"
                      >
                        <span className="text-muted-foreground">
                          [{log.time}]
                        </span>{" "}
                        <span className="text-chart-5">&rarr;</span>{" "}
                        {log.message}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
