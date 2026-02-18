import { Entry, Expense, ActionItem } from '../types';
import { LLMClassificationService, ClassificationResult } from '../services/LLMClassificationService';

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
  /**
   * Text analysis now uses LLMClassificationService exclusively for intelligent classification.
   * All detection and extraction methods use the enhanced pattern-based classifier.
   */

  static async detectActionItemAsync(text: string): Promise<boolean> {
    const result = await LLMClassificationService.classifyText(text);
    return result.type === 'action';
  }

  static async detectExpenseAsync(text: string): Promise<boolean> {
    const result = await LLMClassificationService.classifyText(text);
    return result.type === 'expense';
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

  static async extractActionItemAsync(text: string, entryId: string): Promise<ActionItem | null> {
    const result = await LLMClassificationService.classifyText(text);
    
    if (result.type === 'action') {
      // Clean up the title - remove leading dot if present
      let cleanTitle = text.trim();
      if (cleanTitle.startsWith('.')) {
        cleanTitle = cleanTitle.substring(1).trim();
      }
      
      // Use LLM-extracted due date if available, otherwise extract ourselves
      const dueDate = result.extractedData?.dueDate || this.extractDueDate(text);
      
      return {
        id: uuid.v4(),
        entryId,
        title: cleanTitle,
        completed: false,
        createdAt: new Date(),
        dueDate: dueDate
      };
    }
    
    return null;
  }

  static extractDueDate(text: string): Date {
    const lowerText = text.toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check for "today"
    if (/\btoday\b/.test(lowerText)) {
      return new Date(today);
    }
    
    // Check for "tomorrow"
    if (/\btomorrow\b/.test(lowerText)) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }
    
    // Check for "day after tomorrow" or "day after"
    if (/\bday after tomorrow\b/.test(lowerText) || /\bday after\b/.test(lowerText)) {
      const dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);
      return dayAfter;
    }
    
    // Check for "next week"
    if (/\bnext week\b/.test(lowerText)) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek;
    }
    
    // Check for "X week(s) from now" or "X month(s) from now"
    const weeksPattern = /\b(one|two|three|four|\d+)\s+weeks?\s+from\s+now\b/i;
    const weeksMatch = lowerText.match(weeksPattern);
    if (weeksMatch) {
      const weekMap: {[key: string]: number} = { 'one': 1, 'two': 2, 'three': 3, 'four': 4 };
      const weeks = weekMap[weeksMatch[1].toLowerCase()] || parseInt(weeksMatch[1]);
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + (weeks * 7));
      return targetDate;
    }
    
    const monthsPattern = /\b(one|two|three|four|\d+)\s+months?\s+from\s+now\b/i;
    const monthsMatch = lowerText.match(monthsPattern);
    if (monthsMatch) {
      const monthMap: {[key: string]: number} = { 'one': 1, 'two': 2, 'three': 3, 'four': 4 };
      const months = monthMap[monthsMatch[1].toLowerCase()] || parseInt(monthsMatch[1]);
      const targetDate = new Date(today);
      targetDate.setMonth(targetDate.getMonth() + months);
      return targetDate;
    }
    
    // Check for specific day names (e.g., "on monday", "next friday")
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < days.length; i++) {
      const dayPattern = new RegExp(`\\b(?:on |next )?${days[i]}\\b`, 'i');
      if (dayPattern.test(lowerText)) {
        const targetDay = i;
        const currentDay = today.getDay();
        let daysUntil = targetDay - currentDay;
        if (daysUntil <= 0) daysUntil += 7; // Next week if day has passed
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + daysUntil);
        return targetDate;
      }
    }
    
    // Check for date patterns like "on Jan 25", "on 25th", "January 25"
    // Format: Month DD or DD Month
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                       'july', 'august', 'september', 'october', 'november', 'december'];
    const monthShort = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 
                       'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    
    // Try to match "Month DD" or "DD Month" patterns
    for (let i = 0; i < monthNames.length; i++) {
      const monthPattern = new RegExp(`\\b(?:on )?(?:${monthNames[i]}|${monthShort[i]})[\\s,]+([0-3]?\\d)(?:st|nd|rd|th)?\\b`, 'i');
      const dayMonthPattern = new RegExp(`\\b(?:on )?([0-3]?\\d)(?:st|nd|rd|th)?[\\s,]+(?:${monthNames[i]}|${monthShort[i]})\\b`, 'i');
      
      let match = lowerText.match(monthPattern);
      if (!match) match = lowerText.match(dayMonthPattern);
      
      if (match) {
        const day = parseInt(match[1]);
        if (day >= 1 && day <= 31) {
          const targetDate = new Date(today.getFullYear(), i, day);
          // If date is in the past, assume next year
          if (targetDate < today) {
            targetDate.setFullYear(targetDate.getFullYear() + 1);
          }
          return targetDate;
        }
      }
    }
    
    // Check for relative days like "in 3 days", "after 5 days"
    const relativeDaysPattern = /\b(?:in|after)\s+(\d+)\s+days?\b/i;
    const relativeDaysMatch = lowerText.match(relativeDaysPattern);
    if (relativeDaysMatch) {
      const daysToAdd = parseInt(relativeDaysMatch[1]);
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + daysToAdd);
      return targetDate;
    }
    
    // Default to today if no date found
    return new Date(today);
  }

  static async extractExpenseInfoAsync(text: string, entryId: string): Promise<Expense | null> {
    const result = await LLMClassificationService.classifyText(text);
    
    if (result.type === 'expense' && result.extractedData) {
      const amount = result.extractedData.amount || this.extractAmount(text)?.value;
      if (!amount) return null;

      return {
        id: uuid.v4(),
        entryId,
        amount,
        currency: result.extractedData.currency || this.getSystemCurrency(),
        description: text.trim(),
        category: result.extractedData.category || 'Other',
        createdAt: new Date()
      };
    }
    
    return null;
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
    
    // Use simple, reliable currency formatting to avoid Unicode issues on mobile
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
    const formatted = amount.toFixed(2);
    
    // Format with thousand separators
    const parts = formatted.split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const finalAmount = `${integerPart}.${parts[1]}`;
    
    return `${symbol}${finalAmount}`;
  }
}
