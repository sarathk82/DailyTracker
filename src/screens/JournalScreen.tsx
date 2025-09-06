import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Clipboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import { format } from "date-fns";
import uuid from "react-native-uuid";

import { Entry } from "../types";
import { StorageService } from "../utils/storage";
import { TextAnalyzer } from "../utils/textAnalysis";

interface MessageBubbleProps {
  entry: Entry;
  onLongPress: (entry: Entry) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ entry, onLongPress }) => {
  const getBubbleStyle = () => {
    switch (entry.type) {
      case "expense":
        return [styles.messageBubble, styles.expenseBubble];
      case "action":
        return [styles.messageBubble, styles.actionBubble];
      case "system":
        return [styles.messageBubble, styles.systemBubble];
      default:
        return [styles.messageBubble, styles.defaultBubble];
    }
  };

  const getIcon = () => {
    switch (entry.type) {
      case "expense":
        return <Ionicons name="cash-outline" size={16} color="#2e7d32" />;
      case "action":
        return <Ionicons name="checkbox-outline" size={16} color="#1565c0" />;
      default:
        return null;
    }
  };

  const getCategoryLabel = () => {
    switch (entry.type) {
      case "expense":
        return "Auto-categorized as Expense";
      case "action":
        return "Auto-categorized as Action Item";
      default:
        return null;
    }
  };

  return (
    <TouchableOpacity 
      style={getBubbleStyle()}
      activeOpacity={0.7}
      onLongPress={() => entry.type !== 'system' && onLongPress(entry)}
    >
      <View style={styles.messageHeader}>
        {getIcon()}
        <Text style={styles.timestamp}>
          {format(entry.timestamp, "HH:mm")}
        </Text>
      </View>
      {entry.isMarkdown ? (
        <Markdown>{entry.text}</Markdown>
      ) : (
        <Text style={styles.messageText}>
          {entry.text}
        </Text>
      )}
      {entry.type !== "log" && entry.type !== "system" && (
        <Text style={styles.categoryLabel}>{getCategoryLabel()}</Text>
      )}
    </TouchableOpacity>
  );
};

// MessageBubble component...

