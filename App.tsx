import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { JournalScreen, ActionItemsScreen, ExpensesScreen, AnalyticsScreen } from './src/screens';
import AuthScreen from './src/screens/AuthScreen';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

const Tab = createBottomTabNavigator();

function AppNavigator() {
  const { theme, isDark } = useTheme();
  const { user, loading } = useAuth();
  
  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ marginTop: 16, color: theme.text, fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

  // Show auth screen if not authenticated
  if (!user) {
    return (
      <>
        <StatusBar style={isDark ? "light" : "dark"} />
        <AuthScreen />
      </>
    );
  }

  // Show main app if authenticated
  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
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
            tabBarActiveTintColor: theme.primary,
            tabBarInactiveTintColor: theme.textSecondary,
            tabBarStyle: {
              backgroundColor: theme.surface,
              borderTopWidth: 1,
              borderTopColor: theme.border,
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
          uthProvider>
          <AppNavigator />
        </AuthProviderExpensesScreen}
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
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
