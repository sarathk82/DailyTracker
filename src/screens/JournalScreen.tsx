import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from '../contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
// import { Ionicons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import { format } from "date-fns";

import { Entry, Expense, ActionItem } from "../types";
import { StorageService } from "../utils/storage";
import { TextAnalyzer } from "../utils/textAnalysis";
import { MessageBubble } from "../components/MessageBubble";
import { MinimalEntryItem } from "../components/MinimalEntryItem";
import { SettingsScreen } from "./SettingsScreen";
import { AuthScreen } from "./AuthScreen";
import { EditModal } from "../components/EditModal";
import { isDesktop } from "../utils/platform";
import { useAuth } from "../contexts/AuthContext";
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Custom UUID function since react-native-uuid causes crashes
// Uses crypto-based random values for better uniqueness
const uuid = {
  v4: () => {
    // Use timestamp + random to ensure uniqueness across devices
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};
export const JournalScreen: React.FC<{}> = () => {
  const { theme, isDark } = useTheme();
  const authContext = useAuth();
  const { user, logout } = authContext || { user: null, logout: null };
  
  const [entries, setEntries] = useState<Entry[]>([]);
  const [inputText, setInputText] = useState("");
  const [isMarkdown, setIsMarkdown] = useState(true);
  const [testIndex, setTestIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);
  const shouldAutoScrollRef = useRef(false);
  const isInitialLoadRef = useRef(true);
  const hasScrolledToBottomRef = useRef(false);
  
  // Keyboard handling state
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Settings state (will be loaded from storage)
  const [enterToSend, setEnterToSend] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [layoutStyle, setLayoutStyle] = useState('chat');
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [filteredEntries, setFilteredEntries] = useState<Entry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  


  // Data for enhanced messages
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  
  // Quick-action tags for explicit categorization
  const [forceExpense, setForceExpense] = useState(false);
  const [forceAction, setForceAction] = useState(false);
  
  // Edit modal state
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  // Test entries for different scenarios
  const testEntries = [
    // Expense entries first
    "spent Rs150 for coffee",
    "bought groceries for $45.50",
    "paid ₹2500 for electricity bill",
    "lunch cost $12.99",
    "purchased fuel Rs3200",
    "500 for haircut",
    "₹300 for taxi",
    "50 for parking",
    "spent 200 on movie ticket",
    "paid $25 for gym membership",
    "dinner cost Rs850",
    
    // Action item entries
    "need to call mom tomorrow",
    "todo: finish the quarterly report",
    "must submit tax documents by Friday",
    "reminder: doctor appointment at 3pm",
    "should book flight tickets",
    ". pick up dry cleaning",
    ". schedule dentist appointment",
    ". buy birthday gift for Sarah",
    ". pay credit card bill",
    "todo: prepare presentation slides",
    
    // Regular log entries
    "had a great meeting today",
    "weather is lovely",
    "feeling productive this morning",
    "learned something new about React Native",
    "grateful for a good day",
    "enjoyed my morning coffee",
    "finished reading a great book",
    "went for a long walk",
    "cooked a delicious meal",
    "watched an interesting documentary",
    "had a video call with friends",
    "organized my workspace",
    "tried a new recipe today",
    "listened to a great podcast",
    "feeling motivated and energized",
    "completed my daily workout",
    "spent quality time with family",
    "practiced meditation for 20 minutes",
    "wrote in my journal",
    "started learning a new skill",
    "cleaned and organized my room",
    "discovered a new favorite song",
    "made progress on personal project",
    "helped a friend with their work",
    "reflected on my goals",
    "enjoyed the sunset",
    "read an inspiring article",
    "practiced gratitude",
    "had a relaxing evening",
    "played games with friends",
    "explored a new neighborhood",
    "tried a new coffee shop",
    "attended an online webinar",
    "updated my resume",
    "planned next week's schedule",
    "sorted through old photos",
    "donated unused items",
    "fixed a bug in my code",
    "reviewed my budget",
    "called an old friend",
    "planted some herbs",
    "rearranged furniture",
    "learned a new keyboard shortcut",
    "backed up my data",
    "cleaned out my inbox",
    "updated my software",
    "read documentation",
    "wrote unit tests",
    "refactored some code",
    "debugged an issue",
    "improved performance",
    "added new features",
    "reviewed pull requests",
    "attended standup meeting",
    "brainstormed ideas",
    "sketched UI designs",
    "created wireframes",
    "wrote technical specs",
    "researched best practices",
    "optimized database queries",
    "configured CI/CD pipeline",
    "set up monitoring",
    "analyzed metrics",
    "documented API endpoints",
    "reviewed architecture",
    "planned sprint tasks",
    "estimated story points",
    "pair programmed with teammate",
    "conducted code review",
    "deployed to staging",
    "tested new feature",
    "fixed production bug",
    "updated dependencies",
    "wrote blog post",
    "shared knowledge with team",
    "mentored junior developer",
    "attended tech talk",
    "experimented with new library",
    "built proof of concept",
    "improved accessibility",
    "enhanced security",
    "reduced technical debt",
    "improved error handling",
    "added logging",
    "created dashboard",
    "automated workflow",
    "simplified complex logic",
    "improved user experience",
    "gathered user feedback",
    "analyzed usage patterns",
    "identified bottlenecks",
    "proposed solution",
    "implemented caching",
    "optimized bundle size",
    "improved load time",
    "enhanced mobile experience",
    "added dark mode",
    "created design system",
    "standardized components",
    "improved code coverage",
    "fixed flaky tests",
    "upgraded framework version",
    "migrated to new API",
    "cleaned up legacy code",
    "consolidated services",
    "improved modularity",
    "reduced coupling",
    "enhanced maintainability",
    "documented codebase",
    "created runbook"
  ];

  const loadEntries = useCallback(async () => {
    const savedEntries = await StorageService.getEntries();
    
    // Deduplicate entries by ID (in case of sync issues)
    const uniqueEntries = Array.from(
      new Map(savedEntries.map(entry => [entry.id, entry])).values()
    );
    
    // Sort entries by timestamp to maintain chronological order
    const sortedEntries = uniqueEntries.sort((a, b) => {
      // If timestamps are within 2 seconds of each other, maintain user-system alternation
      const timeDiff = Math.abs(a.timestamp.getTime() - b.timestamp.getTime());
      if (timeDiff < 2000) {
        // If one is a system message and the other isn't, maintain the conversation flow
        if (a.type === 'system' && b.type !== 'system') return 1;
        if (a.type !== 'system' && b.type === 'system') return -1;
      }
      // Otherwise, sort by timestamp
      return a.timestamp.getTime() - b.timestamp.getTime();
    });
    
    setEntries(sortedEntries);
    setFilteredEntries(sortedEntries); // Initialize filtered entries
    // Reset scroll flag when entries are loaded so it scrolls to bottom
    hasScrolledToBottomRef.current = false;
  }, []);

  // Create a flattened list with date separators (for inverted FlatList)
  const createEntriesWithDateSeparators = useCallback((entriesList: Entry[]) => {
    if (entriesList.length === 0) return [];

    // Sort entries chronologically (oldest first)
    const sortedEntries = [...entriesList].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    const result: (Entry | { type: 'dateSeparator'; date: string; id: string })[] = [];
    let currentDate = '';

    sortedEntries.forEach((entry) => {
      const entryDate = format(entry.timestamp, 'yyyy-MM-dd');
      
      // Add date separator if this is a new date
      if (entryDate !== currentDate) {
        result.push({
          type: 'dateSeparator',
          date: entryDate,
          id: `date-${entryDate}`,
        });
        currentDate = entryDate;
      }
      
      result.push(entry);
    });

    // The FlatList inverted prop will handle showing this in reverse order
    return result;
  }, []);

  // Filter entries based on search query and selected date
  useEffect(() => {
    if (!showSearch) {
      setFilteredEntries(entries);
      return;
    }

    let filtered = entries;

    // Date filter
    if (selectedDate) {
      const searchDate = new Date(selectedDate);
      searchDate.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter((entry) => {
        if (entry.type === 'system') return false;
        const entryDate = new Date(entry.timestamp);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate.getTime() === searchDate.getTime();
      });
    }

    // Text filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((entry) => {
        if (entry.type === 'system') return false;
        // Text search in entry content
        if (entry.text.toLowerCase().includes(query)) return true;
        // Type-based search
        if (entry.type.toLowerCase().includes(query)) return true;
        return false;
      });
    }

    setFilteredEntries(filtered);
  }, [searchQuery, entries, selectedDate, showSearch]);

  // Keyboard listeners for better Android handling
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const getListStyle = (layout: string) => {
    switch (layout) {
      case 'cards':
        return { paddingHorizontal: 8 };
      case 'list':
        return { paddingHorizontal: 0, backgroundColor: theme.surface };
      case 'timeline':
        return { paddingHorizontal: 0, backgroundColor: theme.input };
      case 'magazine':
        return { paddingHorizontal: 0, backgroundColor: theme.background };
      case 'minimal':
        return { paddingHorizontal: 0, backgroundColor: theme.surface };
      case 'chat':
      default:
        return { paddingHorizontal: 16 };
    }
  };

  const loadSettings = useCallback(async () => {
    try {
      const savedSettings = await StorageService.getSettings();
      if (savedSettings) {
        setIsMarkdown(savedSettings.isMarkdownEnabled);
        setEnterToSend(savedSettings.enterToSend);
        setLayoutStyle(savedSettings.layoutStyle || 'chat');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  const loadExpensesAndActions = useCallback(async () => {
    try {
      const [savedExpenses, savedActionItems] = await Promise.all([
        StorageService.getExpenses(),
        StorageService.getActionItems()
      ]);
      
      // Deduplicate expenses by ID (in case of sync issues)
      const uniqueExpenses = Array.from(
        new Map(savedExpenses.map(expense => [expense.id, expense])).values()
      );
      
      // Deduplicate action items by ID (in case of sync issues)
      const uniqueActionItems = Array.from(
        new Map(savedActionItems.map(item => [item.id, item])).values()
      );
      
      // Migration: Set due dates for action items that don't have one
      let needsUpdate = false;
      const updatedActionItems = uniqueActionItems.map(item => {
        if (!item.dueDate) {
          needsUpdate = true;
          return { ...item, dueDate: item.createdAt || new Date() };
        }
        return item;
      });
      
      // Save updated action items if migration was needed
      if (needsUpdate) {
        await StorageService.saveActionItems(updatedActionItems);
        setActionItems(updatedActionItems);
      } else {
        setActionItems(updatedActionItems);
      }
      
      setExpenses(uniqueExpenses);
    } catch (error) {
      console.error('Error loading expenses and action items:', error);
    }
  }, []);

  // Load data on initial mount
  useEffect(() => {
    loadEntries();
    loadSettings();
    loadExpensesAndActions();
  }, [loadEntries, loadSettings, loadExpensesAndActions]);

  // Refresh data when screen comes into focus (e.g., after editing in another tab)
  useFocusEffect(
    useCallback(() => {
      loadEntries();
      loadExpensesAndActions();
    }, [loadEntries, loadExpensesAndActions])
  );

  const showToast = (message: string) => {
    alert(message);
  };

  // Helper function to convert dot-prefix to checkmark format
  const convertDotToCheckbox = (text: string): string => {
    // Convert ". task" to "✅ task" (checkmark)
    return text.replace(/^\s*\.\s*/, '✅ ');
  };

    const handleSendMessage = async () => {
    const trimmedInput = inputText.trim();
    if (!trimmedInput) return;

    try {
      // Clear input immediately for better UX
      setInputText("");
      
      // Use async LLM classification if enabled
      const autoDetectedAction = await TextAnalyzer.detectActionItemAsync(trimmedInput);
      const autoDetectedExpense = await TextAnalyzer.detectExpenseAsync(trimmedInput);
      
      // Convert dot-prefix to checkbox format for display
      let displayText = trimmedInput;
      if (autoDetectedAction || forceAction) {
        displayText = convertDotToCheckbox(trimmedInput);
      }

      const entry: Entry = {
        id: uuid.v4(),
        text: displayText, // Use the converted text with checkbox
        timestamp: new Date(),
        type: 'log',
        isMarkdown,
      };

      // Save the entry first
      await StorageService.addEntry(entry);
      
      // Process categorization in parallel where possible
      let expenseInfo = null;
      let actionItem = null;
      let expenseError = false;
      
      // Check for expense (auto-detect OR user explicitly marked it)
      if (autoDetectedExpense || forceExpense) {
        expenseInfo = await TextAnalyzer.extractExpenseInfoAsync(trimmedInput, entry.id);
        if (expenseInfo) {
          expenseInfo.autoDetected = autoDetectedExpense && !forceExpense;
          await StorageService.addExpense(expenseInfo);
          await updateEntryType(entry.id, 'expense');
        } else if (forceExpense) {
          expenseError = true;
        }
      }

      // Check for action item (auto-detect OR user explicitly marked it)
      if (!expenseInfo && (autoDetectedAction || forceAction)) {
        if (forceAction && !autoDetectedAction) {
          const dueDate = TextAnalyzer.extractDueDate(trimmedInput);
          actionItem = {
            id: uuid.v4(),
            entryId: entry.id,
            title: trimmedInput,
            completed: false,
            createdAt: new Date(),
            dueDate: dueDate,
            autoDetected: false
          };
        } else {
          actionItem = await TextAnalyzer.extractActionItemAsync(trimmedInput, entry.id);
          if (actionItem) {
            actionItem.autoDetected = autoDetectedAction && !forceAction;
          }
        }
        
        if (actionItem) {
          await StorageService.addActionItem(actionItem);
          await updateEntryType(entry.id, 'action');
        }
      }

      // Reload data once
      await Promise.all([loadEntries(), loadExpensesAndActions()]);

      // Add system feedback message only in chat view
      if (layoutStyle === 'chat') {
        let systemMessage = '';
        
        if (expenseInfo) {
          const prefix = expenseInfo.autoDetected ? 'Auto-categorized' : 'Manually categorized';
          systemMessage = `💰 ${prefix} as Expense: ${TextAnalyzer.formatCurrency(expenseInfo.amount, expenseInfo.currency)}`;
          if (expenseInfo.category) systemMessage += ` (${expenseInfo.category})`;
        } else if (actionItem) {
          const prefix = actionItem.autoDetected ? 'Auto-categorized' : 'Manually categorized';
          systemMessage = `✅ ${prefix} as Task: ${actionItem.title}`;
        } else {
          systemMessage = '✓ Got it!';
        }

        if (systemMessage) {
          const systemEntry: Entry = {
            id: uuid.v4(),
            text: systemMessage,
            timestamp: new Date(Date.now() + 100),
            type: 'system',
            isMarkdown: false,
          };
          await StorageService.addEntry(systemEntry);
          await loadEntries();
        }
      }

      // Clear force flags
      setForceExpense(false);
      setForceAction(false);
      
      // Show expense error if needed
      if (expenseError) {
        setTimeout(() => {
          Alert.alert(
            "No Amount Found",
            "Please include a numeric amount in your entry (e.g., 150, Rs200, $50)"
          );
        }, 100);
      }
      
      // Scroll to bottom (offset 0 for inverted list) to show the new message
      // Use multiple attempts with longer delays for mobile
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 300);
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 500);
      
      // Refocus the text input for better UX
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Error processing message:', error);
      showToast('Failed to process message');
    }
  };

  const addSingleTestEntry = () => {
    if (testIndex >= testEntries.length) {
      setTestIndex(0);
    }
    setInputText(testEntries[testIndex]);
    setTestIndex(testIndex + 1);
  };

  const handleLongPress = useCallback((entry: Entry) => {
    const options: any[] = [
      {
        text: "Edit Entry",
        onPress: () => handleEditEntry(entry),
      },
    ];
    
    // Add type conversion options
    if (entry.type !== "expense") {
      options.push({
        text: "Mark as Expense",
        onPress: () => markAsExpense(entry),
      });
    }
    
    if (entry.type !== "action") {
      options.push({
        text: "Mark as Action Item",
        onPress: () => markAsActionItem(entry),
      });
    }
    
    if (entry.type !== "log") {
      options.push({
        text: "Remove Category",
        onPress: () => removeCategory(entry),
      });
    }
    
    options.push(
      {
        text: "Delete Entry",
        onPress: () => handleDeleteEntry(entry),
        style: "destructive",
      },
      {
        text: "Cancel",
        style: "cancel",
      }
    );
    
    Alert.alert("Entry Options", "What would you like to do with this entry?", options);
  }, []);

  const markAsExpense = useCallback(async (entry: Entry) => {
    if (entry.type === "expense") return;

    const expenseInfo = TextAnalyzer.extractExpenseInfo(entry.text, entry.id);
    if (expenseInfo) {
      expenseInfo.autoDetected = false; // Manually categorized
      await StorageService.addExpense(expenseInfo);
      await updateEntryType(entry.id, "expense");
      // Reload expenses to show updated categorization
      await loadExpensesAndActions();
    } else {
      Alert.alert(
        "Cannot Extract Expense",
        "Could not find amount information in this entry. Please ensure it contains a monetary value."
      );
    }
  }, []);

  const markAsActionItem = useCallback(async (entry: Entry) => {
    if (entry.type === "action") return;

    // Try to extract using TextAnalyzer, but if that fails, create manually
    let actionItem = TextAnalyzer.extractActionItem(entry.text, entry.id);
    
    if (!actionItem) {
      // Create action item manually from the text
      actionItem = {
        id: uuid.v4(),
        entryId: entry.id,
        title: entry.text.replace(/^✅\s*/, ''), // Remove checkmark if present
        completed: false,
        createdAt: new Date(),
        autoDetected: false
      };
    } else {
      actionItem.autoDetected = false; // Manually categorized
    }
    
    await StorageService.addActionItem(actionItem);
    await updateEntryType(entry.id, "action");
    // Reload action items to show updated categorization
    await loadExpensesAndActions();
  }, []);

  const removeCategory = useCallback(async (entry: Entry) => {
    try {
      // Remove associated expense or action item
      if (entry.type === "expense") {
        const expense = expenses.find(e => e.entryId === entry.id);
        if (expense) {
          await StorageService.deleteExpense(expense.id);
        }
      } else if (entry.type === "action") {
        const actionItem = actionItems.find(a => a.entryId === entry.id);
        if (actionItem) {
          await StorageService.deleteActionItem(actionItem.id);
        }
      }
      
      // Update entry type to log
      await updateEntryType(entry.id, "log");
      await loadExpensesAndActions();
      showToast("Category removed");
    } catch (error) {
      console.error('Error removing category:', error);
      showToast('Failed to remove category');
    }
  }, [expenses, actionItems]);

  const handleDeleteEntry = useCallback(async (entry: Entry) => {
    const confirmDelete = async () => {
      try {
        // Delete associated expense or action item first
        if (entry.type === "expense") {
          const expense = expenses.find(e => e.entryId === entry.id);
          if (expense) {
            await StorageService.deleteExpense(expense.id);
          }
        } else if (entry.type === "action") {
          const actionItem = actionItems.find(a => a.entryId === entry.id);
          if (actionItem) {
            await StorageService.deleteActionItem(actionItem.id);
          }
        }
        
        // Delete the entry
        const currentEntries = await StorageService.getEntries();
        const updatedEntries = currentEntries.filter(e => e.id !== entry.id);
        await StorageService.saveEntries(updatedEntries);
        
        // Reload data
        await loadEntries();
        await loadExpensesAndActions();
      } catch (error) {
        console.error('Error deleting entry:', error);
      }
    };
    
    if (Platform.OS === 'web') {
      if (confirm("Are you sure you want to delete this entry?")) {
        await confirmDelete();
      }
    } else {
      Alert.alert(
        "Delete Entry",
        "Are you sure you want to delete this entry?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: confirmDelete,
          },
        ]
      );
    }
  }, [expenses, actionItems]);

  const handleEditEntry = useCallback((entry: Entry) => {
    setEditingEntry(entry);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    await loadEntries();
    await loadExpensesAndActions();
  }, []);

  const updateEntryType = useCallback(async (entryId: string, newType: Entry["type"]) => {
    try {
      // Get the latest entries from storage instead of using state
      const currentEntries = await StorageService.getEntries();
      
      const updatedEntries = currentEntries.map((entry: Entry) =>
        entry.id === entryId ? { ...entry, type: newType } : entry
      );
      
      await StorageService.saveEntries(updatedEntries);
      
      // Reload entries to refresh the UI
      await loadEntries();
    } catch (error) {
      console.error('Error updating entry type:', error);
      showToast('Failed to update entry type');
    }
  }, []);

  // Export functions
  const exportAsText = async () => {
    try {
      const allEntries = await StorageService.getEntries();
      const allExpenses = await StorageService.getExpenses();
      const allActionItems = await StorageService.getActionItems();
      
      let text = '='.repeat(50) + '\n';
      text += 'SMPL JOURNAL EXPORT\n';
      text += format(new Date(), 'MMMM dd, yyyy - hh:mm a') + '\n';
      text += '='.repeat(50) + '\n\n';
      
      allEntries.forEach(entry => {
        // Skip system messages
        if (entry.type === 'system') return;
        
        const date = format(new Date(entry.timestamp), 'MMM dd, yyyy - hh:mm a');
        const expense = allExpenses.find(e => e.entryId === entry.id);
        const action = allActionItems.find(a => a.entryId === entry.id);
        
        let icon = '✏️';
        if (entry.type === 'expense' || expense) icon = '💰';
        else if (entry.type === 'action' || action) icon = '✅';
        
        text += `${icon} ${date}\n`;
        text += `${entry.text}\n`;
        
        if (expense) {
          text += `   Amount: ${TextAnalyzer.formatCurrency(expense.amount, expense.currency)}`;
          if (expense.category) text += ` | Category: ${expense.category}`;
          text += '\n';
        }
        
        if (action) {
          text += `   Task: ${action.title}\n`;
          text += `   Status: ${action.completed ? '✓ Completed' : '○ Pending'}\n`;
        }
        
        text += '\n' + '-'.repeat(50) + '\n\n';
      });
      
      if (Platform.OS === 'web') {
        // Web: Create blob and download
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `smpl-journal-export-${format(new Date(), 'yyyy-MM-dd')}.txt`;
        link.click();
        URL.revokeObjectURL(url);
        showToast('Exported successfully');
      } else {
        // Mobile: Save to file system and share
        const fileName = `smpl-journal-export-${format(new Date(), 'yyyy-MM-dd')}.txt`;
        const file = new FileSystem.File(FileSystem.Paths.cache, fileName);
        await file.write(text);
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/plain',
          dialogTitle: 'Export Journal Data',
        });
        showToast('Export completed');
      }
    } catch (error) {
      console.error('Export error:', error);
      showToast('Export failed');
    }
  };

  const exportAsJSON = async () => {
    try {
      const allEntries = await StorageService.getEntries();
      const allExpenses = await StorageService.getExpenses();
      const allActionItems = await StorageService.getActionItems();
      
      const data = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        entries: allEntries,
        expenses: allExpenses,
        actionItems: allActionItems
      };
      
      const json = JSON.stringify(data, null, 2);
      
      if (Platform.OS === 'web') {
        // Web: Create blob and download
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `smpl-journal-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
        link.click();
        URL.revokeObjectURL(url);
        showToast('Exported successfully');
      } else {
        // Mobile: Save to file system and share
        const fileName = `smpl-journal-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
        const file = new FileSystem.File(FileSystem.Paths.cache, fileName);
        await file.write(json);
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Journal Data',
        });
        showToast('Export completed');
      }
    } catch (error) {
      console.error('Export error:', error);
      showToast('Export failed');
    }
  };

  const importData = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web: Use file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e: any) => {
          const file = e.target.files[0];
          if (!file) return;
          
          const reader = new FileReader();
          reader.onload = async (event: any) => {
            try {
              const data = JSON.parse(event.target.result);
              
              if (!data.entries || !Array.isArray(data.entries)) {
                showToast('Invalid file format');
                return;
              }
              
              // Confirm before importing
              const confirmed = window.confirm(
                `Import ${data.entries.length} entries? This will merge with existing data.`
              );
              
              if (!confirmed) return;
              
              // Get existing data
              const existingEntries = await StorageService.getEntries();
              const existingExpenses = await StorageService.getExpenses();
              const existingActionItems = await StorageService.getActionItems();
              
              // Merge data (avoid duplicates by ID)
              const existingEntryIds = new Set(existingEntries.map(e => e.id));
              const newEntries = data.entries.filter((e: Entry) => !existingEntryIds.has(e.id));
              
              const existingExpenseIds = new Set(existingExpenses.map(e => e.id));
              const newExpenses = (data.expenses || []).filter((e: Expense) => !existingExpenseIds.has(e.id));
              
              const existingActionIds = new Set(existingActionItems.map(a => a.id));
              const newActionItems = (data.actionItems || []).filter((a: ActionItem) => !existingActionIds.has(a.id));
              
              // Save merged data
              await StorageService.saveEntries([...existingEntries, ...newEntries]);
              await StorageService.saveExpenses([...existingExpenses, ...newExpenses]);
              await StorageService.saveActionItems([...existingActionItems, ...newActionItems]);
              
              await loadEntries();
              await loadExpensesAndActions();
              showToast(`Imported ${newEntries.length} new entries`);
            } catch (error) {
              console.error('Import error:', error);
              showToast('Import failed - invalid file');
            }
          };
          reader.readAsText(file);
        };
        
        input.click();
      } else {
        // Mobile: Use document picker
        const result = await DocumentPicker.getDocumentAsync({
          type: 'application/json',
          copyToCacheDirectory: true,
        });
        
        if (result.canceled) return;
        
        const fileUri = result.assets[0].uri;
        const file = new FileSystem.File(fileUri);
        const fileContent = await file.text();
        
        const data = JSON.parse(fileContent);
        
        if (!data.entries || !Array.isArray(data.entries)) {
          showToast('Invalid file format');
          return;
        }
        
        // Confirm before importing
        const confirmed = await new Promise<boolean>(resolve => {
          Alert.alert(
            'Import Data',
            `Import ${data.entries.length} entries? This will merge with existing data.`,
            [
              { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
              { text: 'Import', onPress: () => resolve(true) }
            ]
          );
        });
        
        if (!confirmed) return;
        
        // Get existing data
        const existingEntries = await StorageService.getEntries();
        const existingExpenses = await StorageService.getExpenses();
        const existingActionItems = await StorageService.getActionItems();
        
        // Merge data (avoid duplicates by ID)
        const existingEntryIds = new Set(existingEntries.map(e => e.id));
        const newEntries = data.entries.filter((e: Entry) => !existingEntryIds.has(e.id));
        
        const existingExpenseIds = new Set(existingExpenses.map(e => e.id));
        const newExpenses = (data.expenses || []).filter((e: Expense) => !existingExpenseIds.has(e.id));
        
        const existingActionIds = new Set(existingActionItems.map(a => a.id));
        const newActionItems = (data.actionItems || []).filter((a: ActionItem) => !existingActionIds.has(a.id));
        
        // Save merged data
        await StorageService.saveEntries([...existingEntries, ...newEntries]);
        await StorageService.saveExpenses([...existingExpenses, ...newExpenses]);
        await StorageService.saveActionItems([...existingActionItems, ...newActionItems]);
        
        await loadEntries();
        await loadExpensesAndActions();
        showToast(`Imported ${newEntries.length} new entries`);
      }
    } catch (error) {
      console.error('Import error:', error);
      showToast('Import failed');
    }
  };

  const createBackup = async () => {
    try {
      const allEntries = await StorageService.getEntries();
      const allExpenses = await StorageService.getExpenses();
      const allActionItems = await StorageService.getActionItems();
      
      const backup = {
        timestamp: new Date().toISOString(),
        entries: allEntries,
        expenses: allExpenses,
        actionItems: allActionItems
      };
      
      await StorageService.saveBackup(backup);
      showToast('Backup created successfully');
    } catch (error) {
      console.error('Backup error:', error);
      showToast('Backup failed');
    }
  };

  const restoreFromBackup = async () => {
    try {
      const backup = await StorageService.getBackup();
      
      if (!backup) {
        showToast('No backup found');
        return;
      }
      
      const confirmed = Platform.OS === 'web' 
        ? window.confirm(`Restore backup from ${format(new Date(backup.timestamp), 'MMM dd, yyyy hh:mm a')}? This will replace current data.`)
        : await new Promise(resolve => {
            Alert.alert(
              'Restore Backup',
              `Restore backup from ${format(new Date(backup.timestamp), 'MMM dd, yyyy hh:mm a')}? This will replace current data.`,
              [
                { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
                { text: 'Restore', onPress: () => resolve(true) }
              ]
            );
          });
      
      if (!confirmed) return;
      
      await StorageService.saveEntries(backup.entries);
      await StorageService.saveExpenses(backup.expenses);
      await StorageService.saveActionItems(backup.actionItems);
      
      await loadEntries();
      showToast('Restored successfully');
    } catch (error) {
      console.error('Restore error:', error);
      showToast('Restore failed');
    }
  };

  const renderChatEntry = useCallback((item: Entry, expense?: Expense, actionItem?: ActionItem) => (
    <MessageBubble 
      entry={item} 
      onLongPress={handleLongPress}
      onEdit={handleEditEntry}
      onDelete={handleDeleteEntry}
      markdownStyles={markdownStyles}
      expense={expense}
      actionItem={actionItem}
    />
  ), [handleLongPress, handleEditEntry, handleDeleteEntry]);

  const renderCardEntry = useCallback((item: Entry, expense?: Expense, actionItem?: ActionItem) => (
    <View style={layoutStyles.cardContainer}>
      <MessageBubble 
        entry={item} 
        onLongPress={handleLongPress}
        onEdit={handleEditEntry}
        onDelete={handleDeleteEntry}
        markdownStyles={markdownStyles}
        expense={expense}
        actionItem={actionItem}
      />
    </View>
  ), [handleLongPress, handleEditEntry, handleDeleteEntry]);

  const renderListEntry = useCallback((item: Entry, expense?: Expense, actionItem?: ActionItem) => (
    <View style={layoutStyles.listContainer}>
      <MessageBubble 
        entry={item} 
        onLongPress={handleLongPress}
        onEdit={handleEditEntry}
        onDelete={handleDeleteEntry}
        markdownStyles={markdownStyles}
        expense={expense}
        actionItem={actionItem}
      />
    </View>
  ), [handleLongPress, handleEditEntry, handleDeleteEntry]);

  const renderTimelineEntry = useCallback((item: Entry, expense?: Expense, actionItem?: ActionItem) => (
    <View style={layoutStyles.timelineContainer}>
      <View style={layoutStyles.timelineLeft}>
        <View style={layoutStyles.timelineDot} />
        <View style={layoutStyles.timelineLine} />
      </View>
      <View style={layoutStyles.timelineContent}>
        <MessageBubble 
          entry={item} 
          onLongPress={handleLongPress}
          onEdit={handleEditEntry}
          onDelete={handleDeleteEntry}
          markdownStyles={markdownStyles}
          expense={expense}
          actionItem={actionItem}
        />
      </View>
    </View>
  ), [handleLongPress, handleEditEntry, handleDeleteEntry]);

  const renderMagazineEntry = useCallback((item: Entry, expense?: Expense, actionItem?: ActionItem) => (
    <View style={layoutStyles.magazineContainer}>
      <MessageBubble 
        entry={item} 
        onLongPress={handleLongPress}
        onEdit={handleEditEntry}
        onDelete={handleDeleteEntry}
        markdownStyles={markdownStyles}
        expense={expense}
        actionItem={actionItem}
      />
    </View>
  ), [handleLongPress, handleEditEntry, handleDeleteEntry]);

  const renderMinimalEntry = useCallback((item: Entry, expense?: Expense, actionItem?: ActionItem) => (
    <MinimalEntryItem 
      item={item}
      expense={expense}
      actionItem={actionItem}
      onEdit={handleEditEntry}
      onDelete={handleDeleteEntry}
      markdownStyles={markdownStyles}
      layoutStyles={layoutStyles}
    />
  ), [handleEditEntry, handleDeleteEntry]);

  // Render date separator component
  const renderDateSeparator = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    let displayDate;
    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      displayDate = 'Today';
    } else if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      displayDate = 'Yesterday';
    } else {
      displayDate = format(date, 'EEEE, MMMM d, yyyy');
    }

    return (
      <View style={dynamicStyles.dateSeparator}>
        <View style={dynamicStyles.dateSeparatorLine} />
        <Text style={dynamicStyles.dateSeparatorText}>{displayDate}</Text>
        <View style={dynamicStyles.dateSeparatorLine} />
      </View>
    );
  }, []);

  const renderItem = useCallback(({ item }: { item: any }) => {
    // Handle date separator
    if ('type' in item && item.type === 'dateSeparator') {
      return renderDateSeparator(item.date);
    }

    // Handle regular entry - expense and actionItem are pre-attached as _expense and _actionItem
    const entry = item as Entry;
    const expense = (item as any)._expense;
    const actionItem = (item as any)._actionItem;
    
    switch (layoutStyle) {
      case 'cards':
        return renderCardEntry(entry, expense, actionItem);
      case 'list':
        return renderListEntry(entry, expense, actionItem);
      case 'timeline':
        return renderTimelineEntry(entry, expense, actionItem);
      case 'magazine':
        return renderMagazineEntry(entry, expense, actionItem);
      case 'minimal':
        // Skip system feedback messages in minimal view
        if (entry.type === 'system') return null;
        return renderMinimalEntry(entry, expense, actionItem);
      case 'chat':
      default:
        return renderChatEntry(entry, expense, actionItem);
    }
  }, [layoutStyle, renderChatEntry, renderCardEntry, renderListEntry, renderTimelineEntry, renderMagazineEntry, renderMinimalEntry, renderDateSeparator]);

  // Get data with date separators and merge expense/action data - memoized to prevent recalculation
  const dataWithSeparators = useMemo(() => {
    const baseEntries = showSearch ? filteredEntries : entries;
    
    // Enrich entries with their associated expense/action data
    const enrichedEntries = baseEntries.map(entry => {
      const expense = entry.type === 'expense' ? expenses.find(e => e.entryId === entry.id) : undefined;
      const actionItem = entry.type === 'action' ? actionItems.find(a => a.entryId === entry.id) : undefined;
      return { ...entry, _expense: expense, _actionItem: actionItem };
    });
    
    const data = createEntriesWithDateSeparators(enrichedEntries);
    // Reverse the data so newest messages are first (will appear at bottom when inverted)
    return data.reverse();
  }, [showSearch, filteredEntries, entries, expenses, actionItems, createEntriesWithDateSeparators]);

  const dynamicStyles = useMemo(() => getStyles(theme), [theme]);
  const layoutStyles = useMemo(() => getLayoutStyles(theme), [theme]);
  const markdownStyles = useMemo(() => getMarkdownStyles(theme), [theme]);

  // Memoize list style to prevent recalculation
  const listStyle = useMemo(() => getListStyle(layoutStyle), [layoutStyle, theme]);

  // Memoize keyExtractor to prevent unnecessary re-renders
  const keyExtractor = useCallback((item: Entry | { type: 'dateSeparator'; date: string; id: string }) => {
    if ('type' in item && item.type === 'dateSeparator') {
      return item.id;
    }
    return (item as Entry).id;
  }, []);

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <View style={[dynamicStyles.header, { zIndex: 10000 }]}>
        <Text style={dynamicStyles.headerTitle}>Smpl Journal</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', zIndex: 10001 }}>
          <TouchableOpacity
            style={[dynamicStyles.settingsButton, { marginRight: 8, zIndex: 10004 }]}
            onPress={addSingleTestEntry}
          >
            <Text style={dynamicStyles.settingsButtonText}>🧪</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[dynamicStyles.settingsButton, { marginRight: 8, zIndex: 10002 }]}
            onPress={() => {
              setShowSearch(!showSearch);
            }}
          >
            <Text style={dynamicStyles.settingsButtonText}>🔍</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[dynamicStyles.settingsButton, { zIndex: 10003 }]}
            onPress={() => {
              setShowSettings(true);
            }}
          >
            <Text style={dynamicStyles.settingsButtonText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showSearch && (
        <View style={dynamicStyles.searchContainer}>
          <View style={dynamicStyles.searchSection}>
            <Text style={dynamicStyles.searchLabel}>Search by Text:</Text>
            <View style={dynamicStyles.searchRow}>
              <TextInput
                style={dynamicStyles.searchInput}
                placeholder="Search entries..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={dynamicStyles.clearButton}
                  onPress={() => setSearchQuery("")}
                >
                  <Text style={dynamicStyles.clearButtonText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={dynamicStyles.dateSection}>
            <Text style={dynamicStyles.searchLabel}>Filter by Date:</Text>
            {Platform.OS === 'web' ? (
              <View style={dynamicStyles.datePickerButtonLarge}>
                <Text style={dynamicStyles.datePickerIconLarge}>📅</Text>
                <input
                  type="date"
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    fontSize: 16,
                    color: theme.text,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(new Date(e.target.value));
                    } else {
                      setSelectedDate(null);
                    }
                  }}
                  value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                  placeholder="Select Date"
                />
                {selectedDate && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectedDate(null);
                    }}
                    style={dynamicStyles.datePickerClear}
                  >
                    <Text style={dynamicStyles.datePickerClearText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={dynamicStyles.datePickerButtonLarge}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={dynamicStyles.datePickerIconLarge}>📅</Text>
                <Text style={dynamicStyles.datePickerButtonLabel}>
                  {selectedDate ? format(selectedDate, 'MMM dd, yyyy') : 'Select Date'}
                </Text>
                {selectedDate && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectedDate(null);
                    }}
                    style={dynamicStyles.datePickerClear}
                  >
                    <Text style={dynamicStyles.datePickerClearText}>✕</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            )}
          </View>

          {(searchQuery || selectedDate) && (
            <TouchableOpacity
              style={dynamicStyles.clearAllButton}
              onPress={() => {
                setSearchQuery("");
                setSelectedDate(null);
              }}
            >
              <Text style={dynamicStyles.clearAllButtonText}>Clear All Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={dataWithSeparators}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        style={[dynamicStyles.messagesList, listStyle]}
        showsVerticalScrollIndicator={false}
        inverted
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={15}
        windowSize={21}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
        ListEmptyComponent={() => {
          // Show message when searching or filtering by date
          if (showSearch && (searchQuery.trim() || selectedDate)) {
            let message = '';
            if (searchQuery.trim() && selectedDate) {
              message = `No entries found matching "${searchQuery}" on ${format(selectedDate, 'MMM dd, yyyy')}`;
            } else if (searchQuery.trim()) {
              message = `No entries found matching "${searchQuery}"`;
            } else if (selectedDate) {
              message = `No entries found on ${format(selectedDate, 'MMM dd, yyyy')}`;
            }
            return (
              <View style={{ padding: 20, alignItems: 'center', transform: [{ scaleY: -1 }] }}>
                <Text style={{ color: theme.textSecondary, fontSize: 16, textAlign: 'center' }}>
                  {message}
                </Text>
              </View>
            );
          }
          return null;
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={dynamicStyles.inputContainer}>
          <View style={dynamicStyles.quickActionsRow}>
          <TouchableOpacity
            style={[
              dynamicStyles.quickActionButton,
              forceExpense && dynamicStyles.quickActionButtonActive,
            ]}
            onPress={() => {
              setForceExpense(!forceExpense);
              if (!forceExpense) setForceAction(false); // Clear task when enabling expense
            }}
          >
            <Text style={[dynamicStyles.quickActionText, forceExpense && dynamicStyles.quickActionTextActive]}>💰</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              dynamicStyles.quickActionButton,
              forceAction && dynamicStyles.quickActionButtonActive,
            ]}
            onPress={() => {
              setForceAction(!forceAction);
              if (!forceAction) setForceExpense(false); // Clear expense when enabling task
            }}
          >
            <Text style={[dynamicStyles.quickActionText, forceAction && dynamicStyles.quickActionTextActive]}>✅</Text>
          </TouchableOpacity>
        </View>
        <View style={dynamicStyles.inputRow}>
          <TextInput
            ref={textInputRef}
            style={dynamicStyles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={
              forceExpense
                ? "Type expense (e.g., 150 for coffee)..."
                : forceAction
                ? "Type task description..."
                : isMarkdown
                ? "Type a message (Markdown supported)..."
                : "Type a message..."
            }
            multiline
            maxLength={1000}
            onSubmitEditing={enterToSend ? handleSendMessage : undefined}
            blurOnSubmit={enterToSend}
            returnKeyType={enterToSend ? "send" : "default"}
          />
          <TouchableOpacity
            style={[
              dynamicStyles.sendButton,
              !inputText.trim() && dynamicStyles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
          >
            <Text style={{ 
              color: theme.surface, 
              fontSize: 22, 
              fontWeight: 'bold',
            }}>▶</Text>
          </TouchableOpacity>
        </View>
        </View>
      </KeyboardAvoidingView>
      
      {showSettings && (
        <Modal
          visible={showSettings}
          animationType="slide"
          presentationStyle="formSheet"
        >
          <SettingsScreen 
            onClose={() => {
              setShowSettings(false);
              // Reload settings after closing
              loadSettings();
            }}
            onExportText={exportAsText}
            onExportJSON={exportAsJSON}
            onImport={importData}
            onBackup={createBackup}
            onRestore={restoreFromBackup}
            onShowAuth={() => {
              setShowSettings(false);
              setShowAuth(true);
            }}
          />
        </Modal>
      )}
      
      {showAuth && (
        <Modal
          visible={showAuth}
          animationType="slide"
          presentationStyle="formSheet"
        >
          <AuthScreen 
            onClose={() => {
              setShowAuth(false);
            }}
            onAuthSuccess={() => {
              setShowAuth(false);
              Alert.alert('Success', 'Signed in successfully! Cloud sync is now enabled.');
            }}
          />
        </Modal>
      )}
      
      <EditModal
        visible={!!editingEntry}
        entry={editingEntry}
        expense={editingEntry ? expenses.find(e => e.entryId === editingEntry.id) : null}
        actionItem={editingEntry ? actionItems.find(a => a.entryId === editingEntry.id) : null}
        onClose={() => setEditingEntry(null)}
        onSave={handleSaveEdit}
      />
      
      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal
          visible={showDatePicker}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <TouchableOpacity 
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <TouchableOpacity 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 400 }}
            >
              <View style={dynamicStyles.datePickerContent}>
                <View style={dynamicStyles.datePickerHeader}>
                  <Text style={dynamicStyles.datePickerTitle}>Select Date</Text>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                    style={dynamicStyles.datePickerClose}
                  >
                    <Text style={dynamicStyles.datePickerCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={dynamicStyles.datePickerQuickButtons}>
                  <TouchableOpacity
                    style={dynamicStyles.quickDateButton}
                    onPress={() => {
                      setSelectedDate(new Date());
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={dynamicStyles.quickDateButtonText}>Today</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={dynamicStyles.quickDateButton}
                    onPress={() => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      setSelectedDate(yesterday);
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={dynamicStyles.quickDateButtonText}>Yesterday</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={dynamicStyles.quickDateButton}
                    onPress={() => {
                      const lastWeek = new Date();
                      lastWeek.setDate(lastWeek.getDate() - 7);
                      setSelectedDate(lastWeek);
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={dynamicStyles.quickDateButtonText}>Last Week</Text>
                  </TouchableOpacity>
                </View>
                
                {Platform.OS === 'web' && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 8, fontWeight: '600' }}>Or pick a specific date:</Text>
                    <input
                      type="date"
                      style={{
                        width: '100%',
                        padding: 12,
                        fontSize: 16,
                        borderRadius: 8,
                        border: '1px solid #ddd',
                        boxSizing: 'border-box',
                      }}
                      onChange={(e) => {
                        if (e.target.value) {
                          setSelectedDate(new Date(e.target.value));
                          setShowDatePicker(false);
                        }
                      }}
                      defaultValue={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                    />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.text,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  searchSection: {
    marginBottom: 12,
  },
  dateSection: {
    marginBottom: 8,
  },
  searchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 6,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    backgroundColor: theme.input,
    borderRadius: 8,
    fontSize: 16,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
  },
  datePickerButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.input,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: 40,
  },
  datePickerIconLarge: {
    fontSize: 20,
    marginRight: 8,
  },
  datePickerButtonLabel: {
    flex: 1,
    fontSize: 16,
    color: theme.text,
  },
  datePickerClear: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerClearText: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: 'bold',
  },
  clearButton: {
    marginLeft: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearAllButton: {
    backgroundColor: theme.error,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  clearAllButtonText: {
    color: theme.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  clearButtonText: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: 'bold',
  },
  settingsButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.input,
    marginLeft: 8,
  },
  settingsButtonText: {
    fontSize: 16,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inputContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    paddingBottom: Platform.OS === "ios" ? 4 : 4,
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  quickActionsRow: {
    flexDirection: "row",
    marginBottom: 3,
    gap: 4,
  },
  quickActionButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: theme.input,
    borderWidth: 2,
    borderColor: theme.border,
  },
  quickActionButtonActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  quickActionText: {
    fontSize: 18,
  },
  quickActionTextActive: {
    transform: [{ scale: 1.1 }],
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 9,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: theme.input,
    color: theme.text,
  },
  sendButton: {
    backgroundColor: theme.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: theme.border,
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  editModalContent: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 500,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: theme.text,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.textSecondary,
    marginTop: 12,
    marginBottom: 6,
  },
  editInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: theme.input,
    color: theme.text,
  },
  editTextInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: theme.input,
    color: theme.text,
    minHeight: 80,
    maxHeight: 200,
    textAlignVertical: "top",
  },
  editModalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
    gap: 12,
  },
  editModalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  editModalButtonCancel: {
    backgroundColor: theme.input,
  },
  editModalButtonSave: {
    backgroundColor: theme.primary,
  },
  editModalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.text,
  },
  categoryButtons: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.input,
    borderWidth: 2,
    borderColor: theme.border,
    alignItems: "center",
  },
  categoryButtonActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.text,
  },
  markdownToggle: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: theme.input,
    borderWidth: 1,
    borderColor: theme.border,
  },
  markdownToggleActive: {
    backgroundColor: theme.success + '33',
    borderColor: theme.success,
  },
  markdownToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.text,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 8,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.border,
  },
  dateSeparatorText: {
    marginHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
    backgroundColor: theme.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  datePickerContent: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
  },
  datePickerClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerCloseText: {
    fontSize: 20,
    color: theme.text,
    fontWeight: 'bold',
  },
  datePickerQuickButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  quickDateButton: {
    flex: 1,
    backgroundColor: theme.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickDateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

const getLayoutStyles = (theme: any) => StyleSheet.create({
  // Card Layout Styles
  cardContainer: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    marginVertical: 6,
    marginHorizontal: 8,
    shadowColor: theme.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.input,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  cardDate: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  cardTime: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  cardContent: {
    padding: 16,
  },
  cardText: {
    fontSize: 16,
    lineHeight: 22,
    color: theme.text,
    marginBottom: 8,
  },
  expenseTag: {
    backgroundColor: theme.success + '33',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  expenseText: {
    fontSize: 12,
    color: theme.success,
    fontWeight: '500',
  },
  actionTag: {
    backgroundColor: theme.info + '33',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  actionText: {
    fontSize: 12,
    color: theme.info,
    fontWeight: '500',
  },
  
  // List Layout Styles
  listContainer: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  listLeft: {
    alignItems: 'center',
    marginRight: 16,
    width: 60,
  },
  listTime: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  listIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.primary,
  },
  listContent: {
    flex: 1,
  },
  listText: {
    fontSize: 16,
    lineHeight: 22,
    color: theme.text,
    marginBottom: 6,
  },
  listMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  listExpense: {
    fontSize: 12,
    color: theme.success,
    fontWeight: '500',
  },
  listAction: {
    fontSize: 12,
    color: theme.primary,
    fontWeight: '500',
  },
  
  // Timeline Layout Styles
  timelineContainer: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
    width: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.primary,
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: theme.border,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 16,
    shadowColor: theme.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timelineDate: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '500',
    marginBottom: 8,
  },
  timelineText: {
    fontSize: 16,
    lineHeight: 22,
    color: theme.text,
  },
  timelineTags: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  timelineExpense: {
    fontSize: 12,
    color: theme.success,
    backgroundColor: theme.success + '33',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  timelineAction: {
    fontSize: 12,
    color: theme.primary,
    backgroundColor: theme.info + '33',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  
  // Magazine Layout Styles
  magazineContainer: {
    backgroundColor: theme.surface,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: theme.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  magazineHeader: {
    backgroundColor: theme.primaryDark || theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  magazineDate: {
    fontSize: 14,
    color: theme.surface,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  magazineBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  magazineText: {
    fontSize: 17,
    lineHeight: 26,
    color: theme.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  magazineFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 16,
  },
  magazineExpenseBlock: {
    flex: 1,
  },
  magazineExpenseLabel: {
    fontSize: 10,
    color: theme.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  magazineExpenseAmount: {
    fontSize: 16,
    color: theme.success,
    fontWeight: '600',
  },
  magazineActionBlock: {
    flex: 1,
  },
  magazineActionLabel: {
    fontSize: 10,
    color: theme.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  magazineActionText: {
    fontSize: 16,
    color: theme.primary,
    fontWeight: '600',
  },
  
  // Minimal Layout Styles
  minimalContainer: {
    flexDirection: 'row',
    paddingVertical: 0,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  minimalContent: {
    flex: 1,
    marginRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  minimalText: {
    fontSize: 16,
    color: theme.text,
  },
  minimalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  minimalTime: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  minimalExpense: {
    fontSize: 12,
    color: theme.success,
  },
  minimalAction: {
    fontSize: 12,
    color: theme.primary,
  },
  datePickerContent: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    shadowColor: theme.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  datePickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
  },
  datePickerClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerCloseText: {
    fontSize: 18,
    color: theme.textSecondary,
    fontWeight: 'bold',
  },
  datePickerQuickButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  quickDateButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.primary,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  quickDateButtonText: {
    color: theme.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  mobileDatePicker: {
    padding: 20,
    alignItems: 'center',
  },
  mobileDatePickerText: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
  },
});

const getMarkdownStyles = (theme: any) => StyleSheet.create({
  body: {
    fontSize: 16,
    color: theme.text,
    lineHeight: 20,
  },
  heading1: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 12,
    paddingVertical: 4,
    color: theme.text,
  },
  heading2: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
    color: theme.text,
  },
  strong: {
    fontWeight: "bold",
    color: theme.text,
  },
  em: {
    fontStyle: "italic",
    color: theme.text,
  },
  code_inline: {
    backgroundColor: theme.input,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    fontFamily: "monospace",
    color: theme.text,
  },
});
