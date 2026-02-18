import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import Markdown from 'react-native-markdown-display';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';

import { ActionItem, Entry } from '../types';
import { StorageService } from '../utils/storage';
import { EditModal as UnifiedEditModal } from '../components/EditModal';
import { CreateActionItemModal } from '../components/CreateActionItemModal';

interface ActionItemCardProps {
  item: ActionItem;
  onToggleComplete: (id: string) => void;
  onEdit: (item: ActionItem) => void;
  onDelete: (id: string) => void;
  theme: any;
  dynamicStyles: any;
}

const ActionItemCard: React.FC<ActionItemCardProps> = ({
  item,
  onToggleComplete,
  onEdit,
  onDelete,
  theme,
  dynamicStyles,
}) => {
  const swipeableRef = React.useRef<Swipeable>(null);

  // Render right swipe action (complete)
  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[dynamicStyles.swipeAction, { transform: [{ scale }] }]}>
        <Ionicons name="checkmark-circle" size={30} color="#fff" />
        <Text style={dynamicStyles.swipeActionText}>Complete</Text>
      </Animated.View>
    );
  };

  const handleSwipeComplete = () => {
    if (!item.completed) {
      onToggleComplete(item.id);
    }
    swipeableRef.current?.close();
  };

  const cardContent = (
    <View style={[dynamicStyles.itemCard, item.completed && dynamicStyles.completedCard]}>
      <View style={dynamicStyles.itemHeader}>
        <TouchableOpacity
          onPress={() => onToggleComplete(item.id)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={item.completed ? "checkbox" : "checkbox-outline"}
            size={24}
            color={item.completed ? "#4caf50" : "#666"}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, marginLeft: 8 }}
          onPress={() => onEdit(item)}
          activeOpacity={0.7}
        >
          <Markdown style={{
            body: {
              fontSize: 16,
              color: item.completed ? theme.placeholder : theme.text,
              textDecorationLine: item.completed ? 'line-through' : 'none',
            }
          }}>
            {item.title}
          </Markdown>
        </TouchableOpacity>
      </View>

      {item.description && item.description !== item.title && (
        <Text style={[dynamicStyles.itemDescription, item.completed && dynamicStyles.completedText]}>
          {item.description}
        </Text>
      )}

      <View style={dynamicStyles.itemFooter}>
        <View>
          <Text style={dynamicStyles.itemDate}>
            Created: {format(item.createdAt, 'MMM d, yyyy HH:mm')}
          </Text>
          {item.dueDate && (
            <Text style={[
              dynamicStyles.itemDueDate,
              item.completed && dynamicStyles.completedText,
              new Date(item.dueDate) < new Date() && !item.completed && dynamicStyles.overdue
            ]}>
              Due: {format(new Date(item.dueDate), 'MMM d, yyyy')}
              {new Date(item.dueDate) < new Date() && !item.completed && ' (Overdue)'}
            </Text>
          )}
        </View>
        <View style={dynamicStyles.itemActions}>
          <TouchableOpacity
            style={dynamicStyles.actionButton}
            onPress={() => onEdit(item)}
            activeOpacity={0.7}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Text style={{ fontSize: 18 }}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[dynamicStyles.actionButton, dynamicStyles.deleteButton]}
            onPress={() => onDelete(item.id)}
            activeOpacity={0.7}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name="trash" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // On mobile: Enable swipe-to-complete gesture
  // On web/desktop: Just return the card (checkbox-only completion)
  if (Platform.OS === 'web') {
    return cardContent;
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      onSwipeableOpen={handleSwipeComplete}
      overshootRight={false}
      enabled={!item.completed}
    >
      {cardContent}
    </Swipeable>
  );
};

