export interface Entry {
  id: string;
  text: string;
  timestamp: Date;
  type: 'log' | 'action' | 'expense' | 'system';
  isMarkdown?: boolean;
}

export interface ActionItem {
  id: string;
  entryId: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: Date;
  dueDate?: Date;
  autoDetected?: boolean;
}

export interface Expense {
  id: string;
  entryId: string;
  amount: number;
  currency: string;
  description: string;
  category?: string;
  createdAt: Date;
  autoDetected?: boolean;
}

export type SyncMethod = 'webrtc' | 'firebase-relay' | 'cloud-sync';

export interface SettingsData {
  isMarkdownEnabled: boolean;
  enterToSend: boolean;
  systemCurrency: string;
  layoutStyle: string;
  theme?: string; // 'light', 'dark', or 'system'
  syncMethod?: SyncMethod; // 'webrtc', 'firebase-relay', or 'cloud-sync'
}

export type TabParamList = {
  Journal: undefined;
  ActionItems: undefined;
  Expenses: undefined;
  Analytics: undefined;
};
