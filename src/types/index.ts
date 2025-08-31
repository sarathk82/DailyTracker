export interface Entry {
  id: string;
  text: string;
  timestamp: Date;
  type: 'log' | 'action' | 'expense';
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
}

export interface Expense {
  id: string;
  entryId: string;
  amount: number;
  currency: string;
  description: string;
  category?: string;
  createdAt: Date;
}

export type TabParamList = {
  Journal: undefined;
  ActionItems: undefined;
  Expenses: undefined;
};