export const ActionItemsScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [editingItem, setEditingItem] = useState<ActionItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Keyboard handling state
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const loadActionItems = useCallback(async () => {
    const items = await StorageService.getActionItems();
    const allEntries = await StorageService.getEntries();
    setActionItems(items);
    setEntries(allEntries);
  }, []);

  // Load action items on initial mount
  useEffect(() => {
    loadActionItems();
  }, [loadActionItems]);

  // Refresh action items when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadActionItems();
    }, [loadActionItems])
  );

  // Keyboard listeners for better Android handling
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const filteredItems = actionItems.filter(item => {
    switch (filter) {
      case 'pending':
        return !item.completed;
      case 'completed':
        return item.completed;
      default:
        return true;
    }
  });

  // Group items by due date sections
  const getSectionForItem = (item: ActionItem) => {
    if (item.completed) return 'completed';
    
    if (!item.dueDate) return 'later';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay())); // End of current week (Saturday)
    
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(0, 0, 0, 0);
    
    const dueDate = new Date(item.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    if (dueDate < today) return 'overdue';
    if (dueDate.getTime() === today.getTime()) return 'today';
    if (dueDate <= endOfWeek) return 'this-week';
    if (dueDate <= endOfMonth) return 'this-month';
    return 'later';
  };

  const getSectionTitle = (section: string) => {
    switch (section) {
      case 'overdue': return '🔴 Overdue';
      case 'today': return '📅 Due Today';
      case 'this-week': return '📋 Due This Week';
      case 'this-month': return '🗓️ Due This Month';
      case 'later': return '📆 Due Later';
      case 'completed': return '✅ Completed';
      default: return '';
    }
  };

  const getSectionOrder = (section: string) => {
    const order = ['overdue', 'today', 'this-week', 'this-month', 'later', 'completed'];
    return order.indexOf(section);
  };

  // Group and sort items
  const groupedItems = filteredItems.reduce((acc, item) => {
    const section = getSectionForItem(item);
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {} as Record<string, ActionItem[]>);

  // Sort items within each section by due date
  Object.keys(groupedItems).forEach(section => {
    groupedItems[section].sort((a, b) => {
      if (section === 'completed' || section === 'no-date') {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }
      if (!a.dueDate || !b.dueDate) return 0;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  });

  // Create flat list with section headers
  const sectionsWithItems: Array<{ type: 'header'; title: string } | { type: 'item'; item: ActionItem }> = [];
  Object.keys(groupedItems)
    .sort((a, b) => getSectionOrder(a) - getSectionOrder(b))
    .forEach(section => {
      sectionsWithItems.push({ type: 'header', title: getSectionTitle(section) });
      groupedItems[section].forEach(item => {
        sectionsWithItems.push({ type: 'item', item });
      });
    });

  const handleToggleComplete = async (id: string) => {
    const item = actionItems.find(item => item.id === id);
    if (!item) return;

    const updatedItem = { ...item, completed: !item.completed };
    await StorageService.updateActionItem(id, { completed: !item.completed });
    
    setActionItems(prev =>
      prev.map(item => (item.id === id ? updatedItem : item))
    );
  };

  const handleEdit = (item: ActionItem) => {
    setEditingItem(item);
    setIsCreating(false);
    setModalVisible(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setIsCreating(true);
    setModalVisible(true);
  };

  const handleSaveEdit = async () => {
    await loadActionItems();
    setModalVisible(false);
    setEditingItem(null);
    setIsCreating(false);
  };

  const handleDelete = async (id: string) => {
    // Use window.confirm for web compatibility instead of Alert.alert
    const confirmed = typeof window !== 'undefined' 
      ? window.confirm('Are you sure you want to delete this action item?')
      : true; // On mobile, proceed directly
    
    if (confirmed) {
      try {
        await StorageService.deleteActionItem(id);
        setActionItems(prev => prev.filter(item => item.id !== id));
      } catch (error) {
        console.error('Error deleting action item:', error);
      }
    }
  };

  const renderItem = ({ item }: { item: { type: 'header'; title: string } | { type: 'item'; item: ActionItem } }) => {
    if (item.type === 'header') {
      return (
        <View style={dynamicStyles.sectionHeader}>
          <Text style={dynamicStyles.sectionHeaderText}>{item.title}</Text>
        </View>
      );
    }
    return (
      <ActionItemCard
        item={item.item}
        onToggleComplete={handleToggleComplete}
        onEdit={handleEdit}
        onDelete={handleDelete}
        theme={theme}
        dynamicStyles={dynamicStyles}
      />
    );
  };

  const getFilterButtonStyle = (filterType: typeof filter) => [
    dynamicStyles.filterButton,
    filter === filterType && dynamicStyles.filterButtonActive,
  ];

  const getFilterTextStyle = (filterType: typeof filter) => [
    dynamicStyles.filterButtonText,
    filter === filterType && dynamicStyles.filterButtonTextActive,
  ];

  const pendingCount = actionItems.filter(item => !item.completed).length;
  const completedCount = actionItems.filter(item => item.completed).length;

  const dynamicStyles = getStyles(theme);

  const content = (
    <SafeAreaView style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <View>
          <Text style={dynamicStyles.headerTitle}>Action Items</Text>
          <View style={dynamicStyles.stats}>
            <Text style={dynamicStyles.statsText}>
              {pendingCount} pending • {completedCount} completed
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={dynamicStyles.addButton}
          onPress={handleCreate}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color={theme.surface} />
        </TouchableOpacity>
      </View>

      <View style={dynamicStyles.filterContainer}>
        <TouchableOpacity
          style={getFilterButtonStyle('all')}
          onPress={() => setFilter('all')}
        >
          <Text style={getFilterTextStyle('all')}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={getFilterButtonStyle('pending')}
          onPress={() => setFilter('pending')}
        >
          <Text style={getFilterTextStyle('pending')}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={getFilterButtonStyle('completed')}
          onPress={() => setFilter('completed')}
        >
          <Text style={getFilterTextStyle('completed')}>Completed</Text>
        </TouchableOpacity>
      </View>

      {sectionsWithItems.length === 0 ? (
        <View style={dynamicStyles.emptyContainer}>
          <Ionicons name="checkbox-outline" size={64} color="#ccc" />
          <Text style={dynamicStyles.emptyText}>
            {filter === 'all'
              ? 'No action items yet'
              : filter === 'pending'
              ? 'No pending action items'
              : 'No completed action items'}
          </Text>
          <Text style={dynamicStyles.emptySubtext}>
            Add entries in your journal to create action items
          </Text>
        </View>
      ) : (
        <FlatList
          data={sectionsWithItems}
          renderItem={renderItem}
          keyExtractor={(item, index) => 
            item.type === 'header' ? `header-${index}` : `item-${item.item.id}`
          }
          style={dynamicStyles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <UnifiedEditModal
        visible={modalVisible && !isCreating}
        entry={editingItem ? entries.find(e => e.id === editingItem.entryId) || null : null}
        actionItem={editingItem}
        onClose={() => {
          setModalVisible(false);
          setEditingItem(null);
        }}
        onSave={handleSaveEdit}
      />

      <CreateActionItemModal
        visible={modalVisible && isCreating}
        onClose={() => {
          setModalVisible(false);
          setIsCreating(false);
        }}
        onSave={handleSaveEdit}
      />
    </SafeAreaView>
  );

  // Wrap in GestureHandlerRootView for mobile (needed for swipe gestures)
  if (Platform.OS === 'web') {
    return content;
  }

  return <GestureHandlerRootView style={{ flex: 1 }}>{content}</GestureHandlerRootView>;
};

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 4,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: theme.input,
  },
  filterButtonActive: {
    backgroundColor: theme.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: theme.surface,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemCard: {
    backgroundColor: theme.surface,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    shadowColor: theme.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  completedCard: {
    backgroundColor: theme.input,
    opacity: 0.8,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginLeft: 12,
    lineHeight: 20,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: theme.textSecondary,
  },
  itemDescription: {
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
    marginLeft: 36,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  itemDate: {
    fontSize: 12,
    color: theme.placeholder,
  },
  itemDueDate: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  overdue: {
    color: '#f44336',
    fontWeight: '600',
  },
  itemActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 10,
    marginLeft: 8,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: theme.input,
    borderWidth: 1,
    borderColor: theme.border,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    borderColor: '#d32f2f',
  },
  swipeAction: {
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginVertical: 6,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  swipeActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.placeholder,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    minHeight: 44,
  },
  modalInputLarge: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dueDateContainer: {
    marginBottom: 12,
  },
  dueDateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 8,
  },
  dueDateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearDateButton: {
    marginLeft: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f44336',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearDateButtonText: {
    color: theme.surface,
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: theme.input,
  },
  modalButtonPrimary: {
    backgroundColor: theme.primary,
  },
  modalButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  modalButtonTextPrimary: {
    color: theme.surface,
  },
});
