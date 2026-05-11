import { Terminal, Activity, Clock3 } from "lucide-react";

import { Card, CardContent, ScrollArea } from "../../../components/ui";

import "../estilo/SystemLogs.css";

export interface Log {
  id: number;
  message: string;
  time: string;
}

interface SystemLogsProps {
  logs: Log[];
}

export function SystemLogs({ logs }: SystemLogsProps) {
  return (
    <Card className="sl-card">
      <CardContent className="sl-content">
        <div className="sl-header">
          <div className="sl-heading">
            <div className="sl-heading-icon">
              <Terminal className="sl-heading-icon-svg" />
            </div>

            <div>
              <h2 className="sl-title">System Logs</h2>
              <p className="sl-description">
                Runtime events and app activity.
              </p>
            </div>
          </div>

          <div className="sl-counter">
            <Activity className="sl-counter-icon" />
            <span>{logs.length}</span>
          </div>
        </div>

        <ScrollArea className="sl-scroll">
          {logs.length === 0 ? (
            <div className="sl-empty-state">
              <div className="sl-empty-icon">
                <Terminal className="sl-empty-icon-svg" />
              </div>

              <p className="sl-empty-title">No system logs yet</p>
              <p className="sl-empty-text">
                App events, streams and actions will appear here.
              </p>
            </div>
          ) : (
            <div className="sl-list">
              {logs.map((log) => (
                <article key={log.id} className="sl-item">
                  <div className="sl-time">
                    <Clock3 className="sl-time-icon" />
                    <span>{log.time}</span>
                  </div>

                  <div className="sl-message">
                    <span className="sl-arrow">→</span>
                    <span>{log.message}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}