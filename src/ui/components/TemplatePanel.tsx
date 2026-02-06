import * as React from "react";
import {
  makeStyles,
  Button,
  Text,
  Spinner,
  Tooltip,
} from "@fluentui/react-components";
import {
  ArrowLeft24Regular,
  ArrowSync24Regular,
  Open24Regular,
} from "@fluentui/react-icons";

interface Template {
  id: string;
  name: string;
  description: string;
  hosts: string[];
  icon: string;
  source: "builtin" | "custom";
}

interface TemplatePanelProps {
  onClose: () => void;
  onSelectTemplate: (template: Template) => void;
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
  sectionLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "var(--colorNeutralForeground3)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    padding: "8px 4px 4px",
  },
  templateCard: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "6px",
    marginBottom: "4px",
    backgroundColor: "var(--colorNeutralBackground1)",
    border: "1px solid var(--colorNeutralStroke2)",
    cursor: "pointer",
    ":hover": {
      backgroundColor: "var(--colorNeutralBackground1Hover)",
      borderColor: "var(--colorNeutralStroke1Hover)",
    },
  },
  templateIcon: {
    fontSize: "20px",
    flexShrink: 0,
    width: "28px",
    textAlign: "center",
  },
  templateContent: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
  },
  templateName: {
    fontSize: "13px",
    fontWeight: "500",
    color: "var(--colorNeutralForeground1)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  templateDescription: {
    fontSize: "11px",
    color: "var(--colorNeutralForeground3)",
    marginTop: "2px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  useButton: {
    minWidth: "48px",
    height: "28px",
    fontSize: "12px",
    flexShrink: 0,
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
  emptyCustom: {
    fontSize: "12px",
    color: "var(--colorNeutralForeground3)",
    padding: "12px",
    textAlign: "center",
    lineHeight: "1.5",
  },
  customPath: {
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

export const TemplatePanel: React.FC<TemplatePanelProps> = ({ onClose, onSelectTemplate }) => {
  const styles = useStyles();
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [customPath, setCustomPath] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);

  const fetchTemplates = React.useCallback(async () => {
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      setTemplates(data.templates || []);
      setCustomPath(data.customPath || "");
    } catch (e) {
      console.error("Failed to fetch templates:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleReload = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/templates/reload", { method: "POST" });
      const data = await res.json();
      setTemplates(data.templates || []);
      setCustomPath(data.customPath || "");
    } catch (e) {
      console.error("Failed to reload templates:", e);
    } finally {
      setLoading(false);
    }
  };

  const builtinTemplates = templates.filter(t => t.source === "builtin");
  const customTemplates = templates.filter(t => t.source === "custom");

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
        <Text className={styles.headerTitle}>Templates</Text>
        <div className={styles.headerActions}>
          <Tooltip content="Reload templates" relationship="label">
            <Button
              icon={<ArrowSync24Regular />}
              appearance="subtle"
              className={styles.headerAction}
              onClick={handleReload}
              aria-label="Reload templates"
            />
          </Tooltip>
        </div>
      </div>

      <div className={styles.list}>
        {loading ? (
          <div className={styles.emptyState}>
            <Spinner size="small" />
            <Text>Loading templates...</Text>
          </div>
        ) : templates.length === 0 ? (
          <div className={styles.emptyState}>
            <Text>No templates found.</Text>
          </div>
        ) : (
          <>
            {builtinTemplates.length > 0 && (
              <>
                <div className={styles.sectionLabel}>Built-in</div>
                {builtinTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={styles.templateCard}
                    onClick={() => onSelectTemplate(template)}
                  >
                    <div className={styles.templateIcon}>{template.icon}</div>
                    <div className={styles.templateContent}>
                      <div className={styles.templateName}>{template.name}</div>
                      <div className={styles.templateDescription}>{template.description}</div>
                    </div>
                    <Button
                      appearance="primary"
                      size="small"
                      className={styles.useButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTemplate(template);
                      }}
                    >
                      Use
                    </Button>
                  </div>
                ))}
              </>
            )}

            {customTemplates.length > 0 ? (
              <>
                <div className={styles.sectionLabel}>Custom</div>
                {customTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={styles.templateCard}
                    onClick={() => onSelectTemplate(template)}
                  >
                    <div className={styles.templateIcon}>{template.icon}</div>
                    <div className={styles.templateContent}>
                      <div className={styles.templateName}>{template.name}</div>
                      <div className={styles.templateDescription}>{template.description}</div>
                    </div>
                    <Button
                      appearance="primary"
                      size="small"
                      className={styles.useButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTemplate(template);
                      }}
                    >
                      Use
                    </Button>
                  </div>
                ))}
              </>
            ) : (
              <div className={styles.emptyCustom}>
                Add custom templates by placing <code>.md</code> files in the templates directory below.
              </div>
            )}
          </>
        )}
      </div>

      {customPath && (
        <div className={styles.customPath} title={customPath}>
          <Open24Regular style={{ width: 14, height: 14 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {customPath}
          </span>
        </div>
      )}
    </div>
  );
};
