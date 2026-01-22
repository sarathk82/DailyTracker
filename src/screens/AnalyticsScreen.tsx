import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { format, subDays, subWeeks, subMonths, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

import { Entry, Expense, ActionItem } from '../types';
import { StorageService } from '../utils/storage';
import { TextAnalyzer } from '../utils/textAnalysis';

interface AnalyticsData {
  totalEntries: number;
  entriesThisWeek: number;
  entriesThisMonth: number;
  totalExpenses: { currency: string; amount: number }[];
  expensesThisMonth: { currency: string; amount: number }[];
  totalActionItems: number;
  completedActionItems: number;
  pendingActionItems: number;
  completionRate: number;
  averageEntriesPerDay: number;
  mostActiveDay: string;
  topExpenseCategories: { category: string; amount: number; currency: string }[];
  recentActivity: {
    date: string;
    entries: number;
    expenses: number;
    actions: number;
  }[];
}

export const AnalyticsScreen: React.FC = () => {
    const { theme, isDark } = useTheme();
const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('month');
  const [loading, setLoading] = useState(true);

  const calculateAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [entries, expenses, actionItems] = await Promise.all([
        StorageService.getEntries(),
        StorageService.getExpenses(),
        StorageService.getActionItems()
      ]);

      const now = new Date();
      const weekAgo = subWeeks(now, 1);
      const monthAgo = subMonths(now, 1);

      // Filter data by period
      const getFilteredData = (period: 'week' | 'month' | 'all') => {
        const cutoffDate = period === 'week' ? weekAgo : period === 'month' ? monthAgo : null;
        
        return {
          entries: cutoffDate ? entries.filter(e => e.timestamp >= cutoffDate) : entries,
          expenses: cutoffDate ? expenses.filter(e => e.createdAt >= cutoffDate) : expenses,
          actionItems: cutoffDate ? actionItems.filter(a => a.createdAt >= cutoffDate) : actionItems
        };
      };

      const periodData = getFilteredData(selectedPeriod);

      // Basic counts
      const totalEntries = entries.length;
      const entriesThisWeek = entries.filter(e => e.timestamp >= weekAgo).length;
      const entriesThisMonth = entries.filter(e => e.timestamp >= monthAgo).length;

      // Expense totals by currency
      const totalExpenses: { [key: string]: number } = {};
      const expensesThisMonth: { [key: string]: number } = {};

      expenses.forEach(expense => {
        totalExpenses[expense.currency] = (totalExpenses[expense.currency] || 0) + expense.amount;
      });

      expenses.filter(e => e.createdAt >= monthAgo).forEach(expense => {
        expensesThisMonth[expense.currency] = (expensesThisMonth[expense.currency] || 0) + expense.amount;
      });

      // Action items stats
      const totalActionItems = actionItems.length;
      const completedActionItems = actionItems.filter(a => a.completed).length;
      const pendingActionItems = totalActionItems - completedActionItems;
      const completionRate = totalActionItems > 0 ? (completedActionItems / totalActionItems) * 100 : 0;

      // Activity patterns
      const dayActivity: { [key: string]: number } = {};
      entries.forEach(entry => {
        const day = format(entry.timestamp, 'EEEE');
        dayActivity[day] = (dayActivity[day] || 0) + 1;
      });

      const mostActiveDay = Object.entries(dayActivity).reduce((a, b) => 
        dayActivity[a[0]] > dayActivity[b[0]] ? a : b, ['Monday', 0])[0] || 'No data';

      const averageEntriesPerDay = entries.length > 0 ? 
        entries.length / Math.max(1, Math.ceil((now.getTime() - entries[0].timestamp.getTime()) / (1000 * 60 * 60 * 24))) : 0;

      // Top expense categories
      const categoryTotals: { [key: string]: { amount: number; currency: string } } = {};
      expenses.forEach(expense => {
        const category = expense.category || 'Other';
        if (!categoryTotals[category]) {
          categoryTotals[category] = { amount: 0, currency: expense.currency };
        }
        categoryTotals[category].amount += expense.amount;
      });

      const topExpenseCategories = Object.entries(categoryTotals)
        .map(([category, data]) => ({ category, amount: data.amount, currency: data.currency }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      // Recent activity (last 7 days)
      const recentActivity = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(now, i);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        
        const dayEntries = entries.filter(e => 
          isWithinInterval(e.timestamp, { start: dayStart, end: dayEnd })).length;
        const dayExpenses = expenses.filter(e => 
          isWithinInterval(e.createdAt, { start: dayStart, end: dayEnd })).length;
        const dayActions = actionItems.filter(a => 
          isWithinInterval(a.createdAt, { start: dayStart, end: dayEnd })).length;

        recentActivity.push({
          date: format(date, 'MMM dd'),
          entries: dayEntries,
          expenses: dayExpenses,
          actions: dayActions,
        });
      }

      setAnalytics({
        totalEntries,
        entriesThisWeek,
        entriesThisMonth,
        totalExpenses: Object.entries(totalExpenses).map(([currency, amount]) => ({ currency, amount })),
        expensesThisMonth: Object.entries(expensesThisMonth).map(([currency, amount]) => ({ currency, amount })),
        totalActionItems,
        completedActionItems,
        pendingActionItems,
        completionRate,
        averageEntriesPerDay,
        mostActiveDay,
        topExpenseCategories,
        recentActivity,
      });
    } catch (error) {
      console.error('Error calculating analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useFocusEffect(
    useCallback(() => {
      calculateAnalytics();
    }, [calculateAnalytics])
  );

  if (loading || !analytics) {
    const dynamicStyles = getStyles(theme);


    return (
      <SafeAreaView style={dynamicStyles.container}>
        <Text style={dynamicStyles.loadingText}>Loading analytics...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.headerTitle}>Analytics & Insights</Text>
      </View>

      <ScrollView style={dynamicStyles.content} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={dynamicStyles.periodSelector}>
          {(['week', 'month', 'all'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive
              ]}>
                {period === 'all' ? 'All Time' : `This ${period.charAt(0).toUpperCase() + period.slice(1)}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Cards */}
        <View style={dynamicStyles.summaryGrid}>
          <View style={dynamicStyles.summaryCard}>
            <Text style={dynamicStyles.summaryNumber}>{analytics.totalEntries}</Text>
            <Text style={dynamicStyles.summaryLabel}>Total Entries</Text>
          </View>
          <View style={dynamicStyles.summaryCard}>
            <Text style={dynamicStyles.summaryNumber}>{analytics.totalActionItems}</Text>
            <Text style={dynamicStyles.summaryLabel}>Action Items</Text>
          </View>
          <View style={dynamicStyles.summaryCard}>
            <Text style={dynamicStyles.summaryNumber}>{analytics.completionRate.toFixed(0)}%</Text>
            <Text style={dynamicStyles.summaryLabel}>Completion Rate</Text>
          </View>
          <View style={dynamicStyles.summaryCard}>
            <Text style={dynamicStyles.summaryNumber}>{analytics.averageEntriesPerDay.toFixed(1)}</Text>
            <Text style={dynamicStyles.summaryLabel}>Avg Entries/Day</Text>
          </View>
        </View>

        {/* Spending Overview */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>💰 Spending Overview</Text>
          {analytics.totalExpenses.length > 0 ? (
            <View style={dynamicStyles.expenseList}>
              {analytics.totalExpenses.map((expense, index) => (
                <View key={expense.currency} style={dynamicStyles.expenseItem}>
                  <Text style={dynamicStyles.expenseAmount}>
                    {TextAnalyzer.formatCurrency(expense.amount, expense.currency)}
                  </Text>
                  <Text style={dynamicStyles.expenseLabel}>Total Spent</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={dynamicStyles.emptyText}>No expenses recorded yet</Text>
          )}
        </View>

        {/* Top Categories */}
        {analytics.topExpenseCategories.length > 0 && (
          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>📊 Top Spending Categories</Text>
            <View style={dynamicStyles.categoryList}>
              {analytics.topExpenseCategories.map((category, index) => (
                <View key={category.category} style={dynamicStyles.categoryItem}>
                  <View style={dynamicStyles.categoryInfo}>
                    <Text style={dynamicStyles.categoryName}>{category.category}</Text>
                    <Text style={dynamicStyles.categoryAmount}>
                      {TextAnalyzer.formatCurrency(category.amount, category.currency)}
                    </Text>
                  </View>
                  <View style={[dynamicStyles.categoryBar, { width: `${(category.amount / analytics.topExpenseCategories[0].amount) * 100}%` }]} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Activity Patterns */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>📈 Activity Patterns</Text>
          <View style={dynamicStyles.patternCard}>
            <Text style={dynamicStyles.patternLabel}>Most Active Day</Text>
            <Text style={dynamicStyles.patternValue}>{analytics.mostActiveDay}</Text>
          </View>
        </View>

        {/* Recent Activity Chart */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>📅 Recent Activity (Last 7 Days)</Text>
          <View style={dynamicStyles.chartContainer}>
            {analytics.recentActivity.map((day, index) => {
              // Calculate max values for proper scaling
              const maxEntries = Math.max(...analytics.recentActivity.map(d => d.entries));
              const maxExpenses = Math.max(...analytics.recentActivity.map(d => d.expenses));
              const maxActions = Math.max(...analytics.recentActivity.map(d => d.actions));
              const maxValue = Math.max(maxEntries, maxExpenses, maxActions, 1);
              
              // Scale bars to fit within the allocated height (50px max)
              const entriesHeight = Math.max(4, (day.entries / maxValue) * 50);
              const expensesHeight = Math.max(4, (day.expenses / maxValue) * 50);
              const actionsHeight = Math.max(4, (day.actions / maxValue) * 50);
              
              return (
                <View key={day.date} style={dynamicStyles.chartDay}>
                  <View style={dynamicStyles.chartBars}>
                    <View style={[dynamicStyles.chartBar, dynamicStyles.entriesBar, { height: entriesHeight }]} />
                    <View style={[dynamicStyles.chartBar, dynamicStyles.expensesBar, { height: expensesHeight }]} />
                    <View style={[dynamicStyles.chartBar, dynamicStyles.actionsBar, { height: actionsHeight }]} />
                  </View>
                  <Text style={dynamicStyles.chartDate}>{day.date}</Text>
                </View>
              );
            })}
          </View>
          
          {/* Legend */}
          <View style={dynamicStyles.legend}>
            <View style={dynamicStyles.legendItem}>
              <View style={[dynamicStyles.legendColor, dynamicStyles.entriesBar]} />
              <Text style={dynamicStyles.legendText}>Entries</Text>
            </View>
            <View style={dynamicStyles.legendItem}>
              <View style={[dynamicStyles.legendColor, dynamicStyles.expensesBar]} />
              <Text style={dynamicStyles.legendText}>Expenses</Text>
            </View>
            <View style={dynamicStyles.legendItem}>
              <View style={[dynamicStyles.legendColor, dynamicStyles.actionsBar]} />
              <Text style={dynamicStyles.legendText}>Actions</Text>
            </View>
          </View>
        </View>

        {/* Insights */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>💡 Insights</Text>
          <View style={dynamicStyles.insightsList}>
            {analytics.averageEntriesPerDay > 3 && (
              <View style={dynamicStyles.insightCard}>
                <Text style={dynamicStyles.insightText}>
                  🔥 You're on fire! Averaging {analytics.averageEntriesPerDay.toFixed(1)} entries per day
                </Text>
              </View>
            )}
            {analytics.completionRate > 75 && (
              <View style={dynamicStyles.insightCard}>
                <Text style={dynamicStyles.insightText}>
                  ⭐ Great job! You complete {analytics.completionRate.toFixed(0)}% of your action items
                </Text>
              </View>
            )}
            {analytics.pendingActionItems > 5 && (
              <View style={dynamicStyles.insightCard}>
                <Text style={dynamicStyles.insightText}>
                  ⚠️ You have {analytics.pendingActionItems} pending action items. Consider reviewing them!
                </Text>
              </View>
            )}
            {analytics.totalExpenses.length === 0 && analytics.totalEntries > 10 && (
              <View style={dynamicStyles.insightCard}>
                <Text style={dynamicStyles.insightText}>
                  💸 No expenses tracked yet. Try adding some spending entries to track your budget!
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: theme.textSecondary,
  },
  content: {
    flex: 1,
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: theme.input,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: theme.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  periodButtonTextActive: {
    color: theme.surface,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  summaryCard: {
    width: (Dimensions.get('window').width - 44) / 2,
    backgroundColor: theme.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: theme.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 12,
  },
  expenseList: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 16,
  },
  expenseItem: {
    alignItems: 'center',
    marginBottom: 8,
  },
  expenseAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  expenseLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  categoryList: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 16,
  },
  categoryItem: {
    marginBottom: 12,
    position: 'relative',
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    zIndex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  categoryBar: {
    height: 4,
    backgroundColor: theme.primary,
    borderRadius: 2,
    position: 'absolute',
    bottom: 0,
    left: 0,
    opacity: 0.3,
  },
  patternCard: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  patternLabel: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  patternValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
  },
  chartContainer: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 100,
    marginBottom: 8,
  },
  chartDay: {
    alignItems: 'center',
    flex: 1,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 50,
    marginBottom: 8,
    gap: 2,
  },
  chartBar: {
    width: 6,
    borderRadius: 3,
    minHeight: 4,
  },
  entriesBar: {
    backgroundColor: theme.primary,
  },
  expensesBar: {
    backgroundColor: '#2e7d32',
  },
  actionsBar: {
    backgroundColor: '#ff9800',
  },
  chartDate: {
    fontSize: 10,
    color: theme.textSecondary,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  insightsList: {
    gap: 8,
  },
  insightCard: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: theme.primary,
  },
  insightText: {
    fontSize: 14,
    color: theme.text,
    lineHeight: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.textSecondary,
    fontSize: 14,
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 20,
  },
});