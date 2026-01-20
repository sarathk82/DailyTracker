import React, { useState, useEffect, useCallback, useRef } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// import { Ionicons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import { format } from "date-fns";

import { Entry, Expense, ActionItem } from "../types";
import { StorageService } from "../utils/storage";
import { TextAnalyzer } from "../utils/textAnalysis";
import { MessageBubble } from "../components/MessageBubble";
import { MinimalEntryItem } from "../components/MinimalEntryItem";
import { SettingsScreen } from "./SettingsScreen";
import { isDesktop } from "../utils/platform";

// Custom UUID function since react-native-uuid causes crashes
const uuid = {
  v4: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};
export const JournalScreen: React.FC<{}> = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [inputText, setInputText] = useState("");
  const [isMarkdown, setIsMarkdown] = useState(true);
  const [testIndex, setTestIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);
  const shouldAutoScrollRef = useRef(false);
  const isInitialLoadRef = useRef(true);
  const hasScrolledToBottomRef = useRef(false);
  
  // Settings state (will be loaded from storage)
  const [enterToSend, setEnterToSend] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [layoutStyle, setLayoutStyle] = useState('chat');
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [filteredEntries, setFilteredEntries] = useState<Entry[]>([]);
  


  // Data for enhanced messages
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  
  // Quick-action tags for explicit categorization
  const [forceExpense, setForceExpense] = useState(false);
  const [forceAction, setForceAction] = useState(false);
  
  // Edit modal state
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editText, setEditText] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");

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
    // Sort entries by timestamp to maintain chronological order
    const sortedEntries = savedEntries.sort((a, b) => {
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

  // Filter entries based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEntries(entries);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = entries.filter(entry => {
      // Search in entry text
      if (entry.text.toLowerCase().includes(query)) {
        return true;
      }
      
      // Search in date (various formats)
      const entryDate = format(entry.timestamp, 'yyyy-MM-dd');
      const entryDateLong = format(entry.timestamp, 'MMMM dd, yyyy');
      const entryDateShort = format(entry.timestamp, 'MMM dd');
      
      if (entryDate.includes(query) || 
          entryDateLong.toLowerCase().includes(query) || 
          entryDateShort.toLowerCase().includes(query)) {
        return true;
      }
      
      // Search by entry type
      if (entry.type.toLowerCase().includes(query)) {
        return true;
      }
      
      return false;
    });
    
    setFilteredEntries(filtered);
  }, [searchQuery, entries]);

  const getListStyle = (layout: string) => {
    switch (layout) {
      case 'cards':
        return { paddingHorizontal: 8 };
      case 'list':
        return { paddingHorizontal: 0, backgroundColor: '#fff' };
      case 'timeline':
        return { paddingHorizontal: 0, backgroundColor: '#f8f9fa' };
      case 'magazine':
        return { paddingHorizontal: 0, backgroundColor: '#f5f5f5' };
      case 'minimal':
        return { paddingHorizontal: 0, backgroundColor: '#fff' };
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
      setExpenses(savedExpenses);
      setActionItems(savedActionItems);
    } catch (error) {
      console.error('Error loading expenses and action items:', error);
    }
  }, []);

  useEffect(() => {
    loadEntries();
    loadSettings();
    loadExpensesAndActions();
  }, [loadEntries, loadSettings, loadExpensesAndActions]);

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
      // Convert dot-prefix to checkbox format for display
      let displayText = trimmedInput;
      const autoDetectedAction = TextAnalyzer.detectActionItem(trimmedInput);
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
      
      // Check for expense (auto-detect OR user explicitly marked it)
      const autoDetectedExpense = TextAnalyzer.detectExpense(trimmedInput);
      if (autoDetectedExpense || forceExpense) {
        const expenseInfo = TextAnalyzer.extractExpenseInfo(trimmedInput, entry.id);
        if (expenseInfo) {
          // Add autoDetected flag
          expenseInfo.autoDetected = autoDetectedExpense && !forceExpense;
          await StorageService.addExpense(expenseInfo);
          await updateEntryType(entry.id, 'expense');
        } else if (forceExpense) {
          // User forced expense but no amount found - show alert
          Alert.alert(
            "No Amount Found",
            "Please include a numeric amount in your entry (e.g., 150, Rs200, $50)"
          );
        }
      }

      // Check for action item (auto-detect OR user explicitly marked it)
      if (autoDetectedAction || forceAction) {
        // If forceAction is true but no auto-detection, create action item from text
        let actionItem;
        if (forceAction && !autoDetectedAction) {
          // Manually create action item from the text
          actionItem = {
            id: uuid.v4(),
            entryId: entry.id,
            title: trimmedInput,
            completed: false,
            createdAt: new Date(),
            autoDetected: false
          };
        } else {
          actionItem = TextAnalyzer.extractActionItem(trimmedInput, entry.id);
          if (actionItem) {
            actionItem.autoDetected = autoDetectedAction && !forceAction;
          }
        }
        
        if (actionItem) {
          await StorageService.addActionItem(actionItem);
          await updateEntryType(entry.id, 'action');
        }
      }

      // Reload all data to show updated entries with categorization
      await loadEntries();
      await loadExpensesAndActions();

      // Add system feedback message only in chat view
      if (layoutStyle === 'chat') {
        let systemMessage = '';
        let wasExpense = false;
        let wasAction = false;
        
        // Check if it was categorized as expense
        const expense = await StorageService.getExpenses().then(exps => exps.find(e => e.entryId === entry.id));
        if (expense) {
          wasExpense = true;
          const prefix = expense.autoDetected ? 'Auto-categorized' : 'Manually categorized';
          systemMessage = `💰 ${prefix} as Expense: ${TextAnalyzer.formatCurrency(expense.amount, expense.currency)}`;
          if (expense.category) systemMessage += ` (${expense.category})`;
        }
        
        // Check if it was categorized as action (only if not expense)
        if (!wasExpense) {
          const actionItem = await StorageService.getActionItems().then(items => items.find(a => a.entryId === entry.id));
          if (actionItem) {
            wasAction = true;
            const prefix = actionItem.autoDetected ? 'Auto-categorized' : 'Manually categorized';
            systemMessage = `✅ ${prefix} as Task: ${actionItem.title}`;
          }
        }
        
        // Default message if not categorized
        if (!wasExpense && !wasAction) {
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

      // Clear input and force flags after successful processing
      setInputText("");
      setForceExpense(false);
      setForceAction(false);
      
      // Scroll to bottom (offset 0 for inverted list) to show the new message
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
      
      // Refocus the text input for better UX
      setTimeout(() => {
        if (textInputRef.current) {
          textInputRef.current.focus();
        }
      }, 150);
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

  const handleLongPress = (entry: Entry) => {
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
  };

  const markAsExpense = async (entry: Entry) => {
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
  };

  const markAsActionItem = async (entry: Entry) => {
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
  };

  const removeCategory = async (entry: Entry) => {
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
  };

  const handleDeleteEntry = async (entry: Entry) => {
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
  };

  const handleEditEntry = (entry: Entry) => {
    setEditingEntry(entry);
    setEditText(entry.text.replace(/^✅\s*/, '')); // Remove checkmark if present
    
    // Pre-fill expense details if it's an expense
    if (entry.type === "expense") {
      const expense = expenses.find(e => e.entryId === entry.id);
      if (expense) {
        setEditAmount(expense.amount.toString());
        setEditCategory(expense.category || "");
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editingEntry || !editText.trim()) return;
    
    // Validate amount for expense entries
    if (editingEntry.type === "expense") {
      if (!editAmount || !editAmount.trim()) {
        Alert.alert('Amount Required', 'Please enter an amount for the expense');
        return;
      }
      const amount = parseFloat(editAmount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
        return;
      }
    }
    
    try {
      // Update entry text, type, and preserve markdown flag
      const currentEntries = await StorageService.getEntries();
      const updatedEntries = currentEntries.map(e => 
        e.id === editingEntry.id ? { ...e, text: editText.trim(), type: editingEntry.type, isMarkdown: editingEntry.isMarkdown } : e
      );
      await StorageService.saveEntries(updatedEntries);
      
      // Update expense details if it's an expense
      if (editingEntry.type === "expense") {
        const expense = expenses.find(e => e.entryId === editingEntry.id);
        if (expense && editAmount) {
          const amount = parseFloat(editAmount);
          if (!isNaN(amount) && amount > 0) {
            await StorageService.updateExpense(expense.id, {
              amount,
              category: editCategory || expense.category,
              description: editText.trim(),
            });
          }
        }
      }
      
      // Update or create action item if it's an action
      if (editingEntry.type === "action") {
        let actionItem = actionItems.find(a => a.entryId === editingEntry.id);
        if (actionItem) {
          // Update existing action item
          await StorageService.updateActionItem(actionItem.id, {
            title: editText.trim(),
          });
        } else {
          // Create new action item if it doesn't exist
          const newActionItem = {
            id: uuid.v4(),
            entryId: editingEntry.id,
            title: editText.trim(),
            completed: false,
            createdAt: new Date(),
            autoDetected: false
          };
          await StorageService.addActionItem(newActionItem);
        }
      }
      
      // Reload data and close modal
      await loadEntries();
      await loadExpensesAndActions();
      setEditingEntry(null);
      setEditText("");
      setEditAmount("");
      setEditCategory("");
    } catch (error) {
      console.error('Error updating entry:', error);
    }
  };

  const updateEntryType = async (entryId: string, newType: Entry["type"]) => {
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
  };

  const renderChatEntry = (item: Entry, expense?: Expense, actionItem?: ActionItem) => (
    <MessageBubble 
      entry={item} 
      onLongPress={handleLongPress}
      onEdit={handleEditEntry}
      onDelete={handleDeleteEntry}
      markdownStyles={markdownStyles}
      expense={expense}
      actionItem={actionItem}
    />
  );

  const renderCardEntry = (item: Entry, expense?: Expense, actionItem?: ActionItem) => (
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
  );

  const renderListEntry = (item: Entry, expense?: Expense, actionItem?: ActionItem) => (
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
  );

  const renderTimelineEntry = (item: Entry, expense?: Expense, actionItem?: ActionItem) => (
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
  );

  const renderMagazineEntry = (item: Entry, expense?: Expense, actionItem?: ActionItem) => (
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
  );

  const renderMinimalEntry = (item: Entry, expense?: Expense, actionItem?: ActionItem) => (
    <MinimalEntryItem 
      item={item}
      expense={expense}
      actionItem={actionItem}
      onEdit={handleEditEntry}
      onDelete={handleDeleteEntry}
      markdownStyles={markdownStyles}
      layoutStyles={layoutStyles}
    />
  );

  // Render date separator component
  const renderDateSeparator = (dateString: string) => {
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
      <View style={styles.dateSeparator}>
        <View style={styles.dateSeparatorLine} />
        <Text style={styles.dateSeparatorText}>{displayDate}</Text>
        <View style={styles.dateSeparatorLine} />
      </View>
    );
  };

  const renderItem = ({ item }: { item: Entry | { type: 'dateSeparator'; date: string; id: string } }) => {
    // Handle date separator
    if ('type' in item && item.type === 'dateSeparator') {
      return renderDateSeparator(item.date);
    }

    // Handle regular entry
    const entry = item as Entry;
    // Find associated expense or action item for this entry
    const expense = entry.type === 'expense' ? expenses.find(e => e.entryId === entry.id) : undefined;
    const actionItem = entry.type === 'action' ? actionItems.find(a => a.entryId === entry.id) : undefined;
    
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
  };

  // Get data with date separators
  const getDataWithSeparators = () => {
    const baseEntries = showSearch ? filteredEntries : entries;
    const data = createEntriesWithDateSeparators(baseEntries);
    // Reverse the data so newest messages are first (will appear at bottom when inverted)
    return data.reverse();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { zIndex: 10000 }]}>
        <Text style={styles.headerTitle}>Daily Journal</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', zIndex: 10001 }}>
          <TouchableOpacity
            style={[styles.settingsButton, { marginRight: 8, zIndex: 10004 }]}
            onPress={addSingleTestEntry}
          >
            <Text style={styles.settingsButtonText}>🧪</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingsButton, { marginRight: 8, zIndex: 10002 }]}
            onPress={() => {
              setShowSearch(!showSearch);
            }}
          >
            <Text style={styles.settingsButtonText}>🔍</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingsButton, { zIndex: 10003 }]}
            onPress={() => {
              setShowSettings(true);
            }}
          >
            <Text style={styles.settingsButtonText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showSearch && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search entries by text, date, or type..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery("")}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={getDataWithSeparators()}
        renderItem={renderItem}
        keyExtractor={(item) => {
          if ('type' in item && item.type === 'dateSeparator') {
            return item.id;
          }
          return (item as Entry).id;
        }}
        style={[styles.messagesList, getListStyle(layoutStyle)]}
        showsVerticalScrollIndicator={false}
        inverted
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
        ListEmptyComponent={() => {
          const isEmpty = showSearch ? filteredEntries.length === 0 : entries.length === 0;
          const message = showSearch && searchQuery.trim() 
            ? `No entries found matching "${searchQuery}"` 
            : "No messages yet. Type a message below to get started!";
          
          return (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: '#666', fontSize: 16 }}>
                {message}
              </Text>
            </View>
          );
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.inputContainer, { zIndex: 10000 }]}
      >
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={[
              styles.quickActionButton,
              forceExpense && styles.quickActionButtonActive,
            ]}
            onPress={() => {
              setForceExpense(!forceExpense);
              if (!forceExpense) setForceAction(false); // Clear task when enabling expense
            }}
          >
            <Text style={[styles.quickActionText, forceExpense && styles.quickActionTextActive]}>💰</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.quickActionButton,
              forceAction && styles.quickActionButtonActive,
            ]}
            onPress={() => {
              setForceAction(!forceAction);
              if (!forceAction) setForceExpense(false); // Clear expense when enabling task
            }}
          >
            <Text style={[styles.quickActionText, forceAction && styles.quickActionTextActive]}>✅</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.inputRow}>
          <TextInput
            ref={textInputRef}
            style={styles.textInput}
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
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
          >
            <Text style={{ color: '#fff', fontSize: 16 }}>→</Text>
          </TouchableOpacity>
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
          />
        </Modal>
      )}
      
      {editingEntry && (
        <Modal
          visible={!!editingEntry}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setEditingEntry(null)}
        >
          <View style={styles.editModalOverlay}>
            <View style={styles.editModalContent}>
              <Text style={styles.editModalTitle}>Edit Entry</Text>
              
              <Text style={styles.editLabel}>Text:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <TouchableOpacity
                  style={[
                    styles.markdownToggle,
                    editingEntry.isMarkdown && styles.markdownToggleActive
                  ]}
                  onPress={() => setEditingEntry({ ...editingEntry, isMarkdown: !editingEntry.isMarkdown })}
                >
                  <Text style={styles.markdownToggleText}>
                    {editingEntry.isMarkdown ? '✅ Markdown' : '❌ Plain Text'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.editTextInput}
                value={editText}
                onChangeText={setEditText}
                placeholder="Entry text"
                multiline
                maxLength={1000}
              />
              
              <Text style={styles.editLabel}>Category:</Text>
              <View style={styles.categoryButtons}>
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    editingEntry.type === 'log' && styles.categoryButtonActive
                  ]}
                  onPress={async () => {
                    if (editingEntry.type !== 'log') {
                      await removeCategory(editingEntry);
                      setEditingEntry({ ...editingEntry, type: 'log' });
                    }
                  }}
                >
                  <Text style={styles.categoryButtonText}>📝 Log</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    editingEntry.type === 'expense' && styles.categoryButtonActive
                  ]}
                  onPress={async () => {
                    if (editingEntry.type !== 'expense') {
                      // Remove existing categorization
                      if (editingEntry.type === 'action') {
                        await removeCategory(editingEntry);
                      }
                      // Try to extract amount from text first
                      const expenseInfo = TextAnalyzer.extractExpenseInfo(editText, editingEntry.id);
                      if (expenseInfo) {
                        setEditAmount(expenseInfo.amount.toString());
                        setEditCategory(expenseInfo.category || "");
                      } else {
                        // No amount found in text, leave empty for manual entry
                        setEditAmount("");
                        setEditCategory("");
                      }
                      setEditingEntry({ ...editingEntry, type: 'expense' });
                    }
                  }}
                >
                  <Text style={styles.categoryButtonText}>💰 Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    editingEntry.type === 'action' && styles.categoryButtonActive
                  ]}
                  onPress={async () => {
                    if (editingEntry.type !== 'action') {
                      // Remove existing categorization
                      if (editingEntry.type === 'expense') {
                        await removeCategory(editingEntry);
                        setEditAmount("");
                        setEditCategory("");
                      }
                      setEditingEntry({ ...editingEntry, type: 'action' });
                    }
                  }}
                >
                  <Text style={styles.categoryButtonText}>✅ Task</Text>
                </TouchableOpacity>
              </View>
              
              {editingEntry.type === "expense" && (
                <>
                  <Text style={styles.editLabel}>Amount:</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editAmount}
                    onChangeText={setEditAmount}
                    placeholder="Enter amount"
                    keyboardType="decimal-pad"
                  />
                  
                  <Text style={styles.editLabel}>Category (optional):</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editCategory}
                    onChangeText={setEditCategory}
                    placeholder="Food, Transportation, etc."
                  />
                </>
              )}
              
              <View style={styles.editModalButtons}>
                <TouchableOpacity
                  style={[styles.editModalButton, styles.editModalButtonCancel]}
                  onPress={() => {
                    setEditingEntry(null);
                    setEditText("");
                    setEditAmount("");
                    setEditCategory("");
                  }}
                >
                  <Text style={styles.editModalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editModalButton, styles.editModalButtonSave]}
                  onPress={handleSaveEdit}
                >
                  <Text style={[styles.editModalButtonText, { color: '#fff' }]}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    height: 36,
    paddingHorizontal: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 18,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    marginLeft: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
  },
  settingsButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
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
    paddingBottom: Platform.OS === "ios" ? 6 : 4,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  quickActionsRow: {
    flexDirection: "row",
    marginBottom: 4,
    gap: 4,
  },
  quickActionButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  quickActionButtonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#0056b3",
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
    borderColor: "#e0e0e0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: "#f8f8f8",
  },
  sendButton: {
    backgroundColor: "#007AFF",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#ccc",
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  editModalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 500,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  editLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginTop: 12,
    marginBottom: 6,
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  editTextInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
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
    backgroundColor: "#f0f0f0",
  },
  editModalButtonSave: {
    backgroundColor: "#007AFF",
  },
  editModalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
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
    backgroundColor: "#f0f0f0",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    alignItems: "center",
  },
  categoryButtonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#0056b3",
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  markdownToggle: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  markdownToggleActive: {
    backgroundColor: "#e8f5e8",
    borderColor: "#4caf50",
  },
  markdownToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
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
    backgroundColor: '#e0e0e0',
  },
  dateSeparatorText: {
    marginHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
});

