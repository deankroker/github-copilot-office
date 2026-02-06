import * as React from "react";
import {
  makeStyles,
  Button,
  Text,
  Spinner,
  Tooltip,
  Badge,
} from "@fluentui/react-components";
import {
  ArrowLeft24Regular,
  Play24Regular,
  Stop24Regular,
  ArrowClockwise24Regular,
  Open24Regular,
  ArrowSync24Regular,
  PlugConnected20Regular,
  PlugDisconnected20Regular,
  Warning20Regular,
} from "@fluentui/react-icons";

interface McpServer {
  id: string;
  name: string;
  description: string;
  type: string;
  status: "disconnected" | "connecting" | "connected" | "error";
  error: string | null;
  toolCount: number;
}

interface McpPanelProps {
  onClose: () => void;
  onToolsChanged: () => void;
}

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "var(--colorNeutralBackground2)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px",
    borderBottom: "1px solid var(--colorNeutralStroke2)",
  },
  headerTitle: {
    fontWeight: "600",
    fontSize: "14px",
    flex: 1,
  },
  backButton: {
    minWidth: "32px",
    padding: "4px",
  },
  headerActions: {
    display: "flex",
    gap: "4px",
  },
  headerAction: {
    minWidth: "28px",
    width: "28px",
    height: "28px",
    padding: "0",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "8px",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "var(--colorNeutralForeground3)",
    fontSize: "13px",
    padding: "20px",
    textAlign: "center",
    gap: "8px",
  },
  serverItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "6px",
    marginBottom: "4px",
    backgroundColor: "var(--colorNeutralBackground1)",
    border: "1px solid var(--colorNeutralStroke2)",
  },
  serverIcon: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
  },
  serverContent: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
  },
  serverName: {
    fontSize: "13px",
    fontWeight: "500",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    color: "var(--colorNeutralForeground1)",
  },
  serverMeta: {
    fontSize: "11px",
    color: "var(--colorNeutralForeground3)",
    marginTop: "2px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  serverActions: {
    display: "flex",
    gap: "2px",
    flexShrink: 0,
  },
  actionButton: {
    minWidth: "28px",
    width: "28px",
    height: "28px",
    padding: "0",
  },
  startButton: {
    minWidth: "28px",
    width: "28px",
    height: "28px",
    padding: "0",
    color: "var(--colorPaletteGreenForeground1)",
    ":hover": {
      backgroundColor: "var(--colorPaletteGreenBackground1)",
    },
  },
  stopButton: {
    minWidth: "28px",
    width: "28px",
    height: "28px",
    padding: "0",
    color: "var(--colorPaletteRedForeground1)",
    ":hover": {
      backgroundColor: "var(--colorPaletteRedBackground1)",
    },
  },
  configPath: {
    fontSize: "11px",
    color: "var(--colorNeutralForeground3)",
    padding: "8px 12px",
    borderTop: "1px solid var(--colorNeutralStroke2)",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    cursor: "pointer",
    ":hover": {
      color: "var(--colorNeutralForeground2)",
    },
  },
});

