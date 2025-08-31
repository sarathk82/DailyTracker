import { Entry, ActionItem, Expense } from "../types";
import uuid from "react-native-uuid";

// Currency symbols and patterns
const CURRENCY_PATTERNS = [
  /\$\s*\d+(\.\d{1,2})?/gi, // Dollar amounts like $50, $50.00, $ 50
  /₹\s*\d+(\.\d{1,2})?/gi, // Rupee amounts
  /€\s*\d+(\.\d{1,2})?/gi, // Euro amounts
  /£\s*\d+(\.\d{1,2})?/gi, // Pound amounts
  /\d+(\.\d{1,2})?\s*(dollars?|USD|rupees?|INR|euros?|EUR|pounds?|GBP)/gi, // Text amounts
  /\d+(\.\d{1,2})?\s*bucks?/gi, // Slang like "10 bucks"
];

// Expense keywords - expanded list
const EXPENSE_KEYWORDS = [
  "bought",
  "paid",
  "cost",
  "expense",
  "spent",
  "purchase",
  "bill",
  "invoice",
  "receipt",
  "fee",
  "charge",
  "price",
  "money",
  "cash",
  "payment",
  "transaction",
  "shopping",
  "store",
  "restaurant",
  "buy",
  "sold",
  "sale",
  "refund",
  "withdraw",
  "deposit",
  "transfer",
  "food",
  "lunch",
  "dinner",
  "breakfast",
  "coffee",
  "gas",
  "fuel",
  "groceries",
  "uber",
  "taxi",
  "rent",
  "mortgage",
  "utilities",
  "subscription",
  "membership",
  "tip",
  "tipped",
  "ordered",
];

// Action item keywords - expanded list
const ACTION_KEYWORDS = [
  "need to",
  "must",
  "todo",
  "reminder",
  "remember",
  "task",
  "should",
  "have to",
  "required",
  "deadline",
  "due",
  "schedule",
  "appointment",
  "meeting",
  "call",
  "email",
  "follow up",
  "buy",
  "get",
  "pick up",
  "finish",
  "complete",
  "start",
  "contact",
  "reach out",
  "check",
  "review",
  "submit",
  "apply",
  "book",
  "reserve",
  "cancel",
  "confirm",
];

// Action item patterns
const ACTION_PATTERNS = [
  /[-*]\s*\[\s*\]\s*.+$/gm, // Markdown checklist format (both - and *)
  /TODO:?\s*.+$/gim, // TODO format
  /REMINDER:?\s*.+$/gim, // Reminder format
  /\b(need to|must|should|have to|remember to|don't forget to)\s+.+/gim, // Action phrases
];

export function detectExpense(text: string): boolean {
  // Check for currency patterns
  for (const pattern of CURRENCY_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }

  // Check for expense keywords
  const lowerText = text.toLowerCase();
  return EXPENSE_KEYWORDS.some((keyword) => lowerText.includes(keyword));
}

export function detectActionItem(text: string): boolean {
  // Check for action patterns
  for (const pattern of ACTION_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }

  // Check for action keywords
  const lowerText = text.toLowerCase();
  return ACTION_KEYWORDS.some((keyword) => lowerText.includes(keyword));
}

export function extractExpenseInfo(
  text: string,
  entryId: string
): Expense | null {
  let amount = 0;
  let currency = "USD";

  // Try to extract amount and currency from currency patterns
  for (const pattern of CURRENCY_PATTERNS) {
    // Reset pattern lastIndex to avoid issues with global flags
    pattern.lastIndex = 0;
    const matches = text.match(pattern);
    if (matches) {
      const match = matches[0];

      if (match.includes("$")) {
        currency = "USD";
        amount = parseFloat(match.replace(/[$\s]/g, ""));
      } else if (match.includes("₹")) {
        currency = "INR";
        amount = parseFloat(match.replace(/[₹\s]/g, ""));
      } else if (match.includes("€")) {
        currency = "EUR";
        amount = parseFloat(match.replace(/[€\s]/g, ""));
      } else if (match.includes("£")) {
        currency = "GBP";
        amount = parseFloat(match.replace(/[£\s]/g, ""));
      } else {
        // For text-based amounts like "50 dollars"
        const numMatch = match.match(/(\d+(?:\.\d{1,2})?)/);
        if (numMatch) {
          amount = parseFloat(numMatch[1]);
          const currencyText = match.toLowerCase();
          if (
            currencyText.includes("dollar") ||
            currencyText.includes("usd") ||
            currencyText.includes("buck")
          ) {
            currency = "USD";
          } else if (
            currencyText.includes("rupee") ||
            currencyText.includes("inr")
          ) {
            currency = "INR";
          } else if (
            currencyText.includes("euro") ||
            currencyText.includes("eur")
          ) {
            currency = "EUR";
          } else if (
            currencyText.includes("pound") ||
            currencyText.includes("gbp")
          ) {
            currency = "GBP";
          }
        }
      }
      break;
    }
  }

  // If no specific currency pattern found, try to extract just numbers for common expense contexts
  if (amount === 0) {
    const lowerText = text.toLowerCase();
    const hasExpenseContext = EXPENSE_KEYWORDS.some((keyword) =>
      lowerText.includes(keyword)
    );

    if (hasExpenseContext) {
      // Look for standalone numbers that might be amounts
      const numberMatch = text.match(/\b(\d+(?:\.\d{1,2})?)\b/);
      if (numberMatch) {
        const potentialAmount = parseFloat(numberMatch[1]);
        // Only consider reasonable amounts (between 0.01 and 100000)
        if (potentialAmount >= 0.01 && potentialAmount <= 100000) {
          amount = potentialAmount;
        }
      }
    }
  }

  if (amount > 0) {
    return {
      id: uuid.v4() as string,
      entryId,
      amount,
      currency,
      description: text.trim(),
      createdAt: new Date(),
    };
  }

  return null;
}

export function extractActionItem(
  text: string,
  entryId: string
): ActionItem | null {
  let title = text.trim();

  // Extract title from checklist format
  const checklistMatch = text.match(/[-*]\s*\[\s*\]\s*(.+)$/m);
  if (checklistMatch) {
    title = checklistMatch[1].trim();
  }

  // Extract title from TODO format
  const todoMatch = text.match(/TODO:?\s*(.+)$/im);
  if (todoMatch) {
    title = todoMatch[1].trim();
  }

  // Extract title from REMINDER format
  const reminderMatch = text.match(/REMINDER:?\s*(.+)$/im);
  if (reminderMatch) {
    title = reminderMatch[1].trim();
  }

  // If it's a general action item, try to extract the main action
  if (title === text.trim()) {
    // Look for action patterns and extract the main part
    const actionMatch = text.match(
      /(need to|must|should|have to|remember to|don't forget to)\s+(.+)/i
    );
    if (actionMatch) {
      title = actionMatch[2].trim();
    }
  }

  return {
    id: uuid.v4() as string,
    entryId,
    title,
    description: text.trim(),
    completed: false,
    createdAt: new Date(),
  };
}

export function formatCurrency(amount: number, currency: string): string {
  const currencySymbols: { [key: string]: string } = {
    USD: "$",
    INR: "₹",
    EUR: "€",
    GBP: "£",
  };

  const symbol = currencySymbols[currency] || currency;
  return `${symbol}${amount.toFixed(2)}`;
}
