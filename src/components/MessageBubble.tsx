import React from 'react';
import { View, Text, TouchableOpacity, Platform, Alert, Clipboard, StyleSheet } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import Markdown from "react-native-markdown-display";
import { Entry } from '../types';

interface MessageBubbleProps {
  entry: Entry;
  onLongPress: (entry: Entry) => void;
  markdownStyles: any;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  entry,
  onLongPress,
  markdownStyles,
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

  const handleNativeLongPress = () => {
    if (entry.type !== 'system') {
      Alert.alert(
        "Message Options",
        "Choose an action",
        [
          {
            text: "Copy",
            onPress: () => Clipboard.setString(entry.text),
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

  return (
    <View style={entry.type === 'system' ? styles.systemMessageContainer : styles.messageContainer}>
      {Platform.OS === 'web' ? (
        <View 
          style={getBubbleStyle()}
          onTouchEnd={(e) => {
            const selection = window.getSelection();
            if (selection?.toString().length === 0 && entry.type !== 'system') {
              onLongPress(entry);
            }
          }}
        >
          <MessageContent />
        </View>
      ) : (
        <TouchableOpacity
          style={getBubbleStyle()}
          activeOpacity={0.7}
          onLongPress={handleNativeLongPress}
        >
          <MessageContent />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  userMessageContainer: {
    marginVertical: 4,
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  systemMessageContainer: {
    marginVertical: 4,
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  messageContainer: {
    marginVertical: 4,
    alignSelf: "flex-start",
    maxWidth: "80%",
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 60,
    maxWidth: "100%",
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
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
    alignSelf: 'flex-end',
    backgroundColor: '#fff',
    marginLeft: '15%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 5,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 5,
  },
  userMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
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
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 4,
  },
});
