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
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

import { Expense, Entry } from '../types';
import { StorageService } from '../utils/storage';
import { TextAnalyzer } from '../utils/textAnalysis';
import { EditModal as UnifiedEditModal } from '../components/EditModal';
import { CreateExpenseModal } from '../components/CreateExpenseModal';

interface ExpenseCardProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  theme: any;
  dynamicStyles: any;
}

const ExpenseCard: React.FC<ExpenseCardProps> = ({ expense, onEdit, onDelete, theme, dynamicStyles }) => {


  return (
    <View style={dynamicStyles.expenseCard}>
      <View style={dynamicStyles.expenseHeader}>
        <View style={dynamicStyles.expenseAmount}>
          <Text style={dynamicStyles.amountText}>
            {TextAnalyzer.formatCurrency(expense.amount, expense.currency)}
          </Text>
          {expense.category && (
            <Text style={dynamicStyles.categoryText}>{expense.category}</Text>
          )}
        </View>
        <View style={dynamicStyles.expenseActions}>
          <TouchableOpacity
            style={dynamicStyles.actionButton}
            onPress={() => onEdit(expense)}
            activeOpacity={0.7}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Text style={{ fontSize: 18 }}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[dynamicStyles.actionButton, dynamicStyles.deleteButton]}
            onPress={() => onDelete(expense.id)}
            activeOpacity={0.7}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name="trash" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={dynamicStyles.expenseDescription} numberOfLines={2}>
        {expense.description}
      </Text>

      <Text style={dynamicStyles.expenseDate}>
        {format(expense.createdAt, 'MMM d, yyyy HH:mm')}
      </Text>
    </View>
  );
};

