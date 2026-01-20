import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Alert, StyleSheet, Animated, PanResponder } from 'react-native';
// import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import Markdown from "react-native-markdown-display";
import { Entry, Expense, ActionItem } from '../types';
import { TextAnalyzer } from '../utils/textAnalysis';
import { isDesktop } from '../utils/platform';

interface MessageBubbleProps {
  entry: Entry;
  onLongPress: (entry: Entry) => void;
  onEdit?: (entry: Entry) => void;
  onDelete?: (entry: Entry) => void;
  markdownStyles: any;
  expense?: Expense;
  actionItem?: ActionItem;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  entry,
  onLongPress,
  onEdit,
  onDelete,
  markdownStyles,
  expense,
  actionItem,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [translateX] = useState(new Animated.Value(0));
  const desktop = isDesktop();

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !desktop && entry.type !== 'system',
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return !desktop && entry.type !== 'system' && Math.abs(gestureState.dx) > 10;
    },
    onPanResponderMove: (_, gestureState) => {
      // Only allow left swipe (negative dx) for delete
      if (gestureState.dx < 0) {
        translateX.setValue(Math.max(gestureState.dx, -100));
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx < -80 && onDelete) {
        // Swipe threshold reached - delete
        Alert.alert(
          "Delete Entry",
          "Are you sure you want to delete this entry?",
          [
            { text: "Cancel", style: "cancel", onPress: () => {
              Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: true,
              }).start();
            }},
            { text: "Delete", style: "destructive", onPress: () => onDelete(entry) }
          ]
        );
      } else {
        // Snap back
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

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
    if (entry.type !== 'system' && onEdit) {
      onEdit(entry);
    }
  };

  const handleDesktopClick = () => {
    if (desktop && entry.type !== 'system' && onEdit) {
      onEdit(entry);
    }
  };

  const handleMouseEnter = () => {
    if (desktop && Platform.OS === 'web') {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (desktop && Platform.OS === 'web') {
      setIsHovered(false);
    }
  };

  const MessageContent = () => (
    <View>
      <View style={styles.messageHeader}>
        {getIcon()}
        <Text style={styles.timestamp}>
          {format(entry.timestamp, "HH:mm")}
        </Text>
        {/* Desktop hover actions */}
        {desktop && isHovered && entry.type !== 'system' && (
          <View style={styles.desktopActionButtons}>
            {onEdit && (
              <TouchableOpacity 
                style={styles.desktopActionButton}
                onPress={() => onEdit(entry)}
              >
                <Text style={styles.actionButtonText}>✏️ Edit</Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity 
                style={[styles.desktopActionButton, styles.deleteButton]}
                onPress={() => {
                  Alert.alert(
                    "Delete Entry",
                    "Are you sure you want to delete this entry?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => onDelete(entry) }
                    ]
                  );
                }}
              >
                <Text style={styles.actionButtonText}>🗑️ Delete</Text>
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
      {/* Mobile swipe instruction */}
      {!desktop && entry.type !== 'system' && (
        <Text style={styles.gestureHint}>Long press to edit • Swipe left to delete</Text>
      )}
    </View>
  );

  const webStyles = Platform.OS === 'web' ? {
    style: {
      cursor: desktop ? 'pointer' : 'text',
      WebkitTouchCallout: 'none',
      WebkitUserSelect: desktop ? 'none' : 'text',
      MozUserSelect: desktop ? 'none' : 'text',
      msUserSelect: desktop ? 'none' : 'text',
      userSelect: desktop ? 'none' : 'text',
    } as any,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  } : {};

  const bubbleContent = (
    <Animated.View 
      style={[
        getBubbleStyle(),
        !desktop && { transform: [{ translateX }] }
      ]}
      {...webStyles}
    >
      <MessageContent />
    </Animated.View>
  );

  return (
    <View 
      style={entry.type === 'system' ? styles.systemMessageContainer : styles.userMessageContainer}
      {...(!desktop && entry.type !== 'system' ? panResponder.panHandlers : {})}
    >
      {desktop ? (
        <TouchableOpacity 
          onPress={handleDesktopClick}
          activeOpacity={0.9}
        >
          {bubbleContent}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          onLongPress={handleNativeLongPress}
          delayLongPress={500}
          activeOpacity={1}
        >
          {bubbleContent}
        </TouchableOpacity>
      )}
      {/* Swipe delete indicator */}
      {!desktop && entry.type !== 'system' && (
        <View style={styles.deleteIndicator}>
          <Text style={styles.deleteIndicatorText}>🗑️</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  userMessageContainer: {
    marginVertical: 1,
    alignSelf: 'flex-start',
    maxWidth: '95%',
    position: 'relative',
  },
  systemMessageContainer: {
    marginVertical: 1,
    alignSelf: 'flex-end',
    maxWidth: '95%',
    position: 'relative',
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
    flexWrap: 'wrap',
  },
  actionButtons: {
    flexDirection: "row",
    gap: 2,
    flexShrink: 0,
  },
  desktopActionButtons: {
    flexDirection: "row",
    gap: 4,
    marginLeft: 8,
  },
  actionButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  desktopActionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  deleteButton: {
    backgroundColor: "rgba(244, 67, 54, 0.1)",
  },
  actionButtonText: {
    fontSize: 12,
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
  gestureHint: {
    fontSize: 9,
    color: "#999",
    fontStyle: "italic",
    marginTop: 4,
  },
  deleteIndicator: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  deleteIndicatorText: {
    fontSize: 24,
    color: 'white',
  },
});
