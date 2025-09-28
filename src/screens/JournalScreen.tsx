import React, { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// import { Ionicons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import { format } from "date-fns";

import { Entry } from "../types";
import { StorageService } from "../utils/storage";
import { TextAnalyzer } from "../utils/textAnalysis";
import { MessageBubble } from "../components/MessageBubble";

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
    setEntries(
      savedEntries.sort((a, b) => {
        // If timestamps are within 2 seconds of each other, maintain user-system alternation
        const timeDiff = Math.abs(a.timestamp.getTime() - b.timestamp.getTime());
        if (timeDiff < 2000) {
          // If one is a system message and the other isn't, maintain the conversation flow
          if (a.type === 'system' && b.type !== 'system') return 1;
          if (a.type !== 'system' && b.type === 'system') return -1;
        }
        // Otherwise, sort by timestamp
        return a.timestamp.getTime() - b.timestamp.getTime();
      })
    );
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const showToast = (message: string) => {
    alert(message);
  };

    const addSystemMessage = async (message: string) => {
    const systemEntry: Entry = {
      id: uuid.v4(),
      text: message,
      // Add a small delay to ensure it appears after the user message
      timestamp: new Date(Date.now() + 100),
      type: "system",
    };
    
    try {
      // Save to storage first
      await StorageService.addEntry(systemEntry);
      
      // Reload entries to refresh UI
      await loadEntries();
    } catch (error) {
      console.error('Error adding system message:', error);
      showToast('Failed to add system message');
    }
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
      
      // Reload entries from storage to ensure UI is in sync
      await loadEntries();

      // Check for expense
      if (TextAnalyzer.detectExpense(trimmedInput)) {
        const expenseInfo = TextAnalyzer.extractExpenseInfo(trimmedInput, entry.id);
        if (expenseInfo) {
          await StorageService.addExpense(expenseInfo);
          await updateEntryType(entry.id, 'expense');
          await addSystemMessage(
            `💰 Added expense: ${TextAnalyzer.formatCurrency(expenseInfo.amount, expenseInfo.currency)}`
          );
        } else {
          await addSystemMessage("💰 Detected as expense but couldn't extract amount");
        }
        setInputText("");
        // Reload entries after expense processing to show updated entry
        await loadEntries();
        return;
      }

      // Check for action item
      if (TextAnalyzer.detectActionItem(trimmedInput)) {
        const actionItem = TextAnalyzer.extractActionItem(trimmedInput, entry.id);
        if (actionItem) {
          await StorageService.addActionItem(actionItem);
          await updateEntryType(entry.id, 'action');
          await addSystemMessage(`✅ Added action item: ${actionItem.title}`);
        } else {
          await addSystemMessage("✅ Detected as action item but couldn't extract details");
        }
        // Reload entries after action item processing to show updated entry
        await loadEntries();
      }

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
      // Add system message after the entry is updated
      await addSystemMessage(
        `💰 Manually categorized as expense: ${TextAnalyzer.formatCurrency(expenseInfo.amount, expenseInfo.currency)}`
      );
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
      // Add system message after the entry is updated
      await addSystemMessage(`✅ Manually categorized as action item: ${actionItem.title}`);
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

  const renderEntry = ({ item }: { item: Entry }) => {
    return (
      <MessageBubble 
        entry={item} 
        onLongPress={handleLongPress}
        markdownStyles={markdownStyles}
      />
    );
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
                
                // Reload entries from storage to ensure UI is in sync
                await loadEntries();

                // Check for expense
                if (TextAnalyzer.detectExpense(testMessage)) {
                  const expenseInfo = TextAnalyzer.extractExpenseInfo(testMessage, entry.id);
                  if (expenseInfo) {
                    await StorageService.addExpense(expenseInfo);
                    await updateEntryType(entry.id, 'expense');
                    await addSystemMessage(
                      `💰 Added expense: ${TextAnalyzer.formatCurrency(expenseInfo.amount, expenseInfo.currency)}`
                    );
                  } else {
                    await addSystemMessage("💰 Detected as expense but couldn't extract amount");
                  }
                  setInputText("");
                  await loadEntries();
                  return;
                }

                // Check for action item
                if (TextAnalyzer.detectActionItem(testMessage)) {
                  const actionItem = TextAnalyzer.extractActionItem(testMessage, entry.id);
                  if (actionItem) {
                    await StorageService.addActionItem(actionItem);
                    await updateEntryType(entry.id, 'action');
                    await addSystemMessage(`✅ Added action item: ${actionItem.title}`);
                  } else {
                    await addSystemMessage("✅ Detected as action item but couldn't extract details");
                  }
                  await loadEntries();
                }

                setInputText("");
              }, 500);
            }}
          >
            <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>TEST</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.markdownToggle,
              isMarkdown && styles.markdownToggleActive,
            ]}
            onPress={() => setIsMarkdown(!isMarkdown)}
          >
            <Text
              style={[
                styles.markdownToggleText,
                isMarkdown && styles.markdownToggleTextActive,
              ]}
            >
              MD
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={entries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
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
  markdownToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#e0e0e0",
  },
  markdownToggleActive: {
    backgroundColor: "#007AFF",
  },
  markdownToggleText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#666",
  },
  markdownToggleTextActive: {
    color: "#fff",
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
