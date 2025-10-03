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
    "store", "bill", "receipt"
  ];

  // Keywords for action items
  private static readonly ACTION_KEYWORDS: string[] = [
    "todo", "to-do", "task", "need to", "should",
    "must", "have to", "action", "plan", "schedule",
    "remind", "remember", "don't forget", "important",
    "deadline", "due", "appointment", "meeting", "call",
    "email", "follow up", "buy", "get", "pick up", "pack",
    "finish", "complete", "start", "contact", "reach out",
    "check", "review", "submit", "apply", "book", "reserve"
  ];

  // Action verbs - verbs that typically start actionable sentences
  private static readonly ACTION_VERBS: string[] = [
    // Communication verbs
    "call", "email", "text", "message", "contact", "reach", "notify", "inform", "tell", "ask",
    "discuss", "talk", "speak", "phone", "write", "send", "reply", "respond", "follow",
    
    // Task/Work verbs
    "finish", "complete", "start", "begin", "do", "make", "create", "build", "develop",
    "work", "fix", "repair", "solve", "handle", "manage", "organize", "plan", "prepare",
    "setup", "set", "configure", "install", "update", "upgrade", "implement", "execute",
    
    // Getting/Obtaining verbs
    "buy", "purchase", "get", "obtain", "acquire", "pick", "collect", "fetch", "retrieve",
    "download", "order", "request", "reserve", "book", "schedule", "arrange", "secure",
    
    // Review/Analysis verbs
    "review", "check", "verify", "confirm", "validate", "test", "analyze", "examine",
    "inspect", "audit", "evaluate", "assess", "study", "research", "investigate",
    
    // Submission/Delivery verbs
    "submit", "send", "deliver", "provide", "share", "upload", "publish", "post",
    "present", "report", "announce", "declare", "file", "register", "apply",
    
    // Organization verbs
    "clean", "organize", "sort", "arrange", "pack", "unpack", "move", "transfer",
    "backup", "save", "store", "delete", "remove", "clear", "tidy", "declutter",
    
    // Learning/Development verbs
    "learn", "study", "read", "watch", "attend", "join", "participate", "practice",
    "train", "exercise", "improve", "develop", "enhance", "strengthen", "master",
    
    // Planning verbs
    "plan", "schedule", "book", "reserve", "coordinate", "arrange", "prepare", "draft",
    "outline", "design", "sketch", "map", "list", "prioritize", "decide", "choose"
  ];

  // Regular expressions for action items
  private static readonly ACTION_PATTERNS: RegExp[] = [
    /^\s*\.\s*([^.!?\n]+)/gi, // Dot-prefixed action items (e.g., ". call mom")
    /\bto-?do:?\s*([^.!?\n]+)/gi,
    /\btask:?\s*([^.!?\n]+)/gi,
    /\baction:?\s*([^.!?\n]+)/gi,
    /\bremind(?:er)?:?\s*([^.!?\n]+)/gi,
    /\bneed to:?\s*([^.!?\n]+)/gi,
    /\bshould:?\s*([^.!?\n]+)/gi,
    /\bmust:?\s*([^.!?\n]+)/gi,
    /\bhave to:?\s*([^.!?\n]+)/gi
  ];

  static detectActionItem(text: string): boolean {
    const lowerText = text.toLowerCase().trim();
    const trimmedText = text.trim();
    
    // Check if text starts with a dot (quick action item syntax)
    const startsWithDot = /^\s*\.\s*\S/.test(text);
    if (startsWithDot) {
      return true;
    }
    
    // Check for existing action keywords (this should catch "pack" now)
    const hasActionKeywords = this.ACTION_KEYWORDS.some(keyword => lowerText.includes(keyword));
    
    // Check if text starts with an action verb
    const startsWithActionVerb = this.ACTION_VERBS.some(verb => {
      const verbPattern = new RegExp(`^\\s*${verb}\\b`, 'i');
      return verbPattern.test(text);
    });
    
    // Simplified check: if it contains any action verb + common action context words
    const hasActionVerbWithContext = this.ACTION_VERBS.some(verb => {
      if (lowerText.includes(verb)) {
        // If it has the verb, check for action context
        const actionContext = /\b(by|before|after|tomorrow|today|tonight|this|next|the|my|for|to|on|at)\b/i.test(lowerText);
        return actionContext;
      }
      return false;
    });
    
    // Check for imperative patterns
    const hasImperativePattern = /^(i\s+)?(need to|should|must|have to|will|want to|plan to)\b/i.test(lowerText);
    
    // Check for time-sensitive patterns
    const hasTimePattern = /\b(by\s+\w+|before\s+\w+|after\s+\w+|tomorrow|today|tonight|this\s+week|next\s+week)\b/i.test(lowerText);
    
    return startsWithDot || hasActionKeywords || startsWithActionVerb || hasActionVerbWithContext || hasImperativePattern || 
           (hasTimePattern && this.ACTION_VERBS.some(verb => lowerText.includes(verb)));
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
      'gas', 'fuel', 'electricity', 'rent', 'groceries', 'medicine', 'doctor'
    ];
    return expenseContexts.some(context => lowerText.includes(context));
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

    return {
      id: uuid.v4(),
      entryId,
      amount: amount.value,
      currency: amount.currency,
      description: text,
      createdAt: new Date()
    };
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
