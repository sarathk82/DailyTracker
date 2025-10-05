import { Entry, Expense, ActionItem } from '../types';

// Custom UUID function since react-native-uuid causes crashes
const uuid = {
  v4: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

export class TextAnalyzer {
  // Currency patterns - simplified to detect any numeric amount
  private static readonly CURRENCY_PATTERNS = [
    // Any number with optional decimal places
    /\b\d+(\.\d{1,2})?\b/g,
    // Currency symbols with numbers (but we'll extract just the number)
    /[₹$€£]\s*\d+(\.\d{1,2})?|\d+(\.\d{1,2})?\s*[₹$€£]/g,
    // Text-based currency mentions (extract number only)
    /(?:Rs\.?|rs\.?|RS\.?)\s*\d+(\.\d{1,2})?/g,
    /\d+(\.\d{1,2})?\s*(rupees?|dollars?|euros?|pounds?)/g
  ];

  // Keywords for expenses
  private static readonly EXPENSE_KEYWORDS: string[] = [
    "spent", "bought", "purchased", "paid", "cost",
    "expense", "payment", "buy", "pay", "shopping",
    "store", "bill", "receipt", "charged", "withdrew",
    "withdrawal", "transaction", "fee", "subscription"
  ];

  // Keywords for action items (kept for reference, but only dot-prefix is used)
  private static readonly ACTION_KEYWORDS: string[] = [
    "todo", "to-do", "task", "need to", "should",
    "must", "have to", "action", "plan", "schedule",
    "remind", "remember", "don't forget", "important",
    "deadline", "due", "appointment", "meeting", "call",
    "email", "follow up", "buy", "get", "pick up", "pack",
    "finish", "complete", "start", "contact", "reach out",
    "check", "review", "submit", "apply", "book", "reserve"
  ];

  // Only dot-prefix detection is used for action items
  // Format: ". task description" becomes an action item

  static detectActionItem(text: string): boolean {
    // Only detect action items that start with a dot (simple and explicit)
    const startsWithDot = /^\s*\.\s*\S/.test(text);
    return startsWithDot;
  }

  static detectExpense(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // First check for explicit expense keywords
    const hasExpenseKeywords = this.EXPENSE_KEYWORDS.some(keyword => lowerText.includes(keyword));
    if (hasExpenseKeywords) {
      return true;
    }
    
    // Only consider numeric values as expenses if they have strong expense context
    // AND the text is not just a plain number
    if (this.hasNumericValue(text) && this.hasExpenseContext(text)) {
      // Additional check: reject plain numbers without context
      // If the text is ONLY a number (like "150"), it's probably not an expense
      const isPlainNumber = /^\s*\d+(\.\d{1,2})?\s*$/.test(text);
      if (isPlainNumber) {
        return false; // Don't treat plain numbers as expenses
      }
      
      // Also reject if it's just currency symbol + number without context
      const isCurrencyOnly = /^\s*(?:Rs\.?|rs\.?|RS\.?|₹|[$€£])\s*\d+(?:\.\d{1,2})?\s*$/.test(text);
      if (isCurrencyOnly) {
        return false; // Don't treat "Rs150" alone as expense without context
      }
      
      return true;
    }
    
    return false;
  }

  // Helper method to check if text contains numeric values
  private static hasNumericValue(text: string): boolean {
    // Check for numbers with or without currency symbols
    return /(?:Rs\.?|rs\.?|RS\.?|₹|[$€£])\s*\d+(?:\.\d{1,2})?|\b\d+(?:\.\d{1,2})?\b/.test(text);
  }

  // Helper method to check if text has expense-related context
  private static hasExpenseContext(text: string): boolean {
    const lowerText = text.toLowerCase();
    const expenseContexts = [
      'spent', 'bought', 'purchased', 'paid', 'cost', 'price', 'bill', 'receipt',
      'shopping', 'store', 'market', 'restaurant', 'cafe', 'food', 'lunch', 'dinner',
      'gas', 'fuel', 'electricity', 'rent', 'groceries', 'medicine', 'doctor',
      'haircut', 'salon', 'barber', 'transportation', 'taxi', 'uber', 'lyft',
      'coffee', 'tea', 'snack', 'movie', 'ticket', 'parking', 'toll'
    ];
    
    // Check for explicit expense contexts
    const hasDirectContext = expenseContexts.some(context => lowerText.includes(context));
    if (hasDirectContext) {
      return true;
    }
    
    // Check for "number + for + item" pattern (e.g., "500 for haircut", "20 for lunch")
    const forPattern = /\d+(?:\.\d{1,2})?\s+for\s+\w+/i.test(text);
    if (forPattern) {
      return true;
    }
    
    // Check for "number + currency + for + item" pattern
    const currencyForPattern = /(?:Rs\.?|rs\.?|RS\.?|₹|[$€£])\s*\d+(?:\.\d{1,2})?\s+for\s+\w+/i.test(text);
    if (currencyForPattern) {
      return true;
    }
    
    return false;
  }

  // Get system default currency
  private static getSystemCurrency(): string {
    try {
      // Try to get system locale and extract currency
      const locale = Intl.NumberFormat().resolvedOptions().locale;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Map common locales to their expected currencies (both underscore and hyphen formats)
      const localeCurrencyMap: { [key: string]: string } = {
        'en-IN': 'INR',
        'en_IN': 'INR',
        'hi-IN': 'INR',
        'hi_IN': 'INR',
        'en-CA': 'CAD',
        'en_CA': 'CAD',
        'en-AU': 'AUD',
        'en_AU': 'AUD',
        'de-DE': 'EUR',
        'de_DE': 'EUR',
        'fr-FR': 'EUR',
        'fr_FR': 'EUR',
        'es-ES': 'EUR',
        'es_ES': 'EUR',
        'it-IT': 'EUR',
        'it_IT': 'EUR',
        'ja-JP': 'JPY',
        'ja_JP': 'JPY',
        'ko-KR': 'KRW',
        'ko_KR': 'KRW',
        'zh-CN': 'CNY',
        'zh_CN': 'CNY',
        'pt-BR': 'BRL',
        'pt_BR': 'BRL',
        'ru-RU': 'RUB',
        'ru_RU': 'RUB'
        // Note: en-US and en-GB removed to force India detection
      };
      
      // First check if we have a direct mapping for JavaScript's resolved locale
      if (localeCurrencyMap[locale]) {
        return localeCurrencyMap[locale];
      }
      
      // Check for region-based mapping (e.g., any locale ending with -IN should use INR)
      if (locale.endsWith('-IN') || locale.endsWith('_IN')) {
        return 'INR';
      }
      
      // Use timezone as an additional hint for currency detection
      if (timezone && (timezone.includes('Asia/Calcutta') || timezone.includes('Asia/Kolkata'))) {
        return 'INR';
      }
      
      // For common English locales, test INR formatting to determine if user is likely in India
      if (locale.includes('en')) {
        try {
          const testFormatter = new Intl.NumberFormat(locale, { 
            style: 'currency', 
            currency: 'INR' 
          });
          const formatted = testFormatter.format(100);
          
          // If INR formats with ₹ symbol, it indicates the system likely supports Indian localization
          if (formatted.includes('₹')) {
            return 'INR';
          }
        } catch (error) {
          // INR formatting failed, continue to other checks
        }
      }
      
      // Specific handling for different locales
      if (locale.endsWith('-US') || locale.endsWith('_US')) {
        return 'USD';
      }
      if (locale.endsWith('-GB') || locale.endsWith('_GB')) {
        return 'GBP';
      }
      if (locale.endsWith('-DE') || locale.endsWith('_DE') || 
          locale.endsWith('-FR') || locale.endsWith('_FR') ||
          locale.endsWith('-ES') || locale.endsWith('_ES') || 
          locale.endsWith('-IT') || locale.endsWith('_IT')) {
        return 'EUR';
      }
      
      // Try to get currency from Intl as fallback
      const currency = Intl.NumberFormat(locale).resolvedOptions().currency;
      return currency || 'USD'; // Final fallback to USD
    } catch (error) {
      // Fallback for environments where Intl is not fully supported
      return 'USD';
    }
  }

  static extractActionItem(text: string, entryId: string): ActionItem | null {
    if (this.detectActionItem(text)) {
      // Clean up the title - remove leading dot if present
      let cleanTitle = text.trim();
      if (cleanTitle.startsWith('.')) {
        cleanTitle = cleanTitle.substring(1).trim();
      }
      
      return {
        id: uuid.v4(),
        entryId,
        title: cleanTitle,
        completed: false,
        createdAt: new Date()
      };
    }
    return null;
  }

  static extractExpenseInfo(text: string, entryId: string): Expense | null {
    const amount = this.extractAmount(text);
    if (!amount) return null;

    // Extract category and clean description from the text
    const categoryInfo = this.extractCategoryFromText(text);

    return {
      id: uuid.v4(),
      entryId,
      amount: amount.value,
      currency: amount.currency,
      description: categoryInfo.description,
      category: categoryInfo.category,
      createdAt: new Date()
    };
  }

  // Extract category and keep full description from expense text
  private static extractCategoryFromText(text: string): { category?: string; description: string } {
    const lowerText = text.toLowerCase().trim();
    const originalText = text.trim();
    
    // Pattern 1: "spent/paid/bought X for Y" -> category: Y, description: original text
    const forPattern = /(?:spent|paid|bought|purchased|cost|charged)\s+(?:Rs\.?|rs\.?|RS\.?|₹|[$€£])?\s*\d+(?:\.\d{1,2})?\s+for\s+(.+)/i;
    const forMatch = text.match(forPattern);
    if (forMatch) {
      const category = forMatch[1].trim();
      return {
        category: this.mapToStandardCategory(category),
        description: originalText
      };
    }

    // Pattern 2: "X for Y" -> category: Y, description: original text
    const simpleForPattern = /(?:Rs\.?|rs\.?|RS\.?|₹|[$€£])?\s*\d+(?:\.\d{1,2})?\s+for\s+(.+)/i;
    const simpleForMatch = text.match(simpleForPattern);
    if (simpleForMatch) {
      const category = simpleForMatch[1].trim();
      return {
        category: this.mapToStandardCategory(category),
        description: originalText
      };
    }

    // Pattern 3: "spent/paid/bought X on Y" -> category: Y, description: original text
    const onPattern = /(?:spent|paid|bought|purchased)\s+(?:Rs\.?|rs\.?|RS\.?|₹|[$€£])?\s*\d+(?:\.\d{1,2})?\s+on\s+(.+)/i;
    const onMatch = text.match(onPattern);
    if (onMatch) {
      const category = onMatch[1].trim();
      return {
        category: this.mapToStandardCategory(category),
        description: originalText
      };
    }

    // Pattern 4: Look for expense context words and extract category
    const expenseContexts = [
      'haircut', 'salon', 'barber', 'taxi', 'uber', 'lyft', 'parking', 'toll',
      'coffee', 'tea', 'lunch', 'dinner', 'breakfast', 'snack', 'food',
      'groceries', 'shopping', 'movie', 'ticket', 'gas', 'fuel',
      'electricity', 'rent', 'medicine', 'doctor', 'train', 'bus', 'flight',
      'metro', 'subway', 'cab', 'auto'
    ];
    
    for (const context of expenseContexts) {
      if (lowerText.includes(context)) {
        // For compound terms like "train ticket", extract the full relevant phrase
        if (context === 'ticket') {
          // Look for transportation + ticket combinations first
          const transportTicketMatch = lowerText.match(/\b(train|bus|flight|metro|subway)\s+ticket\b/);
          if (transportTicketMatch) {
            return {
              category: this.mapToStandardCategory(transportTicketMatch[0]),
              description: originalText
            };
          }
          // Look for movie/entertainment + ticket combinations
          const entertainmentTicketMatch = lowerText.match(/\b(movie|cinema|concert|show)\s+ticket\b/);
          if (entertainmentTicketMatch) {
            return {
              category: this.mapToStandardCategory(entertainmentTicketMatch[0]),
              description: originalText
            };
          }
          // Generic ticket
          return {
            category: this.mapToStandardCategory('ticket'),
            description: originalText
          };
        }
        
        return {
          category: this.mapToStandardCategory(context),
          description: originalText
        };
      }
    }

    // Fallback: return original text as description without category
    return {
      description: originalText
    };
  }

  // Map extracted categories to standard category names
  private static mapToStandardCategory(extractedCategory: string): string {
    const lowerCategory = extractedCategory.toLowerCase().trim();
    
    // Transportation (check first for specific transport + ticket combinations)
    if (['train ticket', 'bus ticket', 'flight ticket', 'metro ticket', 'subway ticket'].some(word => lowerCategory.includes(word))) {
      return 'Transportation';
    }
    
    // Transportation (general)
    if (['taxi', 'uber', 'lyft', 'parking', 'toll', 'gas', 'fuel', 'transportation', 'train', 'bus', 'flight', 'metro', 'subway', 'cab', 'auto'].some(word => lowerCategory.includes(word))) {
      return 'Transportation';
    }
    
    // Food & Dining
    if (['coffee', 'tea', 'lunch', 'dinner', 'breakfast', 'snack', 'food', 'groceries', 'restaurant', 'cafe'].some(word => lowerCategory.includes(word))) {
      return 'Food';
    }
    
    // Personal Care
    if (['haircut', 'salon', 'barber', 'medicine', 'doctor', 'hospital', 'pharmacy'].some(word => lowerCategory.includes(word))) {
      return 'Health & Personal Care';
    }
    
    // Entertainment (check after transportation to avoid conflicts)
    if (['movie ticket', 'concert ticket', 'show ticket', 'movie', 'cinema', 'theater', 'entertainment'].some(word => lowerCategory.includes(word))) {
      return 'Entertainment';
    }
    
    // Generic ticket (fallback for other tickets)
    if (lowerCategory.includes('ticket') && !['train', 'bus', 'flight', 'metro', 'subway'].some(transport => lowerCategory.includes(transport))) {
      return 'Entertainment';
    }
    
    // Utilities
    if (['electricity', 'rent', 'bill', 'utilities', 'water', 'internet'].some(word => lowerCategory.includes(word))) {
      return 'Utilities';
    }
    
    // Shopping
    if (['shopping', 'clothes', 'clothing', 'shoes', 'accessories'].some(word => lowerCategory.includes(word))) {
      return 'Shopping';
    }
    
    // Default: capitalize first letter of extracted category
    return extractedCategory.charAt(0).toUpperCase() + extractedCategory.slice(1);
  }

  private static extractAmount(text: string): { value: number; currency: string } | null {
    // Find all numbers in the text, including those attached to currency symbols
    const numberMatches = text.match(/(?:Rs\.?|rs\.?|RS\.?|₹|[$€£])\s*(\d+(?:\.\d{1,2})?)|(\d+(?:\.\d{1,2})?)/g);
    if (!numberMatches || numberMatches.length === 0) return null;

    let detectedCurrency = null;
    let largestAmount = 0;

    // Extract numeric parts and detect explicit currency symbols
    const amounts = numberMatches.map(match => {
      // Extract number from patterns like "Rs150", "₹100", "$50" or plain "100"
      const numericPart = match.replace(/^(Rs\.?|rs\.?|RS\.?|₹|[$€£])\s*/i, '');
      const amount = parseFloat(numericPart);
      
      if (!isNaN(amount) && amount > 0) {
        // If this is the largest amount so far, check if it has an explicit currency
        if (amount >= largestAmount) {
          largestAmount = amount;
          
          // Check for explicit currency symbols in the original match
          if (match.includes('$')) {
            detectedCurrency = 'USD';
          } else if (match.includes('€')) {
            detectedCurrency = 'EUR';
          } else if (match.includes('£')) {
            detectedCurrency = 'GBP';
          } else if (match.includes('₹')) {
            detectedCurrency = 'INR';
          } else if (/Rs\.?|rs\.?|RS\.?/i.test(match)) {
            detectedCurrency = 'INR';
          }
        }
        
        return amount;
      }
      return NaN;
    }).filter(num => !isNaN(num) && num > 0);

    if (amounts.length === 0) return null;

    // Use the largest number as the expense amount
    const value = Math.max(...amounts);
    
    // Use explicitly detected currency if found, otherwise fall back to system default
    const currency = detectedCurrency || this.getSystemCurrency();

    return { value, currency };
  }

  static formatCurrency(amount: number, currency?: string): string {
    // Use provided currency or fall back to system default
    const currencyCode = currency || this.getSystemCurrency();
    
    try {
      // Use specific locales to avoid unwanted prefixes
      let locale = 'en-US'; // Default to US English
      
      // Choose locale based on currency for cleaner formatting
      switch (currencyCode) {
        case 'USD':
          locale = 'en-US'; // Produces clean $12.99
          break;
        case 'EUR':
          locale = 'en-GB'; // Produces clean €12.99
          break;
        case 'GBP':
          locale = 'en-GB'; // Produces clean £12.99
          break;
        case 'INR':
          locale = 'en-IN'; // Produces clean ₹12.99
          break;
        case 'CAD':
          locale = 'en-CA'; // Should produce C$12.99 or CA$12.99
          break;
        case 'AUD':
          locale = 'en-AU'; // Should produce A$12.99
          break;
      }
      
      const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      
      const formatted = formatter.format(amount);
      
      // Clean up any remaining unwanted prefixes for better display
      // Remove "US" prefix from USD formatting (US$12.99 → $12.99)
      if (currencyCode === 'USD' && formatted.startsWith('US$')) {
        return formatted.replace('US$', '$');
      }
      
      // Remove "CA" prefix from CAD formatting if present
      if (currencyCode === 'CAD' && formatted.startsWith('CA$')) {
        return formatted.replace('CA$', 'C$');
      }
      
      return formatted;
    } catch (error) {
      // Fallback formatting if currency is not supported
      const symbols: { [key: string]: string } = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'INR': '₹',
        'CAD': 'C$',
        'AUD': 'A$',
        'JPY': '¥',
        'CNY': '¥'
      };
      
      const symbol = symbols[currencyCode] || currencyCode;
      return `${symbol}${amount.toFixed(2)}`;
    }
  }

  static isExpenseRelated(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.EXPENSE_KEYWORDS.some((keyword: string) => lowerText.includes(keyword));
  }
}
