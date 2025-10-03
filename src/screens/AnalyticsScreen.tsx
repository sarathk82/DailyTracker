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
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics & Insights</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
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
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{analytics.totalEntries}</Text>
            <Text style={styles.summaryLabel}>Total Entries</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{analytics.totalActionItems}</Text>
            <Text style={styles.summaryLabel}>Action Items</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{analytics.completionRate.toFixed(0)}%</Text>
            <Text style={styles.summaryLabel}>Completion Rate</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{analytics.averageEntriesPerDay.toFixed(1)}</Text>
            <Text style={styles.summaryLabel}>Avg Entries/Day</Text>
          </View>
        </View>

        {/* Spending Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Spending Overview</Text>
          {analytics.totalExpenses.length > 0 ? (
            <View style={styles.expenseList}>
              {analytics.totalExpenses.map((expense, index) => (
                <View key={expense.currency} style={styles.expenseItem}>
                  <Text style={styles.expenseAmount}>
                    {TextAnalyzer.formatCurrency(expense.amount, expense.currency)}
                  </Text>
                  <Text style={styles.expenseLabel}>Total Spent</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No expenses recorded yet</Text>
          )}
        </View>

        {/* Top Categories */}
        {analytics.topExpenseCategories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Top Spending Categories</Text>
            <View style={styles.categoryList}>
              {analytics.topExpenseCategories.map((category, index) => (
                <View key={category.category} style={styles.categoryItem}>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{category.category}</Text>
                    <Text style={styles.categoryAmount}>
                      {TextAnalyzer.formatCurrency(category.amount, category.currency)}
                    </Text>
                  </View>
                  <View style={[styles.categoryBar, { width: `${(category.amount / analytics.topExpenseCategories[0].amount) * 100}%` }]} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Activity Patterns */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Activity Patterns</Text>
          <View style={styles.patternCard}>
            <Text style={styles.patternLabel}>Most Active Day</Text>
            <Text style={styles.patternValue}>{analytics.mostActiveDay}</Text>
          </View>
        </View>

        {/* Recent Activity Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Recent Activity (Last 7 Days)</Text>
          <View style={styles.chartContainer}>
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
                <View key={day.date} style={styles.chartDay}>
                  <View style={styles.chartBars}>
                    <View style={[styles.chartBar, styles.entriesBar, { height: entriesHeight }]} />
                    <View style={[styles.chartBar, styles.expensesBar, { height: expensesHeight }]} />
                    <View style={[styles.chartBar, styles.actionsBar, { height: actionsHeight }]} />
                  </View>
                  <Text style={styles.chartDate}>{day.date}</Text>
                </View>
              );
            })}
          </View>
          
          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, styles.entriesBar]} />
              <Text style={styles.legendText}>Entries</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, styles.expensesBar]} />
              <Text style={styles.legendText}>Expenses</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, styles.actionsBar]} />
              <Text style={styles.legendText}>Actions</Text>
            </View>
          </View>
        </View>

        {/* Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Insights</Text>
          <View style={styles.insightsList}>
            {analytics.averageEntriesPerDay > 3 && (
              <View style={styles.insightCard}>
                <Text style={styles.insightText}>
                  🔥 You're on fire! Averaging {analytics.averageEntriesPerDay.toFixed(1)} entries per day
                </Text>
              </View>
            )}
            {analytics.completionRate > 75 && (
              <View style={styles.insightCard}>
                <Text style={styles.insightText}>
                  ⭐ Great job! You complete {analytics.completionRate.toFixed(0)}% of your action items
                </Text>
              </View>
            )}
            {analytics.pendingActionItems > 5 && (
              <View style={styles.insightCard}>
                <Text style={styles.insightText}>
                  ⚠️ You have {analytics.pendingActionItems} pending action items. Consider reviewing them!
                </Text>
              </View>
            )}
            {analytics.totalExpenses.length === 0 && analytics.totalEntries > 10 && (
              <View style={styles.insightCard}>
                <Text style={styles.insightText}>
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
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  periodButtonTextActive: {
    color: '#fff',
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
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  expenseList: {
    backgroundColor: '#fff',
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
    color: '#666',
    marginTop: 2,
  },
  categoryList: {
    backgroundColor: '#fff',
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
    color: '#333',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  categoryBar: {
    height: 4,
    backgroundColor: '#007AFF',
    borderRadius: 2,
    position: 'absolute',
    bottom: 0,
    left: 0,
    opacity: 0.3,
  },
  patternCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  patternLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  patternValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  chartContainer: {
    backgroundColor: '#fff',
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
    backgroundColor: '#007AFF',
  },
  expensesBar: {
    backgroundColor: '#2e7d32',
  },
  actionsBar: {
    backgroundColor: '#ff9800',
  },
  chartDate: {
    fontSize: 10,
    color: '#666',
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
    color: '#666',
  },
  insightsList: {
    gap: 8,
  },
  insightCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  insightText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
});