import { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, Play, Mic, Image, Zap, Terminal, Moon, Sun } from 'lucide-react';

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
  isDark: boolean;
  setIsDark: (value: boolean) => void;
}

export default function Template({ isDark, setIsDark }: TemplateProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakText, setSpeakText] = useState('');
  const logIdCounter = useRef(Date.now());

  const addLog = useCallback((message: string) => {
    setLogs(prev => [
      { id: logIdCounter.current++, message, time: new Date().toLocaleTimeString() },
      ...prev
    ].slice(0, 20));
  }, []);

  // Connect to SSE photo stream
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectToPhotoStream = () => {
      try {
        eventSource = new EventSource('/api/photo-stream');

        eventSource.onopen = () => {
          console.log('Connected to photo stream');
          addLog('Connected to photo stream');
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Skip connection messages
            if (data.type === 'connected') {
              return;
            }

            // Check if this is a new photo
            setPhotos(prev => {
              if (prev.some(p => p.requestId === data.requestId)) {
                return prev; // Already have this photo
              }

              const newPhoto: Photo = {
                id: data.requestId,
                requestId: data.requestId,
                url: data.dataUrl,
                timestamp: new Date(data.timestamp).toLocaleTimeString()
              };

              addLog(`Photo captured at ${newPhoto.timestamp}`);
              return [newPhoto, ...prev].slice(0, 6);
            });
          } catch (error) {
            console.error('Error parsing SSE message:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('SSE error:', error);
          addLog('Photo stream disconnected, reconnecting...');

          // Close and reconnect after a delay
          eventSource?.close();
          setTimeout(connectToPhotoStream, 3000);
        };
      } catch (error) {
        console.error('Error connecting to photo stream:', error);
        addLog('Failed to connect to photo stream');
      }
    };

    connectToPhotoStream();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [addLog]);

  // Connect to SSE transcription stream
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let idCounter = Date.now();

    const connectToTranscriptionStream = () => {
      try {
        eventSource = new EventSource('/api/transcription-stream');

        eventSource.onopen = () => {
          console.log('Connected to transcription stream');
          addLog('Connected to transcription stream');
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Skip connection messages
            if (data.type === 'connected') {
              return;
            }

            setTranscriptions(prev => {
              if (data.isFinal) {
                // If final, mark the existing top item as final
                if (prev.length > 0 && !prev[0].isFinal) {
                  // Update the first item with the final text and mark as final
                  const updated = [...prev];
                  updated[0] = {
                    id: updated[0].id,
                    text: data.text,
                    time: new Date(data.timestamp).toLocaleTimeString(),
                    isFinal: true
                  };
                  return updated.slice(0, 10);
                } else {
                  // No existing transcription or top is already final, create new one
                  return [
                    {
                      id: idCounter++,
                      text: data.text,
                      time: new Date(data.timestamp).toLocaleTimeString(),
                      isFinal: true
                    },
                    ...prev
                  ].slice(0, 10);
                }
              } else {
                // Partial transcription
                if (prev.length === 0 || prev[0].isFinal) {
                  // First transcription OR previous is finalized - create new bubble
                  return [{
                    id: idCounter++,
                    text: data.text,
                    time: new Date(data.timestamp).toLocaleTimeString(),
                    isFinal: false
                  }, ...prev].slice(0, 10);
                } else {
                  // Update the first item with partial text (it's not finalized yet)
                  const updated = [...prev];
                  updated[0] = {
                    id: updated[0].id,
                    text: data.text,
                    time: new Date(data.timestamp).toLocaleTimeString(),
                    isFinal: false
                  };
                  return updated;
                }
              }
            });
          } catch (error) {
            console.error('Error parsing SSE message:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('SSE error:', error);
          addLog('Transcription stream disconnected, reconnecting...');

          // Close and reconnect after a delay
          eventSource?.close();
          setTimeout(connectToTranscriptionStream, 3000);
        };
      } catch (error) {
        console.error('Error connecting to transcription stream:', error);
        addLog('Failed to connect to transcription stream');
      }
    };

    connectToTranscriptionStream();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [addLog]);

  const handlePlayAudio = async () => {
    try {
      // Set state immediately for better UX
      setIsPlayingAudio(true);
      addLog('Starting audio playback...');

      const audioUrl = 'https://general.dev.tpa.ngrok.app/assets/audio/one_more_time.mp3';

      const response = await fetch('/api/play-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audioUrl }),
      });

      const data = await response.json();

      if (response.ok) {
        addLog('Audio playback started');
        setTimeout(() => setIsPlayingAudio(false), 30000); // Auto-disable after 30 seconds
      } else {
        addLog(`Error: ${data.error}`);
        setIsPlayingAudio(false); // Reset on error
      }
    } catch (error) {
      addLog(`Failed to play audio: ${error}`);
      setIsPlayingAudio(false); // Reset on error
    }
  };

  // const handleStopAudio = async () => {
  //   try {
  //     const response = await fetch('/api/stop-audio', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //     });

  //     // Check if response is JSON
  //     const contentType = response.headers.get('content-type');
  //     if (!contentType || !contentType.includes('application/json')) {
  //       addLog('Error: Invalid response from server');
  //       console.error('Expected JSON but got:', contentType);
  //       setIsPlayingAudio(false);
  //       return;
  //     }

  //     const data = await response.json();

  //     if (response.ok) {
  //       addLog('Audio stopped');
  //       setIsPlayingAudio(false);
  //     } else {
  //       addLog(`Error: ${data.error}`);
  //     }
  //   } catch (error) {
  //     addLog(`Failed to stop audio: ${error}`);
  //     setIsPlayingAudio(false);
  //   }
  // };

  const handleSpeak = async () => {
    if (!speakText.trim()) {
      addLog('Please enter text to speak');
      return;
    }

    try {
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: speakText }),
      });

      const data = await response.json();

      if (response.ok) {
        addLog(`Speaking: "${speakText}"`);
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), 2000);
        setSpeakText('');
      } else {
        addLog(`Error: ${data.error}`);
      }
    } catch (error) {
      addLog(`Failed to speak: ${error}`);
    }
  };

  return (
    <div className="relative p-6 space-y-6 max-w-7xl mx-auto">
      {/* Photos Section */}
      <section className="relative rounded-xl bg-slate-900/30 backdrop-blur-xl overflow-hidden">
        <div className="relative p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/20">
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-[#d8d8d8]">Photo Stream</h2>
              <p className="text-[10px] text-slate-400">Live captures</p>
            </div>
          </div>
          <div className="px-2.5 py-1">
            <span className="text-xs font-medium text-emerald-400/70">
              {photos.length} captured
            </span>
          </div>
        </div>

        <div className="relative p-4">
          {photos.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex p-3 rounded-xl bg-purple-500/10 mb-3">
                <Image className="w-8 h-8 text-purple-400 opacity-50" />
              </div>
              <p className="text-slate-400 text-sm">Waiting for photo captures...</p>
              <p className="text-xs text-slate-500 mt-1">Images will appear here in real-time</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.map(photo => (
                <div
                  key={photo.id}
                  className="group relative aspect-video rounded-lg overflow-hidden hover:scale-105 transition-all"
                  style={{ animation: 'photoAppear 0.5s ease-out' }}
                >
                  <img
                    src={photo.url}
                    alt={`Captured at ${photo.timestamp}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-[10px] text-white font-mono">{photo.timestamp}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Control Buttons */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handlePlayAudio}
            disabled={isPlayingAudio}
            className={`flex-1 min-w-[150px] p-4 rounded-xl font-medium transition-all ${
              isPlayingAudio
                ? 'bg-emerald-500/20 cursor-not-allowed'
                : 'bg-slate-900/50 hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Play className={`w-4 h-4 ${isPlayingAudio ? 'text-emerald-300' : 'text-emerald-400'}`} />
              <span className={isPlayingAudio ? 'text-emerald-300 text-sm' : 'text-slate-100 text-sm'}>
                Play Audio
              </span>
            </div>
          </button>

          {/* {isPlayingAudio && (
            <button
              onClick={handleStopAudio}
              className="flex-1 min-w-[150px] p-4 rounded-xl font-medium transition-all bg-gradient-to-br from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800"
            >
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 bg-white rounded-sm animate-pulse"></div>
                <span className="text-white text-sm">Stop Audio</span>
              </div>
            </button>
          )} */}

          <button
            onClick={() => setIsDark(!isDark)}
            className="p-4 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 transition-all"
          >
            <div className="flex items-center justify-center gap-2">
              {isDark ? <Sun className="w-4 h-4 text-purple-400" /> : <Moon className="w-4 h-4 text-purple-400" />}
              <span className="text-slate-100 text-sm">
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </span>
            </div>
          </button>
        </div>

        {/* Text-to-Speech Input */}
        <div className="rounded-xl bg-slate-900/30 backdrop-blur-xl p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <div className="p-1.5 rounded-lg bg-rose-500/20">
              <Mic className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-[#d8d8d8]">Text-to-Speech</h3>
              <p className="text-[9px] sm:text-[10px] text-slate-400">Enter text to speak through glasses</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={speakText}
              onChange={(e) => setSpeakText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSpeak()}
              placeholder="Type something to speak..."
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg bg-slate-800/50 text-slate-100 text-sm placeholder:text-slate-500 border border-slate-700/50 focus:border-rose-400/50 focus:outline-none focus:ring-2 focus:ring-rose-400/20 transition-all"
            />
            <button
              onClick={handleSpeak}
              disabled={!speakText.trim()}
              className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                isSpeaking
                  ? 'bg-gradient-to-br from-rose-600 to-pink-700 text-white'
                  : speakText.trim()
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400'
                  : 'bg-slate-800/30 text-slate-600 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Mic className={`w-4 h-4 ${isSpeaking ? 'animate-pulse' : ''}`} />
                <span className="text-sm">{isSpeaking ? 'Speaking...' : 'Speak'}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Transcriptions and Logs */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Live Transcriptions */}
        <section className="relative rounded-xl bg-slate-900/30 backdrop-blur-xl overflow-hidden">
          <div className="relative p-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <h2 className="font-semibold text-base text-[#d8d8d8]">Live Transcriptions</h2>
                <p className="text-[10px] text-slate-400">Real-time audio processing</p>
              </div>
            </div>
          </div>

          <div className="relative px-4 pb-4 h-80 overflow-y-auto custom-scrollbar">
            {transcriptions.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-400 text-center text-sm">
                  Listening for audio input...
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {transcriptions.map(trans => (
                  <div
                    key={trans.id}
                    className="p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800/70 transition-all"
                    style={{ animation: 'slideDown 0.3s ease-out' }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></div>
                      <span className="text-[10px] text-emerald-400 font-mono">{trans.time}</span>
                    </div>
                    <p className="text-xs text-slate-200">{trans.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Live Logs */}
        <section className="relative rounded-xl bg-slate-900/30 backdrop-blur-xl overflow-hidden">
          <div className="relative p-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/20">
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div>
                <h2 className="font-semibold text-base text-[#d8d8d8]">System Logs</h2>
                <p className="text-[10px] text-slate-400">Development console</p>
              </div>
            </div>
          </div>

          <div className="relative px-4 pb-4 h-80 overflow-y-auto font-mono text-[11px] custom-scrollbar">
            {logs.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-400">No system logs yet...</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {logs.map(log => (
                  <div
                    key={log.id}
                    className="text-slate-300 hover:bg-slate-800/30 px-2 py-1 rounded transition-colors"
                    style={{ animation: 'slideDown 0.2s ease-out' }}
                  >
                    <span className="text-purple-400">[{log.time}]</span>{' '}
                    <span className="text-cyan-400">→</span>{' '}
                    {log.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <style>{`
        @keyframes photoAppear {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.3);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.3);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.5);
        }
      `}</style>
    </div>
  );
}
