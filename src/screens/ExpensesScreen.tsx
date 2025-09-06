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
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

import { Expense } from '../types';
import { StorageService } from '../utils/storage';
import { TextAnalyzer } from '../utils/textAnalysis';

interface ExpenseCardProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

const ExpenseCard: React.FC<ExpenseCardProps> = ({ expense, onEdit, onDelete }) => {
  return (
    <View style={styles.expenseCard}>
      <View style={styles.expenseHeader}>
        <View style={styles.expenseAmount}>
          <Text style={styles.amountText}>
            {TextAnalyzer.formatCurrency(expense.amount, expense.currency)}
          </Text>
          {expense.category && (
            <Text style={styles.categoryText}>{expense.category}</Text>
          )}
        </View>
        <View style={styles.expenseActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onEdit(expense)}
          >
            <Ionicons name="pencil" size={16} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onDelete(expense.id)}
          >
            <Ionicons name="trash" size={16} color="#f44336" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.expenseDescription} numberOfLines={2}>
        {expense.description}
      </Text>

      <Text style={styles.expenseDate}>
        {format(expense.createdAt, 'MMM d, yyyy HH:mm')}
      </Text>
    </View>
  );
};

interface EditExpenseModalProps {
  visible: boolean;
  expense: Expense | null;
  onSave: (expense: Expense) => void;
  onCancel: () => void;
}

const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  visible,
  expense,
  onSave,
  onCancel,
}) => {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  const currencies = ['USD', 'INR', 'EUR', 'GBP'];
  const categories = [
    'Food', 'Transportation', 'Shopping', 'Entertainment', 'Bills',
    'Healthcare', 'Education', 'Travel', 'Other'
  ];

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString());
      setCurrency(expense.currency);
      setDescription(expense.description);
      setCategory(expense.category || '');
    }
  }, [expense]);

  const handleSave = () => {
    if (!expense || !amount.trim() || !description.trim()) return;

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
      return;
    }

    const updatedExpense: Expense = {
      ...expense,
      amount: numericAmount,
      currency,
      description: description.trim(),
      category: category.trim() || undefined,
    };

    onSave(updatedExpense);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Expense</Text>

          <TextInput
            style={styles.modalInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="Amount"
            keyboardType="numeric"
          />

          <View style={styles.currencyContainer}>
            <Text style={styles.inputLabel}>Currency:</Text>
            <View style={styles.currencyOptions}>
              {currencies.map((curr) => (
                <TouchableOpacity
                  key={curr}
                  style={[
                    styles.currencyButton,
                    currency === curr && styles.currencyButtonActive,
                  ]}
                  onPress={() => setCurrency(curr)}
                >
                  <Text
                    style={[
                      styles.currencyButtonText,
                      currency === curr && styles.currencyButtonTextActive,
                    ]}
                  >
                    {curr}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TextInput
            style={[styles.modalInput, styles.modalInputLarge]}
            value={description}
            onChangeText={setDescription}
            placeholder="Description"
            multiline
          />

          <View style={styles.categoryContainer}>
            <Text style={styles.inputLabel}>Category (optional):</Text>
            <View style={styles.categoryOptions}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    category === cat && styles.categoryButtonActive,
                  ]}
                  onPress={() => setCategory(category === cat ? '' : cat)}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      category === cat && styles.categoryButtonTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

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

export const ExpensesScreen: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filter, setFilter] = useState<'all' | 'thisMonth'>('all');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadExpenses = useCallback(async () => {
    const expenseList = await StorageService.getExpenses();
    setExpenses(expenseList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
  }, []);

  // Load expenses on initial mount
  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Refresh expenses when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [loadExpenses])
  );

  const filteredExpenses = expenses.filter(expense => {
    if (filter === 'thisMonth') {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      return isWithinInterval(expense.createdAt, { start: monthStart, end: monthEnd });
    }
    return true;
  });

  interface TotalAmount {
    currency: string;
    amount: number;
    formatted: string;
  }

  const getTotalAmount = (expenseList: Expense[]): TotalAmount[] => {
    if (expenseList.length === 0) {
      return [];
    }

    const totals: Record<string, number> = {};
    
    // Group expenses by currency and sum amounts
    expenseList.forEach(expense => {
      totals[expense.currency] = (totals[expense.currency] || 0) + expense.amount;
    });

    // Convert totals to array of TotalAmount objects
    return Object.keys(totals).map((currency): TotalAmount => ({
      currency,
      amount: totals[currency],
      formatted: TextAnalyzer.formatCurrency(totals[currency], currency)
    }));
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setModalVisible(true);
  };

  const handleSaveEdit = async (updatedExpense: Expense) => {
    await StorageService.updateExpense(updatedExpense.id, {
      amount: updatedExpense.amount,
      currency: updatedExpense.currency,
      description: updatedExpense.description,
      category: updatedExpense.category,
    });

    setExpenses(prev =>
      prev.map(expense => (expense.id === updatedExpense.id ? updatedExpense : expense))
    );

    setModalVisible(false);
    setEditingExpense(null);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await StorageService.deleteExpense(id);
            setExpenses(prev => prev.filter(expense => expense.id !== id));
          },
        },
      ]
    );
  };

  const renderExpense = ({ item }: { item: Expense }) => (
    <ExpenseCard
      expense={item}
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Expenses</Text>
        <View style={styles.totalsContainer}>
          {filteredExpenses.length === 0 ? (
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalAmount}>$0.00</Text>
            </View>
          ) : (
            getTotalAmount(filteredExpenses).map((total) => (
              <View key={total.currency} style={styles.totalContainer}>
                <Text style={styles.totalLabel}>{total.currency} Total:</Text>
                <Text style={styles.totalAmount}>{total.formatted}</Text>
              </View>
            ))
          )}
        </View>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={getFilterButtonStyle('all')}
          onPress={() => setFilter('all')}
        >
          <Text style={getFilterTextStyle('all')}>All Time</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={getFilterButtonStyle('thisMonth')}
          onPress={() => setFilter('thisMonth')}
        >
          <Text style={getFilterTextStyle('thisMonth')}>This Month</Text>
        </TouchableOpacity>
      </View>

      {filteredExpenses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {filter === 'all' ? 'No expenses yet' : 'No expenses this month'}
          </Text>
          <Text style={styles.emptySubtext}>
            Add entries in your journal to track expenses
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredExpenses}
          renderItem={renderExpense}
          keyExtractor={(item) => item.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <EditExpenseModal
        visible={modalVisible}
        expense={editingExpense}
        onSave={handleSaveEdit}
        onCancel={() => {
          setModalVisible(false);
          setEditingExpense(null);
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
    marginBottom: 8,
  },
  totalsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
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
  expenseCard: {
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
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  expenseAmount: {
    flex: 1,
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  expenseActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  expenseDescription: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
    marginBottom: 8,
  },
  expenseDate: {
    fontSize: 12,
    color: '#999',
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
    maxHeight: '80%',
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  currencyContainer: {
    marginBottom: 12,
  },
  currencyOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  currencyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  currencyButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  currencyButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  currencyButtonTextActive: {
    color: '#fff',
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryButtonActive: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  categoryButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#fff',
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
