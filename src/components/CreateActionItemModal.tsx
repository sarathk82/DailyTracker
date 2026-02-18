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
import { ActionItem } from '../types';
import { Ionicons } from '@expo/vector-icons';

interface CreateActionItemModalProps {
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

export const CreateActionItemModal: React.FC<CreateActionItemModalProps> = ({
  visible,
  onClose,
  onSave,
}) => {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
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

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setTitle('');
      setDescription('');
      setDueDate('');
    }
  }, [visible]);

  const handleSave = async () => {
    if (!title.trim()) {
      if (typeof window !== 'undefined') {
        window.alert('Please enter a title');
      }
      return;
    }

    try {
      // Parse due date if provided (format: YYYY-MM-DD)
      let parsedDueDate: Date | undefined = undefined;
      if (dueDate.trim()) {
        parsedDueDate = new Date(dueDate);
        if (isNaN(parsedDueDate.getTime())) {
          if (typeof window !== 'undefined') {
            window.alert('Invalid date format. Use YYYY-MM-DD');
          }
          return;
        }
      }

      const actionItem: ActionItem = {
        id: uuid.v4(),
        entryId: uuid.v4(), // Create a dummy entry ID for standalone action items
        title: title.trim(),
        description: description.trim() || title.trim(),
        completed: false,
        createdAt: new Date(),
        dueDate: parsedDueDate,
        autoDetected: false,
      };

      await StorageService.addActionItem(actionItem);
      onSave();
      onClose();
    } catch (error) {
      console.error('Error creating action item:', error);
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
            <Text style={dynamicStyles.modalTitle}>Create Action Item</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={dynamicStyles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={dynamicStyles.inputGroup}>
              <Text style={dynamicStyles.label}>Title *</Text>
              <TextInput
                style={dynamicStyles.input}
                placeholder="Enter action item title"
                placeholderTextColor={theme.placeholder}
                value={title}
                onChangeText={setTitle}
                autoFocus
                multiline
              />
            </View>

            <View style={dynamicStyles.inputGroup}>
              <Text style={dynamicStyles.label}>Description (optional)</Text>
              <TextInput
                style={[dynamicStyles.input, dynamicStyles.inputMultiline]}
                placeholder="Add more details"
                placeholderTextColor={theme.placeholder}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={dynamicStyles.inputGroup}>
              <Text style={dynamicStyles.label}>Due Date (optional)</Text>
              <TextInput
                style={dynamicStyles.input}
                placeholder="YYYY-MM-DD (e.g., 2026-02-20)"
                placeholderTextColor={theme.placeholder}
                value={dueDate}
                onChangeText={setDueDate}
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
  inputMultiline: {
    minHeight: 80,
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
