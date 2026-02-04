import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { JournalScreen, ActionItemsScreen, ExpensesScreen, AnalyticsScreen } from './src/screens';
import { AuthScreen } from './src/screens/AuthScreen';
import { DevicePairingScreen } from './src/screens/DevicePairingScreen';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { P2PSyncService } from './src/services/P2PSyncService';

const Tab = createBottomTabNavigator();

function AppNavigator() {
  const { theme, isDark } = useTheme();
  const { user, loading } = useAuth();
  const [p2pInitialized, setP2pInitialized] = useState(false);
  
  // Initialize P2P sync on app start (no login needed)
  useEffect(() => {
    const initP2P = async () => {
      try {
        await P2PSyncService.initialize();
        await P2PSyncService.autoConnectPairedDevices();
        setP2pInitialized(true);
      } catch (error) {
        console.error('Failed to initialize P2P:', error);
        setP2pInitialized(true); // Continue anyway
      }
    };
    initP2P();
  }, []);
  
  // Show loading spinner while checking auth state and P2P
  if (loading || !p2pInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ marginTop: 16, color: theme.text, fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

  // Main app - no login required!
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
              } else if (route.name === 'Sync') {
                iconText = '🔄';
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
            component={ExpensesScreen}
            options={{
              tabBarLabel: 'Expenses'
            }}
          />
          <Tab.Screen
            name="Sync"
            component={DevicePairingScreen}
            options={{
              tabBarLabel: 'Sync'
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
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
