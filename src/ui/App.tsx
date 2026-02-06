import { useState, useEffect, useRef } from "react";
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  makeStyles,
} from "@fluentui/react-components";
import { ChatInput, ImageAttachment, ActiveTemplate } from "./components/ChatInput";
import { Message, MessageList } from "./components/MessageList";
import { HeaderBar, ModelType } from "./components/HeaderBar";
import { SessionHistory } from "./components/SessionHistory";
import { McpPanel } from "./components/McpPanel";
import { TemplatePanel } from "./components/TemplatePanel";
import { useIsDarkMode } from "./useIsDarkMode";
import { useLocalStorage } from "./useLocalStorage";
import { createWebSocketClient } from "./lib/websocket-client";
import { getToolsForHost } from "./tools";
import { 
  SavedSession, 
  OfficeHost, 
  saveSession, 
  generateSessionTitle, 
  getHostFromOfficeHost 
} from "./sessionStorage";
import React from "react";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "var(--colorNeutralBackground3)",
  },
});

const DEFAULT_MODEL: ModelType = "claude-sonnet-4.5";

export const App: React.FC = () => {
  const styles = useStyles();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<string>("");
  const [streamingText, setStreamingText] = useState<string>("");
  const [session, setSession] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [error, setError] = useState("");
  const [selectedModel, setSelectedModel] = useLocalStorage<ModelType>("word-addin-selected-model", DEFAULT_MODEL);
  const [showHistory, setShowHistory] = useState(false);
  const [showMcp, setShowMcp] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<ActiveTemplate | null>(null);
  const [mcpTools, setMcpTools] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [officeHost, setOfficeHost] = useState<OfficeHost>("word");
  const isDarkMode = useIsDarkMode();
  
  // Track session creation time
  const sessionCreatedAt = useRef<string>("");

  // Fetch MCP tools from connected servers
  const fetchMcpTools = async () => {
    try {
      const res = await fetch("/api/mcp/tools");
      const data = await res.json();
      setMcpTools(data.tools || []);
      return data.tools || [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    fetchMcpTools();
  }, []);

  // Save session whenever messages change (debounced effect)
  useEffect(() => {
    if (messages.length === 0 || !currentSessionId) return;
    
    // Only save if there's at least one user message
    const hasUserMessage = messages.some(m => m.sender === "user");
    if (!hasUserMessage) return;

    const savedSession: SavedSession = {
      id: currentSessionId,
      title: generateSessionTitle(messages),
      model: selectedModel,
      messages: messages,
      createdAt: sessionCreatedAt.current,
      updatedAt: new Date().toISOString(),
    };
    
    saveSession(officeHost, savedSession);
  }, [messages, currentSessionId, selectedModel, officeHost]);

  const startNewSession = async (model: ModelType, restoredMessages?: Message[], templateContent?: string) => {
    // Generate new session ID
    const newSessionId = crypto.randomUUID();
    setCurrentSessionId(newSessionId);
    sessionCreatedAt.current = new Date().toISOString();
    
    setMessages(restoredMessages || []);
    setInputValue("");
    setImages([]);
    setIsTyping(false);
    setCurrentActivity("");
    setStreamingText("");
    setError("");
    setShowHistory(false);
    setShowMcp(false);
    setShowTemplates(false);

    try {
      if (client) {
        await client.stop();
      }
      const host = Office.context.host;
      setOfficeHost(getHostFromOfficeHost(host));
      const officeTools = getToolsForHost(host);

      // Fetch current MCP tools and create handlers that proxy to server
      const currentMcpTools = await fetchMcpTools();
      const mcpToolDefs = currentMcpTools.map((t: any) => ({
        name: t.prefixedName,
        description: t.description || t.name,
        parameters: t.inputSchema || { type: "object", properties: {} },
        handler: async (params: any) => {
          try {
            const res = await fetch("/api/mcp/call", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ toolName: t.prefixedName, arguments: params.arguments }),
            });
            const data = await res.json();
            if (data.error) {
              return { textResultForLlm: `Error: ${data.error}`, resultType: "failure", error: data.error, toolTelemetry: {} };
            }
            // MCP tools return { content: [{ type, text }] }
            const text = data.result?.content?.map((c: any) => c.text || JSON.stringify(c)).join("\n") || JSON.stringify(data.result);
            return { textResultForLlm: text, resultType: "success", toolTelemetry: {} };
          } catch (e: any) {
            return { textResultForLlm: `Error: ${e.message}`, resultType: "failure", error: e.message, toolTelemetry: {} };
          }
        },
      }));

      console.log(`[session] ${officeTools.length} Office tools + ${mcpToolDefs.length} MCP tools`, mcpToolDefs.map(t => t.name));

      const tools = [...officeTools, ...mcpToolDefs];
      const newClient = await createWebSocketClient(`wss://${location.host}/api/copilot`);
      setClient(newClient);

      // Build host-specific system message
      const hostName = host === Office.HostType.PowerPoint ? "PowerPoint"
        : host === Office.HostType.Word ? "Word"
        : host === Office.HostType.Excel ? "Excel"
        : "Office";

      // Build MCP tools system message section grouped by server
      let mcpToolsSection = '';
      if (mcpToolDefs.length > 0) {
        const toolsByServer: Record<string, string[]> = {};
        for (const t of currentMcpTools) {
          const sid = t.serverId || 'unknown';
          if (!toolsByServer[sid]) toolsByServer[sid] = [];
          toolsByServer[sid].push(`- ${t.prefixedName}: ${t.description || t.name}`);
        }
        mcpToolsSection = `\n\nYou also have access to external MCP tools. Use them when the user asks about resources or capabilities beyond the ${hostName} document.\n\n`;
        for (const [sid, descs] of Object.entries(toolsByServer)) {
          mcpToolsSection += `MCP Server "${sid}":\n${descs.join('\n')}\n\n`;
        }
      }
      
      const systemMessage = {
        mode: "append" as const,
        content: `You are an AI assistant embedded inside Microsoft ${hostName} as an Office Add-in. You have direct access to the open ${hostName} document through the tools provided.

IMPORTANT: You are NOT a file system assistant. The user's document is already open in ${hostName}. Use your ${hostName} tools (like get_presentation_content, get_presentation_overview, get_slide_image, etc.) to read and modify the document directly. Do NOT search for files on disk or ask the user to provide file paths.

${host === Office.HostType.PowerPoint ? `For PowerPoint:
- Use get_presentation_overview first to see all slides and understand the deck structure
- Use get_presentation_content to read slide text (supports ranges like startIndex/endIndex for large decks)
- Use get_slide_image to capture a slide's visual design, colors, and layout
- The presentation is already open - just call the tools directly` : ''}

${host === Office.HostType.Word ? `For Word:
- Use get_document_content to read the document
- Use set_document_content to modify it
- The document is already open - just call the tools directly` : ''}

${host === Office.HostType.Excel ? `For Excel:
- Use get_workbook_info to understand the workbook structure
- Use get_workbook_content to read cell data
- The workbook is already open - just call the tools directly` : ''}

Always use your tools to interact with the document. Never ask users to save, export, or provide file paths.${mcpToolsSection}${templateContent ? `\n\n--- TEMPLATE INSTRUCTIONS ---\nThe user has selected a document template. Follow these instructions to build the document:\n\n${templateContent}` : ''}`
      };
      
      setSession(await newClient.createSession({ model, tools, systemMessage }));
    } catch (e: any) {
      setError(`Failed to create session: ${e.message}`);
    }
  };

  const handleRestoreSession = (savedSession: SavedSession) => {
    // Restore the session with its messages and model
    setCurrentSessionId(savedSession.id);
    sessionCreatedAt.current = savedSession.createdAt;
    setSelectedModel(savedSession.model);
    startNewSession(savedSession.model, savedSession.messages);
  };

  useEffect(() => {
    startNewSession(selectedModel);
  }, []);

  const handleModelChange = (newModel: ModelType) => {
    setSelectedModel(newModel);
    startNewSession(newModel);
  };

  // Like startNewSession, but returns the session object for immediate use
  const startNewSessionWithTemplate = async (model: ModelType, templateContent: string) => {
    const newSessionId = crypto.randomUUID();
    setCurrentSessionId(newSessionId);
    sessionCreatedAt.current = new Date().toISOString();
    setMessages([]);
    setError("");

    try {
      if (client) {
        await client.stop();
      }
      const host = Office.context.host;
      setOfficeHost(getHostFromOfficeHost(host));
      const officeTools = getToolsForHost(host);
      const currentMcpTools = await fetchMcpTools();
      const mcpToolDefs = currentMcpTools.map((t: any) => ({
        name: t.prefixedName,
        description: t.description || t.name,
        parameters: t.inputSchema || { type: "object", properties: {} },
        handler: async (params: any) => {
          try {
            const res = await fetch("/api/mcp/call", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ toolName: t.prefixedName, arguments: params.arguments }),
            });
            const data = await res.json();
            if (data.error) {
              return { textResultForLlm: `Error: ${data.error}`, resultType: "failure", error: data.error, toolTelemetry: {} };
            }
            const text = data.result?.content?.map((c: any) => c.text || JSON.stringify(c)).join("\n") || JSON.stringify(data.result);
            return { textResultForLlm: text, resultType: "success", toolTelemetry: {} };
          } catch (e: any) {
            return { textResultForLlm: `Error: ${e.message}`, resultType: "failure", error: e.message, toolTelemetry: {} };
          }
        },
      }));

      const tools = [...officeTools, ...mcpToolDefs];
      const newClient = await createWebSocketClient(`wss://${location.host}/api/copilot`);
      setClient(newClient);

      const hostName = host === Office.HostType.PowerPoint ? "PowerPoint"
        : host === Office.HostType.Word ? "Word"
        : host === Office.HostType.Excel ? "Excel"
        : "Office";

      let mcpToolsSection = '';
      if (mcpToolDefs.length > 0) {
        const toolsByServer: Record<string, string[]> = {};
        for (const t of currentMcpTools) {
          const sid = t.serverId || 'unknown';
          if (!toolsByServer[sid]) toolsByServer[sid] = [];
          toolsByServer[sid].push(`- ${t.prefixedName}: ${t.description || t.name}`);
        }
        mcpToolsSection = `\n\nYou also have access to external MCP tools. Use them when the user asks about resources or capabilities beyond the ${hostName} document.\n\n`;
        for (const [sid, descs] of Object.entries(toolsByServer)) {
          mcpToolsSection += `MCP Server "${sid}":\n${descs.join('\n')}\n\n`;
        }
      }

      const systemMessage = {
        mode: "append" as const,
        content: `You are an AI assistant embedded inside Microsoft ${hostName} as an Office Add-in. You have direct access to the open ${hostName} document through the tools provided.

IMPORTANT: You are NOT a file system assistant. The user's document is already open in ${hostName}. Use your ${hostName} tools to read and modify the document directly. Do NOT search for files on disk or ask the user to provide file paths.

Always use your tools to interact with the document. Never ask users to save, export, or provide file paths.${mcpToolsSection}

--- TEMPLATE INSTRUCTIONS ---
The user has selected a document template. Follow these instructions to build the document:

${templateContent}`
      };

      const newSession = await newClient.createSession({ model, tools, systemMessage });
      setSession(newSession);
      return newSession;
    } catch (e: any) {
      setError(`Failed to create session: ${e.message}`);
      return null;
    }
  };

  const handleSelectTemplate = (template: { id: string; name: string; icon: string }) => {
    setActiveTemplate({ id: template.id, name: template.name, icon: template.icon });
    setShowTemplates(false);
  };

  const handleSend = async () => {
    if ((!inputValue.trim() && images.length === 0) || !session) return;

    // If a template is active, restart the session with template content injected
    // and use the new session for the query
    let activeSession = session;
    if (activeTemplate) {
      try {
        const res = await fetch(`/api/templates/${encodeURIComponent(activeTemplate.id)}`);
        const data = await res.json();
        if (data.template?.content) {
          // Start a new session with template content - this returns the session
          const templateContent = data.template.content;
          setActiveTemplate(null);

          // Inline session creation with template content
          const newSessionResult = await startNewSessionWithTemplate(selectedModel, templateContent);
          if (newSessionResult) {
            activeSession = newSessionResult;
          }
        }
      } catch (e) {
        console.error("Failed to fetch template content:", e);
        setActiveTemplate(null);
      }
    }

    // Add user message with images
    setMessages((prev) => [...prev, {
      id: crypto.randomUUID(),
      text: inputValue || (images.length > 0 ? `Sent ${images.length} image${images.length > 1 ? 's' : ''}` : ''),
      sender: "user",
      timestamp: new Date(),
      images: images.length > 0 ? images.map(img => ({ dataUrl: img.dataUrl, name: img.name })) : undefined,
    }]);
    const userInput = inputValue;
    const userImages = [...images];
    setInputValue("");
    setImages([]);
    setIsTyping(true);
    setCurrentActivity("Processing...");
    setStreamingText("");
    setError("");

    try {
      // Upload images to server and get file paths
      const attachments: Array<{ type: "file", path: string, displayName?: string }> = [];
      
      for (const image of userImages) {
        try {
          const response = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              dataUrl: image.dataUrl,
              name: image.name 
            }),
          });
          
          if (!response.ok) {
            throw new Error(`Failed to upload image: ${response.statusText}`);
          }
          
          const result = await response.json();
          attachments.push({
            type: "file",
            path: result.path,
            displayName: image.name,
          });
        } catch (uploadError: any) {
          console.error('Image upload error:', uploadError);
          setError(`Failed to upload image: ${uploadError.message}`);
        }
      }

      for await (const event of activeSession.query({
        prompt: userInput || "Here are some images for you to analyze.",
        attachments: attachments.length > 0 ? attachments : undefined
      })) {
        console.log('[event]', event.type, event);
        
        if (event.type === 'assistant.message.delta') {
          // Streaming text chunk
          const delta = (event.data as any).delta || (event.data as any).content || '';
          setStreamingText(prev => prev + delta);
          setCurrentActivity("");
        } else if (event.type === 'assistant.message' && (event.data as any).content) {
          // Complete message - add to messages and clear streaming
          setStreamingText("");
          setCurrentActivity("");
          setMessages((prev) => [...prev, {
            id: event.id,
            text: (event.data as any).content,
            sender: "assistant",
            timestamp: new Date(event.timestamp),
          }]);
        } else if (event.type === 'tool.execution_start') {
          const toolName = (event.data as any).toolName;
          const toolArgs = (event.data as any).arguments || {};
          setCurrentActivity(`Calling ${toolName}...`);
          setMessages((prev) => [...prev, {
            id: event.id,
            text: JSON.stringify(toolArgs, null, 2),
            sender: "tool",
            toolName: toolName,
            toolArgs: toolArgs,
            timestamp: new Date(event.timestamp),
          }]);
        } else if (event.type === 'tool.execution_end') {
          setCurrentActivity("Processing result...");
        } else if (event.type === 'assistant.thinking') {
          setCurrentActivity("Thinking...");
        } else if (event.type === 'assistant.turn_start') {
          setCurrentActivity("Starting response...");
        } else if (event.type === 'assistant.turn_end') {
          setCurrentActivity("");
          setStreamingText("");
          console.log('[turn_end]', (event.data as any).stopReason);
        }
      }
      console.log('[query complete]');
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setIsTyping(false);
    }
  };

  // Show templates panel
  if (showTemplates) {
    return (
      <FluentProvider theme={isDarkMode ? webDarkTheme : webLightTheme}>
        <TemplatePanel
          onClose={() => setShowTemplates(false)}
          onSelectTemplate={handleSelectTemplate}
        />
      </FluentProvider>
    );
  }

  // Show MCP panel
  if (showMcp) {
    return (
      <FluentProvider theme={isDarkMode ? webDarkTheme : webLightTheme}>
        <McpPanel
          onClose={() => setShowMcp(false)}
          onToolsChanged={() => fetchMcpTools()}
        />
      </FluentProvider>
    );
  }

  // Show history panel
  if (showHistory) {
    return (
      <FluentProvider theme={isDarkMode ? webDarkTheme : webLightTheme}>
        <SessionHistory
          host={officeHost}
          onSelectSession={handleRestoreSession}
          onClose={() => setShowHistory(false)}
        />
      </FluentProvider>
    );
  }

  return (
    <FluentProvider theme={isDarkMode ? webDarkTheme : webLightTheme}>
      <div className={styles.container}>
        <HeaderBar
          onNewChat={() => { setActiveTemplate(null); startNewSession(selectedModel); }}
          onShowHistory={() => setShowHistory(true)}
          onShowMcp={() => setShowMcp(true)}
          onShowTemplates={() => setShowTemplates(true)}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
          mcpToolCount={mcpTools.length}
        />

        <MessageList
          messages={messages}
          isTyping={isTyping}
          isConnecting={!session && !error}
          currentActivity={currentActivity}
          streamingText={streamingText}
        />

        {error && <div style={{ color: 'red', padding: '8px' }}>{error}</div>}

        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          images={images}
          onImagesChange={setImages}
          activeTemplate={activeTemplate}
          onClearTemplate={() => setActiveTemplate(null)}
        />
      </div>
    </FluentProvider>
  );
};
