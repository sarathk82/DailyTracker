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
import { SettingsScreen } from "./SettingsScreen";

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
  
  // Settings state (will be loaded from storage)
  const [enterToSend, setEnterToSend] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [layoutStyle, setLayoutStyle] = useState('chat');
  
  // Data for enhanced messages
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);

  // Test entries for different scenarios
  const testEntries = [
    // Expense entries
    "spent Rs150 on coffee",
    "bought groceries for $45.50",
    "paid ₹2500 for electricity bill",
    "lunch cost $12.99",
    "purchased fuel Rs3200",
    
    // Action item entries
    "need to call mom tomorrow",
    "todo: finish the quarterly report",
    "must submit tax documents by Friday",
    "reminder: doctor appointment at 3pm",
    "should book flight tickets",
    
    // Regular entries
    "had a great meeting today",
    "weather is lovely",
    "feeling productive this morning",
    "learned something new about React Native",
    "grateful for a good day"
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
    
    // Scroll to bottom after entries are loaded (with small delay to ensure render)
    
    
    // Scroll to bottom after entries are loaded (with small delay to ensure render)
    setTimeout(() => {
      if (sortedEntries.length > 0) {
        flatListRef.current?.scrollToEnd({ animated: true });
      }
    }, 100);
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

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

    const handleSendMessage = async () => {
    const trimmedInput = inputText.trim();
    if (!trimmedInput) return;

    try {
      const entry: Entry = {
        id: uuid.v4(),
        text: trimmedInput,
        timestamp: new Date(),
        type: 'log',
        isMarkdown,
      };

      // Save the entry first
      await StorageService.addEntry(entry);
      
      // Check for expense
      if (TextAnalyzer.detectExpense(trimmedInput)) {
        const expenseInfo = TextAnalyzer.extractExpenseInfo(trimmedInput, entry.id);
        if (expenseInfo) {
          await StorageService.addExpense(expenseInfo);
          await updateEntryType(entry.id, 'expense');
        }
      }

      // Check for action item
      if (TextAnalyzer.detectActionItem(trimmedInput)) {
        const actionItem = TextAnalyzer.extractActionItem(trimmedInput, entry.id);
        if (actionItem) {
          await StorageService.addActionItem(actionItem);
          await updateEntryType(entry.id, 'action');
        }
      }

      // Reload all data to show updated entries with categorization
      await loadEntries();
      await loadExpensesAndActions();

      // Clear input after successful processing
      setInputText("");
    } catch (error) {
      console.error('Error processing message:', error);
      showToast('Failed to process message');
    }
  };

  const handleLongPress = (entry: Entry) => {
    Alert.alert("Entry Options", "What would you like to do with this entry?", [
      {
        text: "Mark as Expense",
        onPress: () => markAsExpense(entry),
        style: entry.type === "expense" ? "cancel" : "default",
      },
      {
        text: "Mark as Action Item",
        onPress: () => markAsActionItem(entry),
        style: entry.type === "action" ? "cancel" : "default",
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  const markAsExpense = async (entry: Entry) => {
    if (entry.type === "expense") return;

    const expenseInfo = TextAnalyzer.extractExpenseInfo(entry.text, entry.id);
    if (expenseInfo) {
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

    const actionItem = TextAnalyzer.extractActionItem(entry.text, entry.id);
    if (actionItem) {
      await StorageService.addActionItem(actionItem);
      await updateEntryType(entry.id, "action");
      // Reload action items to show updated categorization
      await loadExpensesAndActions();
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
      markdownStyles={markdownStyles}
      expense={expense}
      actionItem={actionItem}
    />
  );

  const renderCardEntry = (item: Entry, expense?: Expense, actionItem?: ActionItem) => (
    <View style={layoutStyles.cardContainer}>
      <View style={layoutStyles.cardHeader}>
        <Text style={layoutStyles.cardDate}>{format(item.timestamp, 'MMM dd, yyyy')}</Text>
        <Text style={layoutStyles.cardTime}>{format(item.timestamp, 'h:mm a')}</Text>
      </View>
      <View style={layoutStyles.cardContent}>
        {item.isMarkdown ? (
          <Markdown style={markdownStyles}>{item.text}</Markdown>
        ) : (
          <Text style={layoutStyles.cardText}>{item.text}</Text>
        )}
        {expense && (
          <View style={layoutStyles.expenseTag}>
            <Text style={layoutStyles.expenseText}>
              💰 {TextAnalyzer.formatCurrency(expense.amount, expense.currency)}
            </Text>
          </View>
        )}
        {actionItem && (
          <View style={layoutStyles.actionTag}>
            <Text style={layoutStyles.actionText}>✅ Task</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderListEntry = (item: Entry, expense?: Expense, actionItem?: ActionItem) => (
    <View style={layoutStyles.listContainer}>
      <View style={layoutStyles.listLeft}>
        <Text style={layoutStyles.listTime}>{format(item.timestamp, 'h:mm a')}</Text>
        <View style={layoutStyles.listIndicator} />
      </View>
      <View style={layoutStyles.listContent}>
        {item.isMarkdown ? (
          <Markdown style={markdownStyles}>{item.text}</Markdown>
        ) : (
          <Text style={layoutStyles.listText}>{item.text}</Text>
        )}
        <View style={layoutStyles.listMeta}>
          {expense && (
            <Text style={layoutStyles.listExpense}>
              💰 {TextAnalyzer.formatCurrency(expense.amount, expense.currency)}
            </Text>
          )}
          {actionItem && <Text style={layoutStyles.listAction}>✅ Task</Text>}
        </View>
      </View>
    </View>
  );

  const renderTimelineEntry = (item: Entry, expense?: Expense, actionItem?: ActionItem) => (
    <View style={layoutStyles.timelineContainer}>
      <View style={layoutStyles.timelineLeft}>
        <View style={layoutStyles.timelineDot} />
        <View style={layoutStyles.timelineLine} />
      </View>
      <View style={layoutStyles.timelineContent}>
        <Text style={layoutStyles.timelineDate}>{format(item.timestamp, 'MMM dd, h:mm a')}</Text>
        {item.isMarkdown ? (
          <Markdown style={markdownStyles}>{item.text}</Markdown>
        ) : (
          <Text style={layoutStyles.timelineText}>{item.text}</Text>
        )}
        {(expense || actionItem) && (
          <View style={layoutStyles.timelineTags}>
            {expense && (
              <Text style={layoutStyles.timelineExpense}>
                💰 {TextAnalyzer.formatCurrency(expense.amount, expense.currency)}
              </Text>
            )}
            {actionItem && <Text style={layoutStyles.timelineAction}>✅ Task</Text>}
          </View>
        )}
      </View>
    </View>
  );

  const renderMagazineEntry = (item: Entry, expense?: Expense, actionItem?: ActionItem) => (
    <View style={layoutStyles.magazineContainer}>
      <View style={layoutStyles.magazineHeader}>
        <Text style={layoutStyles.magazineDate}>{format(item.timestamp, 'EEEE, MMMM dd')}</Text>
      </View>
      <View style={layoutStyles.magazineBody}>
        {item.isMarkdown ? (
          <Markdown style={markdownStyles}>{item.text}</Markdown>
        ) : (
          <Text style={layoutStyles.magazineText}>{item.text}</Text>
        )}
      </View>
      {(expense || actionItem) && (
        <View style={layoutStyles.magazineFooter}>
          {expense && (
            <View style={layoutStyles.magazineExpenseBlock}>
              <Text style={layoutStyles.magazineExpenseLabel}>Expense</Text>
              <Text style={layoutStyles.magazineExpenseAmount}>
                {TextAnalyzer.formatCurrency(expense.amount, expense.currency)}
              </Text>
            </View>
          )}
          {actionItem && (
            <View style={layoutStyles.magazineActionBlock}>
              <Text style={layoutStyles.magazineActionLabel}>Action Item</Text>
              <Text style={layoutStyles.magazineActionText}>Task</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderMinimalEntry = (item: Entry, expense?: Expense, actionItem?: ActionItem) => (
    <View style={layoutStyles.minimalContainer}>
      <View style={layoutStyles.minimalContent}>
        {item.isMarkdown ? (
          <Markdown style={markdownStyles}>{item.text}</Markdown>
        ) : (
          <Text style={layoutStyles.minimalText}>{item.text}</Text>
        )}
      </View>
      <View style={layoutStyles.minimalMeta}>
        <Text style={layoutStyles.minimalTime}>{format(item.timestamp, 'h:mm a')}</Text>
        {expense && <Text style={layoutStyles.minimalExpense}>💰{TextAnalyzer.formatCurrency(expense.amount, expense.currency)}</Text>}
        {actionItem && <Text style={layoutStyles.minimalAction}>✅</Text>}
      </View>
    </View>
  );

  const renderEntry = ({ item }: { item: Entry }) => {
    // Find associated expense or action item for this entry
    const expense = item.type === 'expense' ? expenses.find(e => e.entryId === item.id) : undefined;
    const actionItem = item.type === 'action' ? actionItems.find(a => a.entryId === item.id) : undefined;
    
    switch (layoutStyle) {
      case 'cards':
        return renderCardEntry(item, expense, actionItem);
      case 'list':
        return renderListEntry(item, expense, actionItem);
      case 'timeline':
        return renderTimelineEntry(item, expense, actionItem);
      case 'magazine':
        return renderMagazineEntry(item, expense, actionItem);
      case 'minimal':
        return renderMinimalEntry(item, expense, actionItem);
      case 'chat':
      default:
        return renderChatEntry(item, expense, actionItem);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Daily Journal</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={{ backgroundColor: '#4caf50', padding: 8, borderRadius: 4, marginRight: 8 }}
            onPress={async () => {
              const testMessage = testEntries[testIndex];
              setTestIndex((prev) => (prev + 1) % testEntries.length);
              
              // Simulate typing the test message
              setInputText(testMessage);
              
              // Auto-send after a short delay so you can see it being typed
              setTimeout(async () => {
                const entry: Entry = {
                  id: uuid.v4(),
                  text: testMessage,
                  timestamp: new Date(),
                  type: 'log',
                  isMarkdown,
                };

                // Save the entry first
                await StorageService.addEntry(entry);
                
                // Check for expense
                if (TextAnalyzer.detectExpense(testMessage)) {
                  const expenseInfo = TextAnalyzer.extractExpenseInfo(testMessage, entry.id);
                  if (expenseInfo) {
                    await StorageService.addExpense(expenseInfo);
                    await updateEntryType(entry.id, 'expense');
                  }
                }

                // Check for action item
                if (TextAnalyzer.detectActionItem(testMessage)) {
                  const actionItem = TextAnalyzer.extractActionItem(testMessage, entry.id);
                  if (actionItem) {
                    await StorageService.addActionItem(actionItem);
                    await updateEntryType(entry.id, 'action');
                  }
                }

                // Reload all data to show updated entries with categorization
                await loadEntries();
                await loadExpensesAndActions();

                setInputText("");
              }, 500);
            }}
          >
            <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>TEST</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.settingsButton]}
            onPress={() => setShowSettings(true)}
          >
            <Text style={styles.settingsButtonText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={entries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id}
        style={[styles.messagesList, getListStyle(layoutStyle)]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => {
          return (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: '#666', fontSize: 16 }}>
                No messages yet. Type a message below to get started!
              </Text>
            </View>
          );
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder={
            isMarkdown
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
      </KeyboardAvoidingView>
      
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
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
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
  },
  minimalContent: {
    flex: 1,
    marginRight: 16,
  },
  minimalText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#212529',
  },
  minimalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
