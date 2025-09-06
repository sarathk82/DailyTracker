import React from 'react';
import { View, Text, TouchableOpacity, Platform, Alert, Clipboard } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import Markdown from "react-native-markdown-display";
import { Entry } from '../types';

interface MessageBubbleProps {
  entry: Entry;
  onLongPress: (entry: Entry) => void;
  styles: any;
  markdownStyles: any;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  entry,
  onLongPress,
  styles,
  markdownStyles,
}) => {
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