export const JournalScreen: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [inputText, setInputText] = useState("");
  const [isMarkdown, setIsMarkdown] = useState(false);

  const loadEntries = useCallback(async () => {
    const savedEntries = await StorageService.getEntries();
    setEntries(
      savedEntries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    );
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const showToast = (message: string) => {
    alert(message);
  };

  const addSystemMessage = (message: string) => {
    const systemEntry: Entry = {
      id: uuid.v4() as string,
      text: message,
      timestamp: new Date(),
      type: "system",
      isMarkdown: false,
    };
    StorageService.addEntry(systemEntry);
    setEntries((prev) => [...prev, systemEntry]);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const entry: Entry = {
      id: uuid.v4() as string,
      text: inputText.trim(),
      timestamp: new Date(),
      type: "log",
      isMarkdown,
    };

    // Analyze text for expense or action item
    const isExpense = TextAnalyzer.detectExpense(inputText);
    const isActionItem = TextAnalyzer.detectActionItem(inputText);

    // First add the user's message
    await StorageService.addEntry(entry);
    setEntries((prev) => [...prev, entry]);

    // Then process and add any system messages
    if (isExpense) {
      entry.type = "expense";
      const expenseInfo = TextAnalyzer.extractExpenseInfo(inputText, entry.id);
      if (expenseInfo) {
        await StorageService.addExpense(expenseInfo);
        addSystemMessage(
          `💰 Added expense: ${TextAnalyzer.formatCurrency(expenseInfo.amount, expenseInfo.currency)}`
        );
      } else {
        addSystemMessage("💰 Detected as expense but couldn't extract amount");
      }
    } else if (isActionItem) {
      entry.type = "action";
      const actionItem = TextAnalyzer.extractActionItem(inputText, entry.id);
      if (actionItem) {
        await StorageService.addActionItem(actionItem);
        addSystemMessage(`✅ Added action item: ${actionItem.title}`);
      } else {
        addSystemMessage("✅ Detected as action item but couldn't extract details");
      }
    }

    setInputText("");
  };

  const handleLongPress = (entry: Entry) => {
    Alert.alert("Entry Options", "What would you like to do with this entry?", [
      {
        text: "Mark as Expense",
        onPress: () => markAsExpense(entry),
        style: entry.type === "expense" ? "cancel" : "default",
      },
      {
        text: "Mark as Action Item",
        onPress: () => markAsActionItem(entry),
        style: entry.type === "action" ? "cancel" : "default",
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  const markAsExpense = async (entry: Entry) => {
    if (entry.type === "expense") return;

    const expenseInfo = TextAnalyzer.extractExpenseInfo(entry.text, entry.id);
    if (expenseInfo) {
      await StorageService.addExpense(expenseInfo);
      await updateEntryType(entry.id, "expense");
      // Add system message after the entry is updated
      addSystemMessage(
        `💰 Manually categorized as expense: ${TextAnalyzer.formatCurrency(expenseInfo.amount, expenseInfo.currency)}`
      );
    } else {
      Alert.alert(
        "Cannot Extract Expense",
        "Could not find amount information in this entry. Please ensure it contains a monetary value."
      );
    }
  };

  const markAsActionItem = async (entry: Entry) => {
    if (entry.type === "action") return;

    const actionItem = TextAnalyzer.extractActionItem(entry.text, entry.id);
    if (actionItem) {
      await StorageService.addActionItem(actionItem);
      await updateEntryType(entry.id, "action");
      // Add system message after the entry is updated
      addSystemMessage(`✅ Manually categorized as action item: ${actionItem.title}`);
    }
  };

  const updateEntryType = async (entryId: string, newType: Entry["type"]) => {
    const updatedEntries = entries.map((entry) =>
      entry.id === entryId ? { ...entry, type: newType } : entry
    );
    setEntries(updatedEntries);
    await StorageService.saveEntries(updatedEntries);
  };

  const renderEntry = ({ item }: { item: Entry }) => (
    <MessageBubble entry={item} onLongPress={handleLongPress} />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Daily Journal</Text>
        <TouchableOpacity
          style={[
            styles.markdownToggle,
            isMarkdown && styles.markdownToggleActive,
          ]}
          onPress={() => setIsMarkdown(!isMarkdown)}
        >
          <Text
            style={[
              styles.markdownToggleText,
              isMarkdown && styles.markdownToggleTextActive,
            ]}
          >
            MD
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={entries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        showsVerticalScrollIndicator={false}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder={
            isMarkdown
              ? "Type a message (Markdown supported)..."
              : "Type a message..."
          }
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !inputText.trim() && styles.sendButtonDisabled,
          ]}
          onPress={handleSendMessage}
          disabled={!inputText.trim()}
        >
          <Ionicons name="send" size={24} color="#fff" />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  markdownToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#e0e0e0",
  },
  markdownToggleActive: {
    backgroundColor: "#007AFF",
  },
  markdownToggleText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#666",
  },
  markdownToggleTextActive: {
    color: "#fff",
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageContainer: {
    marginVertical: 4,
    alignSelf: "flex-start",
    maxWidth: "80%",
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  systemMessageContainer: {
    marginVertical: 4,
    alignSelf: "flex-end",
    maxWidth: "80%",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    minWidth: 60,
    maxWidth: "100%",
    ...(Platform.OS === 'web' ? {
      cursor: "text",
      WebkitTouchCallout: "default",
      WebkitUserSelect: "text",
      MozUserSelect: "text",
      msUserSelect: "text",
      userSelect: "text",
    } : {}),
  },
  defaultBubble: {
    backgroundColor: "#f0f0f0",  // Light gray for user messages
  },
  expenseBubble: {
    backgroundColor: "#e8f5e8",
    borderColor: "#4caf50",
    borderWidth: 1,
  },
  actionBubble: {
    backgroundColor: "#e3f2fd",
    borderColor: "#2196f3",
    borderWidth: 1,
  },
  systemBubble: {
    backgroundColor: "#e3f2fd", // Light blue for system messages
    borderColor: "#2196f3",
    borderWidth: 1,
    borderRadius: 12,
  },
  systemMessageText: {
    color: "#1565c0", // Darker blue for contrast on light background
    fontSize: 14,
    textAlign: "left",
    fontWeight: "500", // Slightly bolder for better readability
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 11,
    color: "#666",
    marginLeft: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    ...(Platform.OS === 'web' ? {
      userSelect: 'text',
      WebkitUserSelect: 'text',
    } as any : {}),
  },
  userMessageText: {
    color: "#333", // Dark text for user messages on light background
  },
  nonUserMessageText: {
    color: "#333",  // Dark text for action/expense messages
  },
  categoryLabel: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: "#f8f8f8",
  },
  sendButton: {
    backgroundColor: "#007AFF",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#ccc",
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 16,
    color: "#333",
    lineHeight: 20,
  },
  heading1: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  heading2: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
  },
  strong: {
    fontWeight: "bold",
  },
  em: {
    fontStyle: "italic",
  },
  code_inline: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    fontFamily: "monospace",
  },
});
