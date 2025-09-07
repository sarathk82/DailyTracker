import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { JournalScreen, ActionItemsScreen, ExpensesScreen } from '../screens';

export const CustomTabNavigator = () => {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { 
      name: 'Journal', 
      icon: '📝', 
      component: JournalScreen 
    },
    { 
      name: 'Action Items', 
      icon: '✅', 
      component: ActionItemsScreen 
    },
    { 
      name: 'Expenses', 
      icon: '💰', 
      component: ExpensesScreen 
    }
  ];

  const ActiveComponent = tabs[activeTab].component;

  return (
    <SafeAreaView style={styles.container}>
      {/* Main Content */}
      <View style={styles.content}>
        <ActiveComponent />
      </View>
      
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.tab,
              activeTab === index && styles.activeTab
            ]}
            onPress={() => setActiveTab(index)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[
              styles.tabText,
              activeTab === index && styles.activeTabText
            ]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingBottom: 5,
    paddingTop: 5,
    height: 70,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  activeTab: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    margin: 2,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#1976d2',
    fontWeight: '600',
  },
});
