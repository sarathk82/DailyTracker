// IMPORTANT: Must be imported first to polyfill crypto.getRandomValues for React Native
import 'react-native-get-random-values';

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, AppState, Platform } from 'react-native';
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
  const appState = useRef(AppState.currentState);
  const [syncInitialized, setSyncInitialized] = useState(false);
  
  // Initialize P2P sync service on app startup
  useEffect(() => {
    const initSync = async () => {
      try {
        console.log('[App] Initializing P2P sync service...');
        await P2PSyncService.initialize();
        setSyncInitialized(true);
        console.log('[App] P2P sync service initialized');
      } catch (error) {
        console.error('[App] Failed to initialize P2P sync service:', error);
      }
    };
    
    initSync();
  }, []);
  
  // Handle app state changes (background/foreground) on mobile
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Web doesn't need AppState handling
      return;
    }
    
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground - re-initialize sync to ensure listeners are active
        console.log('[App] App foregrounded, re-initializing sync...');
        try {
          await P2PSyncService.initialize();
          console.log('[App] Sync re-initialized on foreground');
        } catch (error) {
          console.error('[App] Failed to re-initialize sync on foreground:', error);
        }
      }
      
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);
  
  // Show loading spinner while checking auth state
  if (loading) {
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
            name="Analytics"
            component={AnalyticsScreen}
            options={{
              tabBarLabel: 'Analytics'
            }}
          />
          <Tab.Screen
            name="Sync"
            component={DevicePairingScreen}
            options={{
              tabBarLabel: 'Sync'
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
