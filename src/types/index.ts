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

export interface SettingsData {
  isMarkdownEnabled: boolean;
  enterToSend: boolean;
  systemCurrency: string;
  layoutStyle: string;
  theme?: string; // 'light', 'dark', or 'system'
  useLLMClassification?: boolean; // Enable LLM-based classification
  llmApiKey?: string; // OpenAI or compatible API key
  llmModel?: string; // Model to use (e.g., 'gpt-4o-mini')
  llmEndpoint?: string; // Custom API endpoint (optional)
}

export type TabParamList = {
  Journal: undefined;
  ActionItems: undefined;
  Expenses: undefined;
  Analytics: undefined;
};
