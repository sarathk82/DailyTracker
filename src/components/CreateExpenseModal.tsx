import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { StorageService } from '../utils/storage';
import { Expense } from '../types';
import { Ionicons } from '@expo/vector-icons';

interface CreateExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
}

// Custom UUID function
const uuid = {
  v4: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

export const CreateExpenseModal: React.FC<CreateExpenseModalProps> = ({
  visible,
  onClose,
  onSave,
}) => {
  const { theme } = useTheme();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Track keyboard height
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Load system currency
  useEffect(() => {
    const loadCurrency = async () => {
      const settings = await StorageService.getSettings();
      if (settings) {
        setCurrency(settings.systemCurrency || 'USD');
      }
    };
    if (visible) {
      loadCurrency();
    }
  }, [visible]);

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setAmount('');
      setDescription('');
      setCategory('');
    }
  }, [visible]);

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (!amount.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      if (typeof window !== 'undefined') {
        window.alert('Please enter a valid amount');
      }
      return;
    }

    if (!description.trim()) {
      if (typeof window !== 'undefined') {
        window.alert('Please enter a description');
      }
      return;
    }

    try {
      const expense: Expense = {
        id: uuid.v4(),
        entryId: uuid.v4(), // Create a dummy entry ID for standalone expenses
        amount: parsedAmount,
        currency: currency,
        description: description.trim(),
        category: category.trim() || undefined,
        createdAt: new Date(),
        autoDetected: false,
      };

      await StorageService.addExpense(expense);
      onSave();
      onClose();
    } catch (error) {
      console.error('Error creating expense:', error);
    }
  };

  const dynamicStyles = getStyles(theme);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={dynamicStyles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={dynamicStyles.modalOverlay}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            dynamicStyles.modalContent,
            Platform.OS === 'android' && keyboardHeight > 0
              ? { marginBottom: keyboardHeight }
              : {},
          ]}
        >
          <View style={dynamicStyles.modalHeader}>
            <Text style={dynamicStyles.modalTitle}>Create Expense</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={dynamicStyles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={dynamicStyles.inputGroup}>
              <Text style={dynamicStyles.label}>Amount *</Text>
              <View style={dynamicStyles.amountRow}>
                <TextInput
                  style={[dynamicStyles.input, dynamicStyles.amountInput]}
                  placeholder="0.00"
                  placeholderTextColor={theme.placeholder}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <Text style={dynamicStyles.currencyLabel}>{currency}</Text>
              </View>
            </View>

            <View style={dynamicStyles.inputGroup}>
              <Text style={dynamicStyles.label}>Description *</Text>
              <TextInput
                style={[dynamicStyles.input, dynamicStyles.inputMultiline]}
                placeholder="What was this expense for?"
                placeholderTextColor={theme.placeholder}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            <View style={dynamicStyles.inputGroup}>
              <Text style={dynamicStyles.label}>Category (optional)</Text>
              <TextInput
                style={dynamicStyles.input}
                placeholder="e.g., Food, Transport, Entertainment"
                placeholderTextColor={theme.placeholder}
                value={category}
                onChangeText={setCategory}
              />
            </View>
          </ScrollView>

          <View style={dynamicStyles.modalFooter}>
            <TouchableOpacity
              style={[dynamicStyles.button, dynamicStyles.buttonSecondary]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={dynamicStyles.buttonTextSecondary}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[dynamicStyles.button, dynamicStyles.buttonPrimary]}
              onPress={handleSave}
              activeOpacity={0.7}
            >
              <Text style={dynamicStyles.buttonTextPrimary}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const getStyles = (theme: any) => StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    backgroundColor: theme.input,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.text,
    minHeight: 44,
  },
  amountInput: {
    flex: 1,
  },
  currencyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textSecondary,
    paddingHorizontal: 12,
  },
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: theme.primary,
  },
  buttonSecondary: {
    backgroundColor: theme.input,
    borderWidth: 1,
    borderColor: theme.border,
  },
  buttonTextPrimary: {
    color: theme.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
