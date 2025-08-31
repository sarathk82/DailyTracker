import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { JournalScreen, ActionItemsScreen, ExpensesScreen } from './src/screens';
import { TabParamList } from './src/types';

const Tab = createBottomTabNavigator<TabParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === 'Journal') {
              iconName = focused ? 'journal' : 'journal-outline';
            } else if (route.name === 'ActionItems') {
              iconName = focused ? 'checkbox' : 'checkbox-outline';
            } else if (route.name === 'Expenses') {
              iconName = focused ? 'receipt' : 'receipt-outline';
            } else {
              iconName = 'help-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#e0e0e0',
            paddingBottom: 5,
            paddingTop: 5,
            height: 60,
          },
          headerShown: false,
        })}
      >
        <Tab.Screen
          name="Journal"
          component={JournalScreen}
          options={{
            tabBarLabel: 'Journal',
          }}
        />
        <Tab.Screen
          name="ActionItems"
          component={ActionItemsScreen}
          options={{
            tabBarLabel: 'Tasks',
          }}
        />
        <Tab.Screen
          name="Expenses"
          component={ExpensesScreen}
          options={{
            tabBarLabel: 'Expenses',
          }}
        />
      </Tab.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
