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

const defaultSettings: SettingsData = {
  isMarkdownEnabled: true,
  enterToSend: true,
  systemCurrency: 'AUTO', // AUTO means use system default
  layoutStyle: 'chat', // Default to current chat style
  theme: 'system', // light, dark, or system
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

export const SettingsScreen: React.FC<{ 
  onClose: () => void;
  onExportText?: () => void;
  onExportJSON?: () => void;
  onImport?: () => void;
  onBackup?: () => void;
  onRestore?: () => void;
}> = ({ onClose, onExportText, onExportJSON, onImport, onBackup, onRestore }) => {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Text Input</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Markdown</Text>
              <Text style={styles.settingDescription}>
                Format text with **bold**, *italic*, and other markdown syntax
              </Text>
            </View>
            <Switch
              value={settings.isMarkdownEnabled}
              onValueChange={(value) => updateSetting('isMarkdownEnabled', value)}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enter to Send</Text>
              <Text style={styles.settingDescription}>
                Press Enter to send message (off = Enter adds new line)
              </Text>
            </View>
            <Switch
              value={settings.enterToSend}
              onValueChange={(value) => updateSetting('enterToSend', value)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Currency</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={showCurrencyPicker}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Default Currency</Text>
              <Text style={styles.settingDescription}>
                Currency for expenses (when not explicitly specified)
              </Text>
              <Text style={styles.settingValue}>{getCurrentCurrencyName()}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={showThemePicker}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Theme</Text>
              <Text style={styles.settingDescription}>
                Choose your color theme preference
              </Text>
              <Text style={styles.settingValue}>{getCurrentThemeName()}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={showLayoutPicker}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Journal Layout</Text>
              <Text style={styles.settingDescription}>
                Choose how your journal entries are displayed
              </Text>
              <Text style={styles.settingValue}>{getCurrentLayoutName()}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={onExportText}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Export as Text</Text>
              <Text style={styles.settingDescription}>
                Download all entries as a formatted text file
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={onExportJSON}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Export as JSON</Text>
              <Text style={styles.settingDescription}>
                Download all data for backup or import
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={onImport}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Import Data</Text>
              <Text style={styles.settingDescription}>
                Import entries from a JSON file
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={onBackup}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Create Backup</Text>
              <Text style={styles.settingDescription}>
                Save a backup of all your data
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={onRestore}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Restore from Backup</Text>
              <Text style={styles.settingDescription}>
                Restore your data from a previous backup
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />
          
          <TouchableOpacity 
            style={[styles.settingItem, styles.dangerSettingItem]} 
            onPress={handleClearJournal}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, styles.dangerText]}>Clear Journal Entries</Text>
              <Text style={styles.settingDescription}>
                Delete all journal entries while keeping expenses and tasks
              </Text>
            </View>
            <Text style={[styles.arrow, styles.dangerText]}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Daily Tracker</Text>
            <Text style={styles.settingDescription}>
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
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <Text style={modalStyles.title}>Select Currency</Text>
            <Text style={modalStyles.subtitle}>Choose your preferred currency:</Text>
            
            <ScrollView style={modalStyles.optionsList} showsVerticalScrollIndicator={true}>
              {CURRENCIES.map((currency) => {
                return (
                  <TouchableOpacity
                    key={currency.code}
                    style={[
                      modalStyles.option,
                      settings.systemCurrency === currency.code && modalStyles.selectedOption
                    ]}
                    onPress={() => {

                      updateSetting('systemCurrency', currency.code);
                      setShowCurrencyModal(false);
                    }}
                  >
                    <Text style={[
                      modalStyles.optionText,
                      settings.systemCurrency === currency.code && modalStyles.selectedOptionText
                    ]}>
                      {currency.symbol} {currency.name}
                    </Text>
                    {settings.systemCurrency === currency.code && (
                      <Text style={modalStyles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            <TouchableOpacity
              style={modalStyles.cancelButton}
              onPress={() => setShowCurrencyModal(false)}
            >
              <Text style={modalStyles.cancelButtonText}>Cancel</Text>
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
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <Text style={modalStyles.title}>Select Layout Style</Text>
            <Text style={modalStyles.subtitle}>Choose how your journal entries are displayed:</Text>
            
            <ScrollView style={modalStyles.optionsList} showsVerticalScrollIndicator={true}>
              {LAYOUT_OPTIONS.map((layout) => {
                return (
                  <TouchableOpacity
                    key={layout.id}
                    style={[
                      modalStyles.option,
                      settings.layoutStyle === layout.id && modalStyles.selectedOption
                    ]}
                    onPress={() => {

                      updateSetting('layoutStyle', layout.id);
                      setShowLayoutModal(false);
                    }}
                  >
                    <Text style={[
                      modalStyles.optionText,
                      settings.layoutStyle === layout.id && modalStyles.selectedOptionText
                    ]}>
                      {layout.icon} {layout.name}
                    </Text>
                    {settings.layoutStyle === layout.id && (
                      <Text style={modalStyles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            <TouchableOpacity
              style={modalStyles.cancelButton}
              onPress={() => setShowLayoutModal(false)}
            >
              <Text style={modalStyles.cancelButtonText}>Cancel</Text>
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
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <Text style={modalStyles.title}>Select Theme</Text>
            <Text style={modalStyles.subtitle}>Choose your preferred color theme:</Text>
            
            <ScrollView style={modalStyles.optionsList} showsVerticalScrollIndicator={true}>
              {THEME_OPTIONS.map((theme) => {
                const currentTheme = settings.theme || 'system';
                return (
                  <TouchableOpacity
                    key={theme.id}
                    style={[
                      modalStyles.option,
                      currentTheme === theme.id && modalStyles.selectedOption
                    ]}
                    onPress={() => {

                      updateSetting('theme', theme.id);
                      setShowThemeModal(false);
                    }}
                  >
                    <Text style={[
                      modalStyles.optionText,
                      currentTheme === theme.id && modalStyles.selectedOptionText
                    ]}>
                      {theme.icon} {theme.name}
                    </Text>
                    {currentTheme === theme.id && (
                      <Text style={modalStyles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            <TouchableOpacity
              style={modalStyles.cancelButton}
              onPress={() => setShowThemeModal(false)}
            >
              <Text style={modalStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginVertical: 8,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
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
    backgroundColor: '#f5f5f5',
    marginVertical: 8,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: '#fff',
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
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
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
    borderBottomColor: '#f0f0f0',
    minHeight: 50,
  },
  selectedOption: {
    backgroundColor: '#e3f2fd',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  selectedOptionText: {
    color: '#1976d2',
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 18,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 20,
    marginHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});