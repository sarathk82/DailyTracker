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

  // Swipe gesture for delete (mobile only)
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !desktop && entry.type !== 'system',
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return !desktop && entry.type !== 'system' && Math.abs(gestureState.dx) > 5;
    },
    onPanResponderMove: (_, gestureState) => {
      // Only allow left swipe
      if (gestureState.dx < 0) {
        translateX.setValue(gestureState.dx);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx < -80) {
        // Swipe threshold reached - keep it swiped to show delete icon
        Animated.spring(translateX, {
          toValue: -80,
          useNativeDriver: true,
        }).start();
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
    <View style={{ flex: 1 }}>
      <View style={styles.messageHeader}>
        {getIcon()}
        <Text style={styles.timestamp}>
          {format(entry.timestamp, "HH:mm")}
        </Text>
        {entry.type !== 'system' && desktop && isHovered && (
          <View style={styles.actionButtons}>
            {onEdit && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => onEdit(entry)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.actionButtonText}>✏️ Edit</Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  if (Platform.OS === 'web') {
                    if (window.confirm('Are you sure you want to delete this entry?')) {
                      onDelete(entry);
                    }
                  } else {
                    Alert.alert(
                      'Delete Entry',
                      'Are you sure you want to delete this entry?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => onDelete(entry) },
                      ]
                    );
                  }
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.actionButtonText}>🗑️ Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      {entry.type !== 'system' && !desktop && (
        <Text style={styles.gestureHint}>Long press to edit • Swipe left to delete</Text>
      )}
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
      <View style={styles.bubbleWrapper}>
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            {
              flexDirection: 'row',
              transform: [{ translateX }],
            },
          ]}
          {...(desktop && entry.type !== 'system' ? {
            onMouseEnter: () => setIsHovered(true),
            onMouseLeave: () => setIsHovered(false),
          } : {})}
        >
          <TouchableOpacity
            activeOpacity={1}
            onLongPress={entry.type !== 'system' ? () => {
              if (onEdit) onEdit(entry);
            } : undefined}
            delayLongPress={500}
            disabled={desktop && entry.type !== 'system'}
            style={getBubbleStyle()}
          >
            <MessageContent />
          </TouchableOpacity>
          
          {/* Delete indicator (positioned to the right of bubble) */}
          {!desktop && entry.type !== 'system' && (
            <TouchableOpacity 
              style={styles.deleteIndicator}
              onPress={() => {
                if (onDelete) onDelete(entry);
                Animated.spring(translateX, {
                  toValue: 0,
                  useNativeDriver: true,
                }).start();
              }}
            >
              <Text style={{ fontSize: 24, color: '#f44336' }}>🗑️</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  userMessageContainer: {
    marginVertical: 4,
    alignSelf: 'flex-start',
    maxWidth: '90%',
    flexShrink: 0,
  },
  systemMessageContainer: {
    marginVertical: 4,
    alignSelf: 'flex-end',
    maxWidth: '90%',
    flexShrink: 0,
  },
  bubbleWrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  deleteIndicator: {
    position: 'absolute',
    right: -80,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  messageContainer: {
    marginVertical: 1,
    alignSelf: "flex-start",
    maxWidth: "95%",
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 200,
    maxWidth: '100%',
    alignSelf: 'flex-start',
    borderRadius: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.18)',
    } : {
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    }),
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
    marginBottom: 4,
    flexWrap: 'wrap',
    minWidth: 200,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 4,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  deleteButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  actionButtonText: {
    fontSize: 12,
  },
  gestureHint: {
    fontSize: 9,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 10,
    color: "#666",
    marginLeft: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    ...(Platform.OS === 'web' ? {
      userSelect: 'text',
      WebkitUserSelect: 'text',
      display: 'inline-block',
      minWidth: 'fit-content',
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
    flexShrink: 1,
    flexWrap: 'wrap',
  },
});
