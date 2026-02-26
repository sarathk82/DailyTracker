import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Alert, StyleSheet, Animated, PanResponder } from 'react-native';
import { format } from 'date-fns';
import Markdown from 'react-native-markdown-display';
import { Entry, Expense, ActionItem } from '../types';
import { TextAnalyzer } from '../utils/textAnalysis';
import { isDesktop } from '../utils/platform';
import { HighlightedText } from './HighlightedText';

interface MinimalEntryItemProps {
  item: Entry;
  expense?: Expense;
  actionItem?: ActionItem;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  markdownStyles: any;
  layoutStyles: any;
  searchQuery?: string;
  highlightIndex?: number;
}

export const MinimalEntryItem: React.FC<MinimalEntryItemProps> = React.memo(({
  item,
  expense,
  actionItem,
  onEdit,
  onDelete,
  markdownStyles,
  layoutStyles,
  searchQuery,
  highlightIndex,
}) => {
  const desktop = isDesktop();
  const [translateX] = useState(new Animated.Value(0));
  const [showTime, setShowTime] = useState(false);

  // Swipe gesture for delete (mobile only)
  const panResponder = !desktop ? PanResponder.create({
    onStartShouldSetPanResponder: () => item.type !== 'system',
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return item.type !== 'system' && Math.abs(gestureState.dx) > 5;
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
  }) : { panHandlers: {} };

  return (
    <View style={{ position: 'relative', overflow: 'hidden' }}>
      <Animated.View
        {...(!desktop ? panResponder.panHandlers : {})}
        style={[
          { flexDirection: 'row' },
          !desktop && { transform: [{ translateX }] },
        ]}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{ flex: 1 }}
          onPress={() => {
            // Toggle time visibility on tap
            if (!desktop) {
              setShowTime(!showTime);
            }
          }}
          onLongPress={() => {
            if (!desktop && item.type !== 'system') {
              onEdit(item);
            }
          }}
          delayLongPress={500}
          {...(desktop ? {
            onMouseEnter: () => setShowTime(true),
            onMouseLeave: () => setShowTime(false),
          } : {})}
        >
          <View style={layoutStyles.minimalContainer}>
          <View style={layoutStyles.minimalContent}>
            <View style={{ flex: 1, minWidth: 0, marginRight: 4 }}>
              {searchQuery && searchQuery.trim() ? (
                <HighlightedText
                  text={item.text}
                  searchQuery={searchQuery}
                  highlightIndex={highlightIndex}
                  baseStyle={layoutStyles.minimalText}
                />
              ) : item.isMarkdown ? (
                <Markdown style={markdownStyles}>{item.text}</Markdown>
              ) : (
                <Text style={layoutStyles.minimalText} numberOfLines={1} ellipsizeMode="tail">{item.text}</Text>
              )}
            </View>
            {expense && <Text style={{ fontSize: 14, flexShrink: 0 }}>💰</Text>}
            {actionItem && <Text style={{ fontSize: 14, flexShrink: 0 }}>✅</Text>}
          </View>
          <View style={layoutStyles.minimalMeta}>
            {showTime && (
              <Text style={layoutStyles.minimalTime}>{format(item.timestamp, 'h:mm a')}</Text>
            )}
            {item.type !== 'system' && desktop && (
              <>
                <TouchableOpacity 
                  style={{ padding: 2, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 4, marginLeft: 4 }}
                  onPress={() => onEdit(item)}
                >
                  <Text style={{ fontSize: 10 }}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ padding: 2, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 4, marginLeft: 2 }}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      if (window.confirm('Are you sure you want to delete this entry?')) {
                        onDelete(item);
                      }
                    } else {
                      Alert.alert(
                        'Delete Entry',
                        'Are you sure you want to delete this entry?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => onDelete(item) },
                        ]
                      );
                    }
                  }}
                >
                  <Text style={{ fontSize: 10 }}>🗑️</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          </View>
        </TouchableOpacity>
        
        {/* Delete indicator for mobile swipe */}
        {!desktop && item.type !== 'system' && (
          <TouchableOpacity 
            style={styles.deleteIndicator}
            onPress={() => {
              onDelete(item);
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
  );
});

const styles = StyleSheet.create({
  deleteIndicator: {
    position: 'absolute',
    right: -80,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
});