const layoutStyles = StyleSheet.create({
  // Card Layout Styles
  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 6,
    marginHorizontal: 8,
    shadowColor: '#000',
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
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  cardDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  cardTime: {
    fontSize: 12,
    color: '#6c757d',
  },
  cardContent: {
    padding: 16,
  },
  cardText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#212529',
    marginBottom: 8,
  },
  expenseTag: {
    backgroundColor: '#d4edda',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  expenseText: {
    fontSize: 12,
    color: '#155724',
    fontWeight: '500',
  },
  actionTag: {
    backgroundColor: '#cce5ff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#004085',
    fontWeight: '500',
  },
  
  // List Layout Styles
  listContainer: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  listLeft: {
    alignItems: 'center',
    marginRight: 16,
    width: 60,
  },
  listTime: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
    marginBottom: 4,
  },
  listIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007bff',
  },
  listContent: {
    flex: 1,
  },
  listText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#212529',
    marginBottom: 6,
  },
  listMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  listExpense: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '500',
  },
  listAction: {
    fontSize: 12,
    color: '#007bff',
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
    backgroundColor: '#007bff',
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#dee2e6',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timelineDate: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
    marginBottom: 8,
  },
  timelineText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#212529',
  },
  timelineTags: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  timelineExpense: {
    fontSize: 12,
    color: '#28a745',
    backgroundColor: '#d4edda',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  timelineAction: {
    fontSize: 12,
    color: '#007bff',
    backgroundColor: '#cce5ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  
  // Magazine Layout Styles
  magazineContainer: {
    backgroundColor: '#fff',
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  magazineHeader: {
    backgroundColor: '#343a40',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  magazineDate: {
    fontSize: 14,
    color: '#fff',
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
    color: '#212529',
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
    color: '#6c757d',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  magazineExpenseAmount: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: '600',
  },
  magazineActionBlock: {
    flex: 1,
  },
  magazineActionLabel: {
    fontSize: 10,
    color: '#6c757d',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  magazineActionText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '600',
  },
  
  // Minimal Layout Styles
  minimalContainer: {
    flexDirection: 'row',
    paddingVertical: 0,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  minimalContent: {
    flex: 1,
    marginRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  minimalText: {
    fontSize: 16,
    color: '#212529',
    flex: 1,
  },
  minimalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  minimalTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  minimalExpense: {
    fontSize: 12,
    color: '#28a745',
  },
  minimalAction: {
    fontSize: 12,
    color: '#007bff',
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 16,
    color: "#333",
    lineHeight: 20,
  },
  heading1: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  heading2: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
  },
  strong: {
    fontWeight: "bold",
  },
  em: {
    fontStyle: "italic",
  },
  code_inline: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    fontFamily: "monospace",
  },
});
