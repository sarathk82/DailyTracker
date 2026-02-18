import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  ScrollView,
} from 'react-native';
import { format } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import { Entry, Expense, ActionItem } from '../types';
import { StorageService } from '../utils/storage';
import { TextAnalyzer } from '../utils/textAnalysis';

interface EditModalProps {
  visible: boolean;
  entry: Entry | null;
  expense?: Expense | null;
  actionItem?: ActionItem | null;
  onClose: () => void;
  onSave: () => void;
}

// Custom UUID function
const uuid = {
  v4: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

export const EditModal: React.FC<EditModalProps> = ({
  visible,
  entry,
  expense,
  actionItem,
  onClose,
  onSave,
}) => {
  const { theme } = useTheme();
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editText, setEditText] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDueDate, setEditDueDate] = useState<Date | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Track keyboard height
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Initialize form when entry changes
  useEffect(() => {
    if (entry) {
      setEditingEntry(entry);
      setEditText(entry.text.replace(/^✅\s*/, ''));
      
      // Pre-fill expense details
      if (entry.type === 'expense' && expense) {
        setEditAmount(expense.amount.toString());
        setEditCategory(expense.category || "");
      } else {
        setEditAmount("");
        setEditCategory("");
      }
      
      // Pre-fill action item details
      if (entry.type === 'action' && actionItem) {
        setEditDueDate(actionItem.dueDate ? new Date(actionItem.dueDate) : new Date());
      } else {
        setEditDueDate(new Date());
      }
    }
  }, [entry, expense, actionItem]);

  const handleClose = () => {
    setEditingEntry(null);
    setEditText("");
    setEditAmount("");
    setEditCategory("");
    setEditDueDate(null);
    onClose();
  };

  const removeCategory = async (entry: Entry) => {
    if (entry.type === 'expense' && expense) {
      await StorageService.deleteExpense(expense.id);
    }
    if (entry.type === 'action' && actionItem) {
      await StorageService.deleteActionItem(actionItem.id);
    }
  };

  const handleSave = async () => {
    if (!editingEntry || !editText.trim()) return;
    
    // Validate amount for expense entries
    if (editingEntry.type === 'expense') {
      if (!editAmount || !editAmount.trim()) {
        Alert.alert('Amount Required', 'Please enter an amount for the expense');
        return;
      }
      const amount = parseFloat(editAmount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
        return;
      }
    }
    
    try {
      // Update entry text and type
      const currentEntries = await StorageService.getEntries();
      const updatedEntries = currentEntries.map(e => 
        e.id === editingEntry.id 
          ? { ...e, text: editText.trim(), type: editingEntry.type, isMarkdown: editingEntry.isMarkdown } 
          : e
      );
      await StorageService.saveEntries(updatedEntries);
      
      // Update expense details
      if (editingEntry.type === 'expense') {
        const currentExpenses = await StorageService.getExpenses();
        let existingExpense = currentExpenses.find(e => e.entryId === editingEntry.id);
        
        if (existingExpense && editAmount) {
          const amount = parseFloat(editAmount);
          if (!isNaN(amount) && amount > 0) {
            await StorageService.updateExpense(existingExpense.id, {
              amount,
              category: editCategory || existingExpense.category,
              description: editText.trim(),
            });
          }
        } else if (!existingExpense && editAmount) {
          // Create new expense if it doesn't exist
          const amount = parseFloat(editAmount);
          if (!isNaN(amount) && amount > 0) {
            const newExpense: Expense = {
              id: uuid.v4(),
              entryId: editingEntry.id,
              amount,
              currency: 'USD',
              category: editCategory || 'Other',
              description: editText.trim(),
              createdAt: new Date(),
            };
            await StorageService.addExpense(newExpense);
          }
        }
      }
      
      // Update action item details
      if (editingEntry.type === 'action') {
        const extractedDueDate = TextAnalyzer.extractDueDate(editText.trim());
        const dueDate = extractedDueDate || editDueDate || new Date();
        
        const currentActionItems = await StorageService.getActionItems();
        let existingActionItem = currentActionItems.find(a => a.entryId === editingEntry.id);
        
        if (existingActionItem) {
          await StorageService.updateActionItem(existingActionItem.id, {
            title: editText.trim(),
            dueDate: dueDate,
          });
        } else {
          // Create new action item if it doesn't exist
          const newActionItem: ActionItem = {
            id: uuid.v4(),
            entryId: editingEntry.id,
            title: editText.trim(),
            description: editText.trim(),
            completed: false,
            createdAt: new Date(),
            dueDate: dueDate,
            autoDetected: false,
          };
          await StorageService.addActionItem(newActionItem);
        }
      }
      
      handleClose();
      onSave();
    } catch (error) {
      console.error('Error updating entry:', error);
      Alert.alert('Error', 'Failed to update entry');
    }
  };

  if (!editingEntry) return null;

  const dynamicStyles = createDynamicStyles(theme);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={dynamicStyles.editModalOverlay}>
          <View style={dynamicStyles.editModalContent}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <Text style={dynamicStyles.editModalTitle}>Edit Entry</Text>
              
              <Text style={dynamicStyles.editLabel}>Text:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <TouchableOpacity
                  style={[
                    dynamicStyles.markdownToggle,
                    editingEntry.isMarkdown && dynamicStyles.markdownToggleActive
                  ]}
                  onPress={() => setEditingEntry({ ...editingEntry, isMarkdown: !editingEntry.isMarkdown })}
                >
                  <Text style={dynamicStyles.markdownToggleText}>
                    {editingEntry.isMarkdown ? '✅ Markdown' : '❌ Plain Text'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={dynamicStyles.editTextInput}
                value={editText}
                onChangeText={setEditText}
                placeholder="Entry text"
                placeholderTextColor={theme.placeholder}
                multiline
                maxLength={1000}
              />
              
              <Text style={dynamicStyles.editLabel}>Category:</Text>
              <View style={dynamicStyles.categoryButtons}>
                <TouchableOpacity
                  style={[
                    dynamicStyles.categoryButton,
                    editingEntry.type === 'log' && dynamicStyles.categoryButtonActive
                  ]}
                  onPress={async () => {
                    if (editingEntry.type !== 'log') {
                      await removeCategory(editingEntry);
                      setEditingEntry({ ...editingEntry, type: 'log' });
                    }
                  }}
                >
                  <Text style={dynamicStyles.categoryButtonText}>📝 Log</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    dynamicStyles.categoryButton,
                    editingEntry.type === 'expense' && dynamicStyles.categoryButtonActive
                  ]}
                  onPress={async () => {
                    if (editingEntry.type !== 'expense') {
                      if (editingEntry.type === 'action') {
                        await removeCategory(editingEntry);
                      }
                      const expenseInfo = await TextAnalyzer.extractExpenseInfoAsync(editText, editingEntry.id);
                      if (expenseInfo) {
                        setEditAmount(expenseInfo.amount.toString());
                        setEditCategory(expenseInfo.category || "");
                      } else {
                        setEditAmount("");
                        setEditCategory("");
                      }
                      setEditingEntry({ ...editingEntry, type: 'expense' });
                    }
                  }}
                >
                  <Text style={dynamicStyles.categoryButtonText}>💰 Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    dynamicStyles.categoryButton,
                    editingEntry.type === 'action' && dynamicStyles.categoryButtonActive
                  ]}
                  onPress={async () => {
                    if (editingEntry.type !== 'action') {
                      if (editingEntry.type === 'expense') {
                        await removeCategory(editingEntry);
                        setEditAmount("");
                        setEditCategory("");
                      }
                      setEditingEntry({ ...editingEntry, type: 'action' });
                    }
                  }}
                >
                  <Text style={dynamicStyles.categoryButtonText}>✅ Task</Text>
                </TouchableOpacity>
              </View>
              
                  {editingEntry.type === 'expense' && (
                <>
                  <Text style={dynamicStyles.editLabel}>Amount:</Text>
                  <TextInput
                    style={dynamicStyles.editInput}
                    value={editAmount}
                    onChangeText={setEditAmount}
                    placeholder="Enter amount"
                    placeholderTextColor={theme.placeholder}
                    keyboardType="decimal-pad"
                  />
                  
                  <Text style={dynamicStyles.editLabel}>Category (optional):</Text>
                  <TextInput
                    style={dynamicStyles.editInput}
                    value={editCategory}
                    onChangeText={setEditCategory}
                    placeholder="Food, Transportation, etc."
                    placeholderTextColor={theme.placeholder}
                  />
                </>
              )}

                  {editingEntry.type === 'action' && (
                <>
                  <Text style={dynamicStyles.editLabel}>Due Date:</Text>
                  <View style={{ marginBottom: 12 }}>
                    {Platform.OS === 'web' && (
                      <input
                        type="date"
                        style={{
                          width: '100%',
                          padding: 12,
                          fontSize: 16,
                          borderRadius: 8,
                          border: '1px solid #ddd',
                          backgroundColor: theme.input,
                          color: theme.text,
                        }}
                        onChange={(e) => {
                          if (e.target.value) {
                            setEditDueDate(new Date(e.target.value));
                          }
                        }}
                        value={editDueDate ? format(editDueDate, 'yyyy-MM-dd') : ''}
                      />
                    )}
                  </View>
                </>
              )}
              
                  <View style={dynamicStyles.editModalButtons}>
                <TouchableOpacity
                  style={[dynamicStyles.editModalButton, dynamicStyles.editModalButtonCancel]}
                  onPress={handleClose}
                >
                  <Text style={dynamicStyles.editModalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[dynamicStyles.editModalButton, dynamicStyles.editModalButtonSave]}
                  onPress={handleSave}
                >
                  <Text style={[dynamicStyles.editModalButtonText, { color: theme.surface }]}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
        </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createDynamicStyles = (theme: any) => StyleSheet.create({
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModalContent: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 8,
  },
  editTextInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.text,
    backgroundColor: theme.input,
    marginBottom: 16,
    minHeight: 100,
    maxHeight: 200,
    textAlignVertical: 'top',
  },
  editInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.text,
    backgroundColor: theme.input,
    marginBottom: 16,
  },
  markdownToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: theme.cardBackground,
    borderWidth: 1,
    borderColor: theme.border,
  },
  markdownToggleActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  markdownToggleText: {
    fontSize: 12,
    color: theme.text,
  },
  categoryButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.cardBackground,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  editModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  editModalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  editModalButtonCancel: {
    backgroundColor: theme.cardBackground,
    borderWidth: 1,
    borderColor: theme.border,
  },
  editModalButtonSave: {
    backgroundColor: theme.primary,
  },
  editModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
});
