import React from 'react';
import { View, Text, TouchableOpacity, Platform, Alert, StyleSheet } from 'react-native';
// import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import Markdown from "react-native-markdown-display";
import { Entry, Expense, ActionItem } from '../types';
import { TextAnalyzer } from '../utils/textAnalysis';

interface MessageBubbleProps {
  entry: Entry;
  onLongPress: (entry: Entry) => void;
  onEdit?: (entry: Entry) => void;

  markdownStyles: any;
  expense?: Expense;
  actionItem?: ActionItem;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  entry,
  onLongPress,
  onEdit,
  markdownStyles,
  expense,
  actionItem,
}) => {
  const getBubbleStyle = () => {
    const baseStyles = [styles.messageBubble];
    const alignmentStyle = entry.type === 'system' ? styles.systemMessage : styles.userMessage;
    
    switch (entry.type) {
      case "expense":
        return [...baseStyles, styles.expenseBubble, alignmentStyle];
      case "action":
        return [...baseStyles, styles.actionBubble, alignmentStyle];
      case "system":
        return [...baseStyles, styles.systemBubble, alignmentStyle];
      default:
        return [...baseStyles, styles.defaultBubble, alignmentStyle];
    }
  };

  const getIcon = () => {
    switch (entry.type) {
      case "expense":
        return <Text style={{ fontSize: 16, color: "#2e7d32" }}>💰</Text>;
      case "action":
        return <Text style={{ fontSize: 16, color: "#1565c0" }}>✅</Text>;
      default:
        return null;
    }
  };

  const getCategoryLabel = () => {
    switch (entry.type) {
      case "expense":
        if (expense) {
          const prefix = expense.autoDetected ? '💰 Auto-categorized as Expense' : '💰 Manually categorized as Expense';
          return `${prefix}: ${TextAnalyzer.formatCurrency(expense.amount, expense.currency)}`;
        }
        return "💰 Expense";
      case "action":
        if (actionItem) {
          const prefix = actionItem.autoDetected ? '✅ Auto-categorized as Task' : '✅ Manually categorized as Task';
          return `${prefix}: ${actionItem.title}`;
        }
        return "✅ Task";
      default:
        return null;
    }
  };

  const handleNativeLongPress = () => {
    if (entry.type !== 'system') {
      Alert.alert(
        "Message Options",
        "Choose an action",
        [
          {
            text: "Copy",
            onPress: () => Alert.alert("Copy", "Text copied: " + entry.text.substring(0, 50) + "..."),
            style: "default"
          },
          {
            text: "Categorize",
            onPress: () => onLongPress(entry),
          },
          {
            text: "Cancel",
            style: "cancel"
          }
        ]
      );
    }
  };

  const MessageContent = () => (
    <View>
      <View style={styles.messageHeader}>
        {getIcon()}
        <Text style={styles.timestamp}>
          {format(entry.timestamp, "HH:mm")}
        </Text>
        {entry.type !== 'system' && (
          <View style={styles.actionButtons}>
            {onEdit && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => onEdit(entry)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.actionButtonText}>✏️</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      {entry.isMarkdown ? (
        <Markdown style={markdownStyles}>{entry.text}</Markdown>
      ) : (
        <Text 
          style={[
            styles.messageText,
            entry.type === 'system' 
              ? styles.systemMessageText 
              : entry.type === 'log'
                ? styles.userMessageText
                : styles.nonUserMessageText
          ]}
          selectable={Platform.OS === 'web'}
        >
          {entry.text}
        </Text>
      )}
      {entry.type !== "log" && entry.type !== "system" && (
        <Text style={styles.categoryLabel}>{getCategoryLabel()}</Text>
      )}
    </View>
  );

  const webStyles = Platform.OS === 'web' ? {
    style: {
      cursor: 'text',
      WebkitTouchCallout: 'none',
      WebkitUserSelect: 'text',
      MozUserSelect: 'text',
      msUserSelect: 'text',
      userSelect: 'text',
    } as any
  } : {};

  return (
    <View style={entry.type === 'system' ? styles.systemMessageContainer : styles.userMessageContainer}>
      <View style={getBubbleStyle()}>
        <MessageContent />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  userMessageContainer: {
    marginVertical: 1,
    alignSelf: 'flex-start',
    maxWidth: '95%',
  },
  systemMessageContainer: {
    marginVertical: 1,
    alignSelf: 'flex-end',
    maxWidth: '95%',
  },
  messageContainer: {
    marginVertical: 1,
    alignSelf: "flex-start",
    maxWidth: "95%",
  },
  messageBubble: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 60,
    maxWidth: "100%",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  defaultBubble: {
    backgroundColor: "#f0f0f0", // Light gray for user messages
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
  systemMessage: {
    backgroundColor: '#e3f2fd',
    marginLeft: '15%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 5,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 5,
  },
  userMessage: {
    backgroundColor: '#f0f0f0',
    marginRight: '15%',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 20,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 1,
    flexWrap: 'nowrap',
  },
  actionButtons: {
    flexDirection: "row",
    gap: 2,
    flexShrink: 0,
  },
  actionButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  actionButtonText: {
    fontSize: 14,
  },
  timestamp: {
    fontSize: 10,
    color: "#666",
    marginLeft: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 17,
    ...(Platform.OS === 'web' ? {
      userSelect: 'text',
      WebkitUserSelect: 'text',
    } as any : {}),
  },
  userMessageText: {
    color: "#333", // Dark text for user messages on light background
  },
  systemMessageText: {
    color: "#1565c0", // Darker blue for contrast on light background
    fontSize: 14,
    textAlign: "left",
    fontWeight: "500", // Slightly bolder for better readability
  },
  nonUserMessageText: {
    color: "#333",  // Dark text for action/expense messages
  },
  categoryLabel: {
    fontSize: 11,
    color: "#666",
    fontStyle: "italic",
    marginTop: 2,
  },
});