export const McpPanel: React.FC<McpPanelProps> = ({ onClose, onToolsChanged }) => {
  const styles = useStyles();
  const [servers, setServers] = React.useState<McpServer[]>([]);
  const [configPath, setConfigPath] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);
  const [actionInProgress, setActionInProgress] = React.useState<string | null>(null);

  const fetchServers = React.useCallback(async () => {
    try {
      const res = await fetch("/api/mcp/servers");
      const data = await res.json();
      setServers(data.servers);
      setConfigPath(data.configPath || "");
    } catch (e) {
      console.error("Failed to fetch MCP servers:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const handleAction = async (id: string, action: "connect" | "disconnect" | "restart") => {
    setActionInProgress(id);
    try {
      const res = await fetch(`/api/mcp/servers/${id}/${action}`, { method: "POST" });
      const data = await res.json();
      setServers(data.servers);
      onToolsChanged();
    } catch (e) {
      console.error(`Failed to ${action} server ${id}:`, e);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReload = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mcp/reload", { method: "POST" });
      const data = await res.json();
      setServers(data.servers);
      setConfigPath(data.configPath || "");
    } catch (e) {
      console.error("Failed to reload config:", e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <PlugConnected20Regular style={{ color: "var(--colorPaletteGreenForeground1)" }} />;
      case "connecting":
        return <Spinner size="tiny" />;
      case "error":
        return <Warning20Regular style={{ color: "var(--colorPaletteRedForeground1)" }} />;
      default:
        return <PlugDisconnected20Regular style={{ color: "var(--colorNeutralForeground3)" }} />;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button
          icon={<ArrowLeft24Regular />}
          appearance="subtle"
          className={styles.backButton}
          onClick={onClose}
          aria-label="Back"
        />
        <Text className={styles.headerTitle}>MCP Servers</Text>
        <div className={styles.headerActions}>
          <Tooltip content="Reload config" relationship="label">
            <Button
              icon={<ArrowSync24Regular />}
              appearance="subtle"
              className={styles.headerAction}
              onClick={handleReload}
              aria-label="Reload config"
            />
          </Tooltip>
        </div>
      </div>

      <div className={styles.list}>
        {loading ? (
          <div className={styles.emptyState}>
            <Spinner size="small" />
            <Text>Loading servers...</Text>
          </div>
        ) : servers.length === 0 ? (
          <div className={styles.emptyState}>
            <Text>No MCP servers configured.</Text>
            <Text>Edit the config file to add servers.</Text>
          </div>
        ) : (
          servers.map((server) => (
            <div key={server.id} className={styles.serverItem}>
              <div className={styles.serverIcon}>
                {actionInProgress === server.id ? (
                  <Spinner size="tiny" />
                ) : (
                  getStatusIcon(server.status)
                )}
              </div>
              <div className={styles.serverContent}>
                <div className={styles.serverName}>{server.name}</div>
                <div className={styles.serverMeta}>
                  {server.status === "connected" && (
                    <Badge appearance="filled" color="success" size="small">
                      {server.toolCount} tools
                    </Badge>
                  )}
                  {server.status === "error" && (
                    <Tooltip content={server.error || "Unknown error"} relationship="description">
                      <Badge appearance="filled" color="danger" size="small">
                        Error
                      </Badge>
                    </Tooltip>
                  )}
                  {server.status === "disconnected" && (
                    <span style={{ fontSize: "11px" }}>Stopped</span>
                  )}
                  <span style={{ opacity: 0.6 }}>{server.type}</span>
                </div>
              </div>
              <div className={styles.serverActions}>
                {server.status === "disconnected" || server.status === "error" ? (
                  <Tooltip content="Start" relationship="label">
                    <Button
                      icon={<Play24Regular />}
                      appearance="subtle"
                      className={styles.startButton}
                      onClick={() => handleAction(server.id, "connect")}
                      disabled={actionInProgress !== null}
                      aria-label="Start server"
                    />
                  </Tooltip>
                ) : server.status === "connected" ? (
                  <>
                    <Tooltip content="Restart" relationship="label">
                      <Button
                        icon={<ArrowClockwise24Regular />}
                        appearance="subtle"
                        className={styles.actionButton}
                        onClick={() => handleAction(server.id, "restart")}
                        disabled={actionInProgress !== null}
                        aria-label="Restart server"
                      />
                    </Tooltip>
                    <Tooltip content="Stop" relationship="label">
                      <Button
                        icon={<Stop24Regular />}
                        appearance="subtle"
                        className={styles.stopButton}
                        onClick={() => handleAction(server.id, "disconnect")}
                        disabled={actionInProgress !== null}
                        aria-label="Stop server"
                      />
                    </Tooltip>
                  </>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {configPath && (
        <div className={styles.configPath} title={configPath}>
          <Open24Regular style={{ width: 14, height: 14 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {configPath}
          </span>
        </div>
      )}
    </div>
  );
};