export const ExpensesScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const dynamicStyles = getStyles(theme);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'analytics'>('list');

  const loadExpenses = useCallback(async () => {
    const expenseList = await StorageService.getExpenses();
    const allEntries = await StorageService.getEntries();
    setExpenses(expenseList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    setEntries(allEntries);
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
    if (!selectedMonth) return true;
    return format(expense.createdAt, 'yyyy-MM') === selectedMonth;
  });

  const getAvailableMonths = () => {
    const monthSet = new Set<string>();
    expenses.forEach(e => monthSet.add(format(e.createdAt, 'yyyy-MM')));
    return Array.from(monthSet).sort().reverse();
  };

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

  // Category analytics
  const getCategoryBreakdown = (expenseList: Expense[]) => {
    const categoryTotals: Record<string, { amount: number; count: number; currency: string }> = {};
    
    expenseList.forEach(expense => {
      const category = expense.category || 'Other';
      if (!categoryTotals[category]) {
        categoryTotals[category] = { amount: 0, count: 0, currency: expense.currency };
      }
      categoryTotals[category].amount += expense.amount;
      categoryTotals[category].count += 1;
    });

    return Object.entries(categoryTotals)
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        currency: data.currency,
        formatted: TextAnalyzer.formatCurrency(data.amount, data.currency)
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  const getMonthlyTrend = () => {
    const monthlyData: Record<string, { amount: number; count: number }> = {};
    
    expenses.forEach(expense => {
      const monthKey = format(expense.createdAt, 'MMM yyyy');
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { amount: 0, count: 0 };
      }
      monthlyData[monthKey].amount += expense.amount;
      monthlyData[monthKey].count += 1;
    });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        amount: data.amount,
        count: data.count
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsCreating(false);
    setModalVisible(true);
  };

  const handleCreate = () => {
    setEditingExpense(null);
    setIsCreating(true);
    setModalVisible(true);
  };

  const handleSaveEdit = async () => {
    await loadExpenses();
    setModalVisible(false);
    setEditingExpense(null);
    setIsCreating(false);
  };

  const handleDelete = async (id: string) => {
    // Use window.confirm for web compatibility instead of Alert.alert
    const confirmed = typeof window !== 'undefined' 
      ? window.confirm('Are you sure you want to delete this expense?')
      : true; // On mobile, proceed directly
    
    if (confirmed) {
      try {
        await StorageService.deleteExpense(id);
        setExpenses(prev => prev.filter(expense => expense.id !== id));
      } catch (error) {
        console.error('Error deleting expense:', error);
      }
    }
  };

  const renderExpense = ({ item }: { item: Expense }) => (
    <ExpenseCard
      expense={item}
      onEdit={handleEdit}
      onDelete={handleDelete}
      theme={theme}
      dynamicStyles={dynamicStyles}
    />
  );

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.headerTitle}>Expenses</Text>
        <TouchableOpacity
          style={dynamicStyles.addButton}
          onPress={handleCreate}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color={theme.surface} />
        </TouchableOpacity>
      </View>

      {/* Month tabs + analytics toggle */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={dynamicStyles.monthTabsScroll}
        contentContainerStyle={dynamicStyles.monthTabsContent}
      >
        <TouchableOpacity
          style={[dynamicStyles.monthTab, !selectedMonth && viewMode === 'list' && dynamicStyles.monthTabActive]}
          onPress={() => { setSelectedMonth(null); setViewMode('list'); }}
        >
          <Text style={[dynamicStyles.monthTabText, !selectedMonth && viewMode === 'list' && dynamicStyles.monthTabTextActive]}>All</Text>
        </TouchableOpacity>
        {getAvailableMonths().map(m => (
          <TouchableOpacity
            key={m}
            style={[dynamicStyles.monthTab, selectedMonth === m && viewMode === 'list' && dynamicStyles.monthTabActive]}
            onPress={() => { setSelectedMonth(m); setViewMode('list'); }}
          >
            <Text style={[dynamicStyles.monthTabText, selectedMonth === m && viewMode === 'list' && dynamicStyles.monthTabTextActive]}>
              {format(new Date(m + '-15'), 'MMM yy')}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[dynamicStyles.monthTab, viewMode === 'analytics' && dynamicStyles.monthTabActive]}
          onPress={() => setViewMode(viewMode === 'analytics' ? 'list' : 'analytics')}
        >
          <Text style={[dynamicStyles.monthTabText, viewMode === 'analytics' && dynamicStyles.monthTabTextActive]}>📊</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Month summary strip */}
      {filteredExpenses.length > 0 && viewMode === 'list' && (
        <View style={dynamicStyles.monthSummaryStrip}>
          <Text style={dynamicStyles.monthSummaryLabel}>
            {selectedMonth ? format(new Date(selectedMonth + '-15'), 'MMMM yyyy') : 'All time'} • {filteredExpenses.length} {filteredExpenses.length === 1 ? 'expense' : 'expenses'}
          </Text>
          {getTotalAmount(filteredExpenses).map(t => (
            <Text key={t.currency} style={dynamicStyles.monthSummaryAmount}>{t.formatted}</Text>
          ))}
        </View>
      )}

      {filteredExpenses.length === 0 ? (
        <View style={dynamicStyles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color="#ccc" />
          <Text style={dynamicStyles.emptyText}>
            {!selectedMonth ? 'No expenses yet' : 'No expenses this month'}
          </Text>
          <Text style={dynamicStyles.emptySubtext}>
            Add entries in your journal to track expenses
          </Text>
        </View>
      ) : (
        viewMode === 'list' ? (
          <FlatList
            data={filteredExpenses}
            renderItem={renderExpense}
            keyExtractor={(item) => item.id}
            style={dynamicStyles.list}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <ScrollView style={dynamicStyles.analyticsContainer} showsVerticalScrollIndicator={false}>
            {/* Category Breakdown */}
            <View style={dynamicStyles.analyticsSection}>
              <Text style={dynamicStyles.analyticsSectionTitle}>📊 Category Breakdown</Text>
              {getCategoryBreakdown(filteredExpenses).map((category, index) => (
                <View key={category.category} style={dynamicStyles.categoryAnalyticsItem}>
                  <View style={dynamicStyles.categoryAnalyticsInfo}>
                    <Text style={dynamicStyles.categoryAnalyticsName}>{category.category}</Text>
                    <Text style={dynamicStyles.categoryAnalyticsCount}>
                      {category.count} {category.count === 1 ? 'expense' : 'expenses'}
                    </Text>
                  </View>
                  <Text style={dynamicStyles.categoryAnalyticsAmount}>{category.formatted}</Text>
                </View>
              ))}
            </View>

            {/* Monthly Trends */}
            <View style={dynamicStyles.analyticsSection}>
              <Text style={dynamicStyles.analyticsSectionTitle}>📈 Monthly Trends</Text>
              {getMonthlyTrend().map((trend, index) => (
                <View key={trend.month} style={dynamicStyles.trendItem}>
                  <Text style={dynamicStyles.trendMonth}>{trend.month}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={dynamicStyles.trendAmount}>
                      {TextAnalyzer.formatCurrency(trend.amount, 'USD')}
                    </Text>
                    <Text style={dynamicStyles.categoryAnalyticsCount}>
                      {trend.count} {trend.count === 1 ? 'expense' : 'expenses'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Quick Stats */}
            <View style={dynamicStyles.analyticsSection}>
              <Text style={dynamicStyles.analyticsSectionTitle}>📋 Quick Stats</Text>
              <View style={dynamicStyles.trendItem}>
                <Text style={dynamicStyles.trendMonth}>Average per expense</Text>
                <Text style={dynamicStyles.trendAmount}>
                  {filteredExpenses.length > 0
                    ? TextAnalyzer.formatCurrency(
                        filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0) / filteredExpenses.length,
                        filteredExpenses[0].currency
                      )
                    : '$0.00'
                  }
                </Text>
              </View>
              <View style={dynamicStyles.trendItem}>
                <Text style={dynamicStyles.trendMonth}>Most expensive category</Text>
                <Text style={dynamicStyles.trendAmount}>
                  {getCategoryBreakdown(filteredExpenses)[0]?.category || 'None'}
                </Text>
              </View>
              <View style={dynamicStyles.trendItem}>
                <Text style={dynamicStyles.trendMonth}>Total categories</Text>
                <Text style={dynamicStyles.trendAmount}>
                  {getCategoryBreakdown(filteredExpenses).length}
                </Text>
              </View>
            </View>
          </ScrollView>
        )
      )}

      <UnifiedEditModal
        visible={modalVisible && !isCreating}
        entry={editingExpense ? entries.find(e => e.id === editingExpense.entryId) || null : null}
        expense={editingExpense}
        onClose={() => {
          setModalVisible(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveEdit}
      />

      <CreateExpenseModal
        visible={modalVisible && isCreating}
        onClose={() => {
          setModalVisible(false);
          setIsCreating(false);
        }}
        onSave={handleSaveEdit}
      />
    </SafeAreaView>
  );
};

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
  },
  monthTabsScroll: {
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    maxHeight: 44,
    flexGrow: 0,
  },
  monthTabsContent: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    alignItems: 'center',
  },
  monthTab: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: theme.input,
    borderWidth: 1,
    borderColor: theme.border,
  },
  monthTabActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  monthTabText: {
    fontSize: 13,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  monthTabTextActive: {
    color: '#ffffff',
  },
  monthSummaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 5,
    backgroundColor: theme.input,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  monthSummaryLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  monthSummaryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
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
    color: theme.textSecondary,
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
  expenseCard: {
    backgroundColor: theme.surface,
    marginVertical: 3,
    padding: 10,
    borderRadius: 10,
    shadowColor: theme.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
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
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  categoryText: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
    backgroundColor: theme.input,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  expenseActions: {
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
  expenseDescription: {
    fontSize: 13,
    color: theme.text,
    lineHeight: 17,
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 11,
    color: theme.placeholder,
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
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
    backgroundColor: theme.input,
    borderWidth: 1,
    borderColor: theme.border,
  },
  currencyButtonActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  currencyButtonText: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  currencyButtonTextActive: {
    color: theme.surface,
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
    backgroundColor: theme.input,
    borderWidth: 1,
    borderColor: theme.border,
  },
  categoryButtonActive: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  categoryButtonText: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: theme.surface,
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
  viewToggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  viewToggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: theme.input,
    alignItems: 'center',
  },
  viewToggleButtonActive: {
    backgroundColor: theme.primary,
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  viewToggleTextActive: {
    color: theme.surface,
  },
  analyticsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  analyticsSection: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  analyticsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 12,
  },
  categoryAnalyticsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.input,
  },
  categoryAnalyticsInfo: {
    flex: 1,
  },
  categoryAnalyticsName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  categoryAnalyticsCount: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  categoryAnalyticsAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  trendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.input,
  },
  trendMonth: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  trendAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
});
