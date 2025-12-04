import * as React from "react";
import { useRef, useEffect } from "react";
import { Textarea, Button, Tooltip, makeStyles } from "@fluentui/react-components";
import { Send24Regular } from "@fluentui/react-icons";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isDarkMode: boolean;
  disabled?: boolean;
}

const useStyles = makeStyles({
  inputContainer: {
    margin: "16px",
    padding: "4px 6px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    borderRadius: "6px",
  },
  inputContainerLight: {
    backgroundColor: "white",
    border: "1px solid #d1d1d1",
  },
  inputContainerDark: {
    backgroundColor: "#252423",
    border: "1px solid #3b3a39",
  },
  input: {
    flex: 1,
    padding: "4px 8px",
    borderRadius: "0",
    border: "none !important",
    backgroundColor: "transparent",
    outline: "none !important",
    boxShadow: "none !important",
    "::after": {
      display: "none !important",
    },
  },
  sendButton: {
    width: "40px",
    height: "40px",
    minWidth: "40px",
    padding: "0",
    alignSelf: "flex-end",
    backgroundColor: "transparent",
    border: "none",
  },
});

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  isDarkMode,
  disabled = false,
}) => {
  const styles = useStyles();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className={`${styles.inputContainer} ${isDarkMode ? styles.inputContainerDark : styles.inputContainerLight}`}>
      <Textarea
        ref={inputRef}
        className={styles.input}
        value={value}
        onChange={(e, data) => onChange(data.value)}
        onKeyDown={handleKeyPress}
        placeholder="Type a message..."
        rows={2}
        disabled={disabled}
      />
      <Tooltip content="Send message" relationship="label">
        <Button
          appearance="primary"
          icon={<Send24Regular />}
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className={styles.sendButton}
        />
      </Tooltip>
    </div>
  );
};
