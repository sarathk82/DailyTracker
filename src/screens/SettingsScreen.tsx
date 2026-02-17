import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StorageService } from '../utils/storage';
import { SettingsData } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const defaultSettings: SettingsData = {
  isMarkdownEnabled: true,
  enterToSend: true,
  systemCurrency: 'AUTO', // AUTO means use system default
  layoutStyle: 'chat', // Default to current chat style
  theme: 'system', // light, dark, or system
  syncMethod: 'firebase-relay', // Default to Firebase Relay (works on all platforms)
};

const CURRENCIES = [
  { code: 'AUTO', name: 'Auto-detect', symbol: '🌍' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
];

const THEME_OPTIONS = [
  { id: 'light', name: 'Light Mode', icon: '☀️' },
  { id: 'dark', name: 'Dark Mode', icon: '🌙' },
  { id: 'system', name: 'System Default', icon: '⚙️' },
];

const SYNC_METHOD_OPTIONS = [
  { 
    id: 'firebase-relay', 
    name: 'Firebase Relay', 
    icon: '🔄',
    description: 'Works everywhere including Expo Go. Data relayed through secure Firebase database.',
    recommended: true
  },
  { 
    id: 'webrtc', 
    name: 'Direct P2P (WebRTC)', 
    icon: '⚡',
    description: 'Fastest. Desktop ↔ Mobile or Desktop ↔ Desktop. Requires native build (not Expo Go).',
    webOnly: false  // Available on all platforms with native build
  },
  { 
    id: 'cloud-sync', 
    name: 'Cloud Sync', 
    icon: '☁️',
    description: 'Automatic cloud backup. Requires sign-in.',
    requiresAuth: true
  },
];

export const SettingsScreen: React.FC<{ 
  onClose: () => void;
  onExportText?: () => void;
  onExportJSON?: () => void;
  onImport?: () => void;
  onBackup?: () => void;
  onRestore?: () => void;
  onShowAuth?: () => void;
}> = ({ onClose, onExportText, onExportJSON, onImport, onBackup, onRestore, onShowAuth }) => {
  const { theme, isDark, setThemeMode, themeMode } = useTheme();
  
  let authContext;
  try {
    authContext = useAuth();
  } catch (error) {
    console.log('Auth context not available:', error);
    authContext = { logout: null, user: null };
  }
  
  const { logout, user } = authContext || { logout: null, user: null };
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);

  console.log('SettingsScreen - User:', user ? user.email : 'not logged in');
  console.log('SettingsScreen - Logout function:', logout ? 'available' : 'not available');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showSyncMethodModal, setShowSyncMethodModal] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await StorageService.getSettings();
      if (savedSettings) {
        setSettings({ ...defaultSettings, ...savedSettings });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings: SettingsData) => {
    try {
      console.log('Saving settings:', newSettings);
      await StorageService.saveSettings(newSettings);
      setSettings(newSettings);
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const updateSetting = <K extends keyof SettingsData>(
    key: K,
    value: SettingsData[K]
  ) => {
    console.log(`Updating setting ${String(key)} to ${value}`);
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const showCurrencyPicker = () => {
    console.log('Currency picker tapped'); // Debug log
    console.log('Setting showCurrencyModal to true');
    setShowCurrencyModal(true);
  };

  const LAYOUT_OPTIONS = [
    { id: 'chat', name: 'Chat Style', icon: '💬' },
    { id: 'cards', name: 'Card Layout', icon: '🃏' },
    { id: 'timeline', name: 'Timeline Style', icon: '⏰' },
    { id: 'minimal', name: 'Minimal Design', icon: '✨' },
  ];

  const showLayoutPicker = () => {
    console.log('Layout picker tapped'); // Debug log
    console.log('Setting showLayoutModal to true');
    setShowLayoutModal(true);
  };

  const getCurrentLayoutName = () => {
    const current = LAYOUT_OPTIONS.find(l => l.id === settings.layoutStyle);
    return current ? `${current.icon} ${current.name}` : '💬 Chat Style';
  };

  const getCurrentCurrencyName = () => {
    const current = CURRENCIES.find(c => c.code === settings.systemCurrency);
    return current ? `${current.symbol} ${current.name}` : 'Auto-detect';
  };

  const showThemePicker = () => {
    console.log('Theme picker tapped');
    setShowThemeModal(true);
  };

  const getCurrentThemeName = () => {
    const currentTheme = settings.theme || 'system';
    const current = THEME_OPTIONS.find(t => t.id === currentTheme);
    return current ? `${current.icon} ${current.name}` : '⚙️ System Default';
  };

  const showSyncMethodPicker = () => {
    console.log('Sync method picker tapped');
    setShowSyncMethodModal(true);
  };

  const getCurrentSyncMethodName = () => {
    const currentMethod = settings.syncMethod || 'firebase-relay';
    const current = SYNC_METHOD_OPTIONS.find(m => m.id === currentMethod);
    return current ? `${current.icon} ${current.name}` : '🔄 Firebase Relay';
  };

  const handleClearJournal = async () => {
    console.log('handleClearJournal called');
    
    // Use window.confirm for web, Alert for native
    const confirmClear = Platform.OS === 'web' 
      ? window.confirm('This will delete all journal entries but keep your expenses and tasks. Continue?')
      : await new Promise((resolve) => {
          Alert.alert(
            'Clear Journal Entries',
            'This will delete all journal entries but keep your expenses and tasks. Continue?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              {
                text: 'Clear',
                style: 'destructive',
                onPress: () => resolve(true),
              },
            ]
          );
        });

    if (confirmClear) {
      try {
        console.log('Clearing journal entries...');
        // Get all entries
        const allEntries = await StorageService.getEntries();
        console.log(`Found ${allEntries.length} entries to clear`);
        
        // Filter to keep only system messages (if any) or clear all
        // Since expenses and tasks are stored separately, we can safely clear all entries
        await StorageService.saveEntries([]);
        console.log('Journal entries cleared successfully');
        
        if (Platform.OS === 'web') {
          window.alert('Journal entries cleared. Your expenses and tasks are safe. Please refresh the journal tab.');
        } else {
          Alert.alert('Success', 'Journal entries cleared. Your expenses and tasks are safe. Please refresh the journal tab.');
        }
      } catch (error) {
        console.error('Error clearing journal:', error);
        if (Platform.OS === 'web') {
          window.alert('Failed to clear journal entries');
        } else {
          Alert.alert('Error', 'Failed to clear journal entries');
        }
      }
    }
  };

  // Generate styles dynamically based on theme
  const dynamicStyles = getStyles(theme);
  const dynamicModalStyles = getModalStyles(theme);

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.headerTitle}>Settings</Text>
        <TouchableOpacity onPress={onClose} style={dynamicStyles.closeButton}>
          <Text style={dynamicStyles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={dynamicStyles.content}>
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Text Input</Text>
          
          <View style={dynamicStyles.settingItem}>
            <View style={dynamicStyles.settingInfo}>
              <Text style={dynamicStyles.settingLabel}>Enable Markdown</Text>
              <Text style={dynamicStyles.settingDescription}>
                Format text with **bold**, *italic*, and other markdown syntax
              </Text>
            </View>
            <Switch
              value={settings.isMarkdownEnabled}
              onValueChange={(value) => updateSetting('isMarkdownEnabled', value)}
            />
          </View>

          <View style={dynamicStyles.settingItem}>
            <View style={dynamicStyles.settingInfo}>
              <Text style={dynamicStyles.settingLabel}>Enter to Send</Text>
              <Text style={dynamicStyles.settingDescription}>
                Press Enter to send message (off = Enter adds new line)
              </Text>
            </View>
            <Switch
              value={settings.enterToSend}
              onValueChange={(value) => updateSetting('enterToSend', value)}
            />
          </View>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Currency</Text>
          
          <TouchableOpacity style={dynamicStyles.settingItem} onPress={showCurrencyPicker}>
            <View style={dynamicStyles.settingInfo}>
              <Text style={dynamicStyles.settingLabel}>Default Currency</Text>
              <Text style={dynamicStyles.settingDescription}>
                Currency for expenses (when not explicitly specified)
              </Text>
              <Text style={dynamicStyles.settingValue}>{getCurrentCurrencyName()}</Text>
            </View>
            <Text style={dynamicStyles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Appearance</Text>
          
          <TouchableOpacity style={dynamicStyles.settingItem} onPress={showThemePicker}>
            <View style={dynamicStyles.settingInfo}>
              <Text style={dynamicStyles.settingLabel}>Theme</Text>
              <Text style={dynamicStyles.settingDescription}>
                Choose your color theme preference
              </Text>
              <Text style={dynamicStyles.settingValue}>{getCurrentThemeName()}</Text>
            </View>
            <Text style={dynamicStyles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={dynamicStyles.settingItem} onPress={showLayoutPicker}>
            <View style={dynamicStyles.settingInfo}>
              <Text style={dynamicStyles.settingLabel}>Journal Layout</Text>
              <Text style={dynamicStyles.settingDescription}>
                Choose how your journal entries are displayed
              </Text>
              <Text style={dynamicStyles.settingValue}>{getCurrentLayoutName()}</Text>
            </View>
            <Text style={dynamicStyles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Device Sync</Text>
          
          <TouchableOpacity style={dynamicStyles.settingItem} onPress={showSyncMethodPicker}>
            <View style={dynamicStyles.settingInfo}>
              <Text style={dynamicStyles.settingLabel}>Sync Method</Text>
              <Text style={dynamicStyles.settingDescription}>
                Choose how to sync data between devices
              </Text>
              <Text style={dynamicStyles.settingValue}>{getCurrentSyncMethodName()}</Text>
            </View>
            <Text style={dynamicStyles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity 
            style={dynamicStyles.settingItem} 
            onPress={onExportText}
          >
            <View style={dynamicStyles.settingInfo}>
              <Text style={dynamicStyles.settingLabel}>Export as Text</Text>
              <Text style={dynamicStyles.settingDescription}>
                Download all entries as a formatted text file
              </Text>
            </View>
            <Text style={dynamicStyles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={dynamicStyles.settingItem} 
            onPress={onExportJSON}
          >
            <View style={dynamicStyles.settingInfo}>
              <Text style={dynamicStyles.settingLabel}>Export as JSON</Text>
              <Text style={dynamicStyles.settingDescription}>
                Download all data for backup or import
              </Text>
            </View>
            <Text style={dynamicStyles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={dynamicStyles.settingItem} 
            onPress={onImport}
          >
            <View style={dynamicStyles.settingInfo}>
              <Text style={dynamicStyles.settingLabel}>Import Data</Text>
              <Text style={dynamicStyles.settingDescription}>
                Import entries from a JSON file
              </Text>
            </View>
            <Text style={dynamicStyles.arrow}>›</Text>
          </TouchableOpacity>

          <View style={dynamicStyles.divider} />

          <TouchableOpacity 
            style={dynamicStyles.settingItem} 
            onPress={onBackup}
          >
            <View style={dynamicStyles.settingInfo}>
              <Text style={dynamicStyles.settingLabel}>Create Backup</Text>
              <Text style={dynamicStyles.settingDescription}>
                Save a backup of all your data
              </Text>
            </View>
            <Text style={dynamicStyles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={dynamicStyles.settingItem} 
            onPress={onRestore}
          >
            <View style={dynamicStyles.settingInfo}>
              <Text style={dynamicStyles.settingLabel}>Restore from Backup</Text>
              <Text style={dynamicStyles.settingDescription}>
                Restore your data from a previous backup
              </Text>
            </View>
            <Text style={dynamicStyles.arrow}>›</Text>
          </TouchableOpacity>

          <View style={dynamicStyles.divider} />
          
          <TouchableOpacity 
            style={[dynamicStyles.settingItem, dynamicStyles.dangerSettingItem]} 
            onPress={handleClearJournal}
          >
            <View style={dynamicStyles.settingInfo}>
              <Text style={[dynamicStyles.settingLabel, dynamicStyles.dangerText]}>Clear Journal Entries</Text>
              <Text style={dynamicStyles.settingDescription}>
                Delete all journal entries while keeping expenses and tasks
              </Text>
            </View>
            <Text style={[dynamicStyles.arrow, dynamicStyles.dangerText]}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Cloud Sync (Optional)</Text>
          
          <View style={[dynamicStyles.infoBox, { backgroundColor: isDark ? '#1a3a52' : '#e3f2fd', borderLeftColor: '#2196F3' }]}>
            <Text style={[dynamicStyles.infoIcon, { fontSize: 20 }]}>☁️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[dynamicStyles.infoTitle, { color: isDark ? '#90caf9' : '#0D47A1' }]}>Optional Cloud Sync</Text>
              <Text style={[dynamicStyles.infoText, { color: isDark ? '#b3d4fc' : '#0D47A1' }]}>
                {user 
                  ? 'You are signed in. Your data can sync to the cloud.'
                  : 'Sign in to enable cloud backup and sync across devices. The app works perfectly without it!'}
              </Text>
            </View>
          </View>

          {user ? (
            <>
              <View style={dynamicStyles.settingItem}>
                <View style={dynamicStyles.settingInfo}>
                  <Text style={dynamicStyles.settingLabel}>✓ Signed in as</Text>
                  <Text style={dynamicStyles.settingDescription}>
                    {user.email}
                  </Text>
                  <Text style={[dynamicStyles.settingDescription, { color: theme.success, marginTop: 4 }]}>
                    Cloud sync enabled
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                style={[dynamicStyles.settingItem, dynamicStyles.dangerSettingItem]} 
                onPress={async () => {
                  if (!logout) {
                    Alert.alert('Error', 'Logout feature not available');
                    return;
                  }
                  
                  const confirmLogout = () => {
                    Alert.alert(
                      'Sign Out',
                      `Sign out from ${user.email}? Your local data will remain on this device.`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: 'Sign Out', 
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await logout();
                              Alert.alert('Success', 'Signed out successfully');
                            } catch (error: any) {
                              Alert.alert('Error', error.message || 'Failed to sign out');
                            }
                          }
                        }
                      ]
                    );
                  };
                  
                  if (Platform.OS === 'web') {
                    if (window.confirm(`Sign out from ${user.email}? Your local data will remain on this device.`)) {
                      try {
                        await logout();
                        alert('Signed out successfully');
                      } catch (error: any) {
                        alert('Error: ' + (error.message || 'Failed to sign out'));
                      }
                    }
                  } else {
                    confirmLogout();
                  }
                }}
              >
                <View style={dynamicStyles.settingInfo}>
                  <Text style={[dynamicStyles.settingLabel, dynamicStyles.dangerText]}>Sign Out</Text>
                  <Text style={dynamicStyles.settingDescription}>
                    Disconnect from cloud sync
                  </Text>
                </View>
                <Text style={[dynamicStyles.arrow, dynamicStyles.dangerText]}>›</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={[dynamicStyles.settingItem, { backgroundColor: isDark ? '#1565c0' : '#2196F3' }]}
              onPress={() => {
                if (onShowAuth) {
                  onShowAuth();
                } else {
                  Alert.alert(
                    'Sign In',
                    'Cloud sync is coming soon! For now, use Export/Import to transfer data between devices.',
                    [{ text: 'OK' }]
                  );
                }
              }}
            >
              <View style={dynamicStyles.settingInfo}>
                <Text style={[dynamicStyles.settingLabel, { color: 'white' }]}>Sign In for Cloud Sync</Text>
                <Text style={[dynamicStyles.settingDescription, { color: 'rgba(255,255,255,0.9)' }]}>
                  Enable backup and sync across devices (optional)
                </Text>
              </View>
              <Text style={[dynamicStyles.arrow, { color: 'white' }]}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>About</Text>
          <View style={dynamicStyles.settingItem}>
            <Text style={dynamicStyles.settingLabel}>Daily Tracker</Text>
            <Text style={dynamicStyles.settingDescription}>
              Smart journal with automatic expense and task detection
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={dynamicModalStyles.overlay}>
          <View style={dynamicModalStyles.container}>
            <Text style={dynamicModalStyles.title}>Select Currency</Text>
            <Text style={dynamicModalStyles.subtitle}>Choose your preferred currency:</Text>
            
            <ScrollView style={dynamicModalStyles.optionsList} showsVerticalScrollIndicator={true}>
              {CURRENCIES.map((currency) => {
                return (
                  <TouchableOpacity
                    key={currency.code}
                    style={[
                      dynamicModalStyles.option,
                      settings.systemCurrency === currency.code && dynamicModalStyles.selectedOption
                    ]}
                    onPress={() => {

                      updateSetting('systemCurrency', currency.code);
                      setShowCurrencyModal(false);
                    }}
                  >
                    <Text style={[
                      dynamicModalStyles.optionText,
                      settings.systemCurrency === currency.code && dynamicModalStyles.selectedOptionText
                    ]}>
                      {currency.symbol} {currency.name}
                    </Text>
                    {settings.systemCurrency === currency.code && (
                      <Text style={dynamicModalStyles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            <TouchableOpacity
              style={dynamicModalStyles.cancelButton}
              onPress={() => setShowCurrencyModal(false)}
            >
              <Text style={dynamicModalStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Layout Selection Modal */}
      <Modal
        visible={showLayoutModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLayoutModal(false)}
      >
        <View style={dynamicModalStyles.overlay}>
          <View style={dynamicModalStyles.container}>
            <Text style={dynamicModalStyles.title}>Select Layout Style</Text>
            <Text style={dynamicModalStyles.subtitle}>Choose how your journal entries are displayed:</Text>
            
            <ScrollView style={dynamicModalStyles.optionsList} showsVerticalScrollIndicator={true}>
              {LAYOUT_OPTIONS.map((layout) => {
                return (
                  <TouchableOpacity
                    key={layout.id}
                    style={[
                      dynamicModalStyles.option,
                      settings.layoutStyle === layout.id && dynamicModalStyles.selectedOption
                    ]}
                    onPress={() => {

                      updateSetting('layoutStyle', layout.id);
                      setShowLayoutModal(false);
                    }}
                  >
                    <Text style={[
                      dynamicModalStyles.optionText,
                      settings.layoutStyle === layout.id && dynamicModalStyles.selectedOptionText
                    ]}>
                      {layout.icon} {layout.name}
                    </Text>
                    {settings.layoutStyle === layout.id && (
                      <Text style={dynamicModalStyles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            <TouchableOpacity
              style={dynamicModalStyles.cancelButton}
              onPress={() => setShowLayoutModal(false)}
            >
              <Text style={dynamicModalStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Theme Selection Modal */}
      <Modal
        visible={showThemeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={dynamicModalStyles.overlay}>
          <View style={dynamicModalStyles.container}>
            <Text style={dynamicModalStyles.title}>Select Theme</Text>
            <Text style={dynamicModalStyles.subtitle}>Choose your preferred color theme:</Text>
            
            <ScrollView style={dynamicModalStyles.optionsList} showsVerticalScrollIndicator={true}>
              {THEME_OPTIONS.map((themeOption) => {
                return (
                  <TouchableOpacity
                    key={themeOption.id}
                    style={[
                      dynamicModalStyles.option,
                      themeMode === themeOption.id && dynamicModalStyles.selectedOption
                    ]}
                    onPress={() => {
                      setThemeMode(themeOption.id as any);
                      updateSetting('theme', themeOption.id);
                      setShowThemeModal(false);
                    }}
                  >
                    <Text style={[
                      dynamicModalStyles.optionText,
                      themeMode === themeOption.id && dynamicModalStyles.selectedOptionText
                    ]}>
                      {themeOption.icon} {themeOption.name}
                    </Text>
                    {themeMode === themeOption.id && (
                      <Text style={dynamicModalStyles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            <TouchableOpacity
              style={dynamicModalStyles.cancelButton}
              onPress={() => setShowThemeModal(false)}
            >
              <Text style={dynamicModalStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sync Method Selection Modal */}
      <Modal
        visible={showSyncMethodModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSyncMethodModal(false)}
      >
        <View style={dynamicModalStyles.overlay}>
          <View style={dynamicModalStyles.container}>
            <Text style={dynamicModalStyles.title}>Select Sync Method</Text>
            <Text style={dynamicModalStyles.subtitle}>Choose how to sync between devices:</Text>
            
            <ScrollView style={dynamicModalStyles.optionsList} showsVerticalScrollIndicator={true}>
              {SYNC_METHOD_OPTIONS.map((method) => {
                const isDisabled = method.requiresAuth && !user;
                
                return (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      dynamicModalStyles.option,
                      settings.syncMethod === method.id && dynamicModalStyles.selectedOption,
                      isDisabled && { opacity: 0.5 }
                    ]}
                    onPress={() => {
                      if (isDisabled) {
                        if (method.requiresAuth) {
                          Alert.alert(
                            'Sign In Required',
                            'Cloud Sync requires you to sign in. Would you like to sign in now?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Sign In', onPress: () => {
                                setShowSyncMethodModal(false);
                                if (onShowAuth) onShowAuth();
                              }}
                            ]
                          );
                        }
                        return;
                      }
                      
                      updateSetting('syncMethod', method.id as any);
                      setShowSyncMethodModal(false);
                    }}
                    disabled={isDisabled}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        dynamicModalStyles.optionText,
                        settings.syncMethod === method.id && dynamicModalStyles.selectedOptionText
                      ]}>
                        {method.icon} {method.name}
                        {method.recommended && <Text style={{ color: theme.success }}> (Recommended)</Text>}
                      </Text>
                      <Text style={[
                        dynamicModalStyles.optionDescription,
                        { fontSize: 12, marginTop: 4, opacity: 0.7 }
                      ]}>
                        {method.description}
                      </Text>
                    </View>
                    {settings.syncMethod === method.id && (
                      <Text style={dynamicModalStyles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            <TouchableOpacity
              style={dynamicModalStyles.cancelButton}
              onPress={() => setShowSyncMethodModal(false)}
            >
              <Text style={dynamicModalStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: theme.input,
  },
  closeButtonText: {
    fontSize: 16,
    color: theme.textSecondary,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: theme.surface,
    marginVertical: 8,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.input,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: theme.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 18,
  },
  settingValue: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 4,
    fontWeight: '500',
  },
  arrow: {
    fontSize: 20,
    color: '#ccc',
  },
  dangerSettingItem: {
    backgroundColor: '#fff0f0',
  },
  dangerText: {
    color: '#d32f2f',
  },
  divider: {
    height: 8,
    backgroundColor: theme.background,
    marginVertical: 8,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    borderLeftWidth: 4,
  },
  infoIcon: {
    marginRight: 12,
    fontSize: 24,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

const getModalStyles = (theme: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    minHeight: 300,
    maxHeight: '80%',
    paddingVertical: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  optionsList: {
    flexGrow: 1,
    minHeight: 200,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
    minHeight: 50,
  },
  selectedOption: {
    backgroundColor: theme.highlight,
  },
  optionText: {
    fontSize: 16,
    color: theme.text,
    flex: 1,
  },
  optionDescription: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 4,
  },
  selectedOptionText: {
    color: theme.primary,
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 18,
    color: theme.primary,
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 20,
    marginHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: theme.background,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: theme.text,
    fontWeight: '500',
  },
});