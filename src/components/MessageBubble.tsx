import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Alert, StyleSheet, Animated, PanResponder } from 'react-native';
// import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import Markdown from "react-native-markdown-display";
import { Entry, Expense, ActionItem } from '../types';
import { TextAnalyzer } from '../utils/textAnalysis';
import { isDesktop } from '../utils/platform';
import { useTheme } from '../contexts/ThemeContext';

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
  const { theme } = useTheme();
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
    const styles = getStyles(theme);
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
          const prefix = expense.autoDetected ? 'Auto-categorized as Expense' : 'Manually categorized as Expense';
          const amountStr = TextAnalyzer.formatCurrency(expense.amount, expense.currency);
          return `${prefix}: ${amountStr}`;
        }
        return "Expense";
      case "action":
        if (actionItem) {
          const prefix = actionItem.autoDetected ? 'Auto-categorized as Task' : 'Manually categorized as Task';
          return `${prefix}: ${actionItem.title}`;
        }
        return "Task";
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

  const MessageContent = () => {
    const styles = getStyles(theme);
    return (
    <View style={{ flex: 1, width: '100%' }}>
      <View style={styles.messageHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {getIcon()}
          <Text style={styles.timestamp}>
            {format(entry.timestamp, "HH:mm")}
          </Text>
        </View>
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
  };

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
    <View style={entry.type === 'system' ? getStyles(theme).systemMessageContainer : getStyles(theme).userMessageContainer}>
      <View style={getStyles(theme).bubbleWrapper}>
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
              style={getStyles(theme).deleteIndicator}
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

const getStyles = (theme: any) => StyleSheet.create({
  userMessageContainer: {
    marginVertical: 4,
    alignSelf: 'flex-start',
    maxWidth: '85%',
    flexShrink: 1,
    flexGrow: 0,
  },
  systemMessageContainer: {
    marginVertical: 4,
    alignSelf: 'flex-end',
    maxWidth: '85%',
    flexShrink: 1,
    flexGrow: 0,
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
    maxWidth: '100%',
    alignSelf: 'flex-start',
    borderRadius: 12,
    flexShrink: 1,
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
    backgroundColor: theme.input, // Using theme input color
  },
  expenseBubble: {
    backgroundColor: theme.success + '22',
    borderColor: theme.success,
    borderWidth: 1,
  },
  actionBubble: {
    backgroundColor: theme.info + '22',
    borderColor: theme.info,
    borderWidth: 1,
  },
  systemBubble: {
    backgroundColor: theme.info + '22',
    borderColor: theme.info,
    borderWidth: 1,
    borderRadius: 12,
  },
  systemMessage: {
    backgroundColor: theme.info + '22',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 5,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 5,
  },
  userMessage: {
    backgroundColor: theme.input,
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
    backgroundColor: theme.input,
  },
  deleteButton: {
    backgroundColor: theme.error + '22',
  },
  actionButtonText: {
    fontSize: 12,
  },
  gestureHint: {
    fontSize: 9,
    color: theme.textSecondary,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 10,
    color: theme.textSecondary,
    marginLeft: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    flexWrap: 'wrap',
    ...(Platform.OS === 'web' ? {
      userSelect: 'text',
      WebkitUserSelect: 'text',
      wordWrap: 'break-word',
      whiteSpace: 'pre-wrap',
      overflowWrap: 'break-word',
    } as any : {}),
  },
  userMessageText: {
    color: theme.text,
  },
  systemMessageText: {
    color: theme.info,
    fontSize: 14,
    textAlign: "left",
    fontWeight: "500",
    flexWrap: 'wrap',
    ...(Platform.OS === 'web' ? {
      wordWrap: 'break-word',
      whiteSpace: 'pre-wrap',
      overflowWrap: 'break-word',
    } as any : {}),
  },
  nonUserMessageText: {
    color: theme.text,
  },
  categoryLabel: {
    fontSize: 11,
    color: theme.textSecondary,
    fontStyle: "italic",
    marginTop: 2,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
});
