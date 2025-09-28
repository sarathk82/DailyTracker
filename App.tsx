import React from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { JournalScreen, ActionItemsScreen, ExpensesScreen, AnalyticsScreen } from './src/screens';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconText;

              if (route.name === 'Journal') {
                iconText = '📝';
              } else if (route.name === 'ActionItems') {
                iconText = '✅';
              } else if (route.name === 'Expenses') {
                iconText = '💰';
              } else if (route.name === 'Analytics') {
                iconText = '📊';
              } else {
                iconText = '❓';
              }

              return <Text style={{ fontSize: size, color }}>{iconText}</Text>;
            },
            tabBarActiveTintColor: '#007AFF',
            tabBarInactiveTintColor: 'gray',
            tabBarStyle: {
              backgroundColor: '#fff',
              borderTopWidth: 1,
              borderTopColor: '#e0e0e0',
              paddingBottom: 5,
              paddingTop: 5,
              height: 60
            },
            headerShown: false
          })}
        >
          <Tab.Screen
            name="Journal"
            component={JournalScreen}
            options={{
              tabBarLabel: 'Journal'
            }}
          />
          <Tab.Screen
            name="ActionItems"
            component={ActionItemsScreen}
            options={{
              tabBarLabel: 'Tasks'
            }}
          />
          <Tab.Screen
            name="Expenses"
            component={ExpensesScreen}
            options={{
              tabBarLabel: 'Expenses'
            }}
          />
          <Tab.Screen
            name="Analytics"
            component={AnalyticsScreen}
            options={{
              tabBarLabel: 'Analytics'
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
