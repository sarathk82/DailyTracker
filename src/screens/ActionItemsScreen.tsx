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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import Markdown from 'react-native-markdown-display';

import { ActionItem } from '../types';
import { StorageService } from '../utils/storage';

interface ActionItemCardProps {
  item: ActionItem;
  onToggleComplete: (id: string) => void;
  onEdit: (item: ActionItem) => void;
  onDelete: (id: string) => void;
}

const ActionItemCard: React.FC<ActionItemCardProps> = ({
  item,
  onToggleComplete,
  onEdit,
  onDelete,
}) => {
  return (
    <View style={[styles.itemCard, item.completed && styles.completedCard]}>
      <TouchableOpacity
        style={styles.itemHeader}
        onPress={() => onToggleComplete(item.id)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={item.completed ? "checkbox" : "checkbox-outline"}
          size={24}
          color={item.completed ? "#4caf50" : "#666"}
        />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Markdown style={{
            body: {
              fontSize: 16,
              color: item.completed ? '#999' : '#333',
              textDecorationLine: item.completed ? 'line-through' : 'none',
            }
          }}>
            {item.title}
          </Markdown>
        </View>
      </TouchableOpacity>

      {item.description && item.description !== item.title && (
        <Text style={[styles.itemDescription, item.completed && styles.completedText]}>
          {item.description}
        </Text>
      )}

      <View style={styles.itemFooter}>
        <Text style={styles.itemDate}>
          Created: {format(item.createdAt, 'MMM d, yyyy HH:mm')}
        </Text>
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onEdit(item)}
            activeOpacity={0.7}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name="pencil" size={18} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
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
};

interface EditModalProps {
  visible: boolean;
  item: ActionItem | null;
  onSave: (item: ActionItem) => void;
  onCancel: () => void;
}

const EditModal: React.FC<EditModalProps> = ({ visible, item, onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description || '');
    }
  }, [item]);

  const handleSave = () => {
    if (!item || !title.trim()) return;

    const updatedItem: ActionItem = {
      ...item,
      title: title.trim(),
      description: description.trim(),
    };

    onSave(updatedItem);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Action Item</Text>

          <TextInput
            style={styles.modalInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            multiline
          />

          <TextInput
            style={[styles.modalInput, styles.modalInputLarge]}
            value={description}
            onChangeText={setDescription}
            placeholder="Description (optional)"
            multiline
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalButton} onPress={onCancel}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={handleSave}
            >
              <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const ActionItemsScreen: React.FC = () => {
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [editingItem, setEditingItem] = useState<ActionItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadActionItems = useCallback(async () => {
    const items = await StorageService.getActionItems();
    setActionItems(items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
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
    setModalVisible(true);
  };

  const handleSaveEdit = async (updatedItem: ActionItem) => {
    await StorageService.updateActionItem(updatedItem.id, {
      title: updatedItem.title,
      description: updatedItem.description,
    });

    setActionItems(prev =>
      prev.map(item => (item.id === updatedItem.id ? updatedItem : item))
    );

    setModalVisible(false);
    setEditingItem(null);
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

  const renderActionItem = ({ item }: { item: ActionItem }) => (
    <ActionItemCard
      item={item}
      onToggleComplete={handleToggleComplete}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );

  const getFilterButtonStyle = (filterType: typeof filter) => [
    styles.filterButton,
    filter === filterType && styles.filterButtonActive,
  ];

  const getFilterTextStyle = (filterType: typeof filter) => [
    styles.filterButtonText,
    filter === filterType && styles.filterButtonTextActive,
  ];

  const pendingCount = actionItems.filter(item => !item.completed).length;
  const completedCount = actionItems.filter(item => item.completed).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Action Items</Text>
        <View style={styles.stats}>
          <Text style={styles.statsText}>
            {pendingCount} pending • {completedCount} completed
          </Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
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

      {filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkbox-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {filter === 'all'
              ? 'No action items yet'
              : filter === 'pending'
              ? 'No pending action items'
              : 'No completed action items'}
          </Text>
          <Text style={styles.emptySubtext}>
            Add entries in your journal to create action items
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderActionItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <EditModal
        visible={modalVisible}
        item={editingItem}
        onSave={handleSaveEdit}
        onCancel={() => {
          setModalVisible(false);
          setEditingItem(null);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
    color: '#666',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  itemCard: {
    backgroundColor: '#fff',
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  completedCard: {
    backgroundColor: '#f8f8f8',
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
    color: '#333',
    marginLeft: 12,
    lineHeight: 20,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
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
    color: '#999',
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
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    borderColor: '#d32f2f',
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
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
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
    backgroundColor: '#fff',
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
    borderColor: '#e0e0e0',
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
    backgroundColor: '#f0f0f0',
  },
  modalButtonPrimary: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalButtonTextPrimary: {
    color: '#fff',
  },
});
