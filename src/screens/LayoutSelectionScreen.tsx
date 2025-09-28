import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LayoutOption {
  id: string;
  name: string;
  description: string;
  preview: string;
  features: string[];
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    id: 'chat',
    name: 'Chat Style (Current)',
    description: 'WhatsApp-like interface with message bubbles',
    preview: '💬',
    features: [
      'Message bubbles with timestamps',
      'Auto-categorization badges on right',
      'Conversation-like flow',
      'Familiar messaging interface'
    ]
  },
  {
    id: 'cards',
    name: 'Card Layout',
    description: 'Each entry as a clean card with clear categorization',
    preview: '🃏',
    features: [
      'Clean card design for each entry',
      'Large category icons and labels',
      'Amount/task details prominently displayed',
      'More space for content'
    ]
  },
  {
    id: 'list',
    name: 'List View',
    description: 'Compact list with category indicators on the left',
    preview: '📋',
    features: [
      'Compact, efficient layout',
      'Category icons on the left',
      'Quick scanning of entries',
      'More entries visible at once'
    ]
  },
  {
    id: 'timeline',
    name: 'Timeline Style',
    description: 'Chronological timeline with connecting lines',
    preview: '⏰',
    features: [
      'Visual timeline with connecting dots',
      'Clear time progression',
      'Category colors for visual grouping',
      'Journal-like appearance'
    ]
  },
  {
    id: 'magazine',
    name: 'Magazine Layout',
    description: 'Rich content blocks with emphasis on categorization',
    preview: '📰',
    features: [
      'Large typography and spacing',
      'Category sections with colored headers',
      'Reading-focused design',
      'Publication-style layout'
    ]
  },
  {
    id: 'minimal',
    name: 'Minimal Design',
    description: 'Clean, distraction-free text-focused layout',
    preview: '✨',
    features: [
      'Ultra-clean design',
      'Focus on content over decoration',
      'Subtle category indicators',
      'Maximum readability'
    ]
  }
];

export const LayoutSelectionScreen: React.FC<{ 
  onClose: () => void;
  onSelect: (layoutId: string) => void;
  currentLayout: string;
}> = ({ onClose, onSelect, currentLayout }) => {
  const [selectedLayout, setSelectedLayout] = useState(currentLayout);

  const handleSelect = () => {
    onSelect(selectedLayout);
    onClose();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose Journal Layout</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.subtitle}>
          Select how you'd like your journal entries to be displayed
        </Text>

        {LAYOUT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionCard,
              selectedLayout === option.id && styles.selectedCard
            ]}
            onPress={() => setSelectedLayout(option.id)}
          >
            <View style={styles.optionHeader}>
              <View style={styles.optionTitleRow}>
                <Text style={styles.optionPreview}>{option.preview}</Text>
                <View style={styles.optionTitleContainer}>
                  <Text style={styles.optionName}>{option.name}</Text>
                  {selectedLayout === option.id && (
                    <Text style={styles.currentBadge}>Current</Text>
                  )}
                </View>
              </View>
              <View style={[
                styles.radioButton,
                selectedLayout === option.id && styles.radioButtonSelected
              ]}>
                {selectedLayout === option.id && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </View>
            
            <Text style={styles.optionDescription}>{option.description}</Text>
            
            <View style={styles.featuresContainer}>
              {option.features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Text style={styles.featureBullet}>•</Text>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.selectButton, selectedLayout === currentLayout && styles.selectButtonDisabled]}
          onPress={handleSelect}
          disabled={selectedLayout === currentLayout}
        >
          <Text style={[styles.selectButtonText, selectedLayout === currentLayout && styles.selectButtonTextDisabled]}>
            {selectedLayout === currentLayout ? 'Already Selected' : `Apply ${LAYOUT_OPTIONS.find(o => o.id === selectedLayout)?.name}`}
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
    lineHeight: 22,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedCard: {
    borderColor: '#007AFF',
    backgroundColor: '#f8f9ff',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionPreview: {
    fontSize: 28,
    marginRight: 12,
  },
  optionTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  currentBadge: {
    backgroundColor: '#007AFF',
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  featuresContainer: {
    marginTop: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  featureBullet: {
    fontSize: 16,
    color: '#007AFF',
    marginRight: 8,
    marginTop: 1,
  },
  featureText: {
    fontSize: 13,
    color: '#555',
    flex: 1,
    lineHeight: 18,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#007AFF',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  selectButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  selectButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectButtonTextDisabled: {
    color: '#999',
  },
});