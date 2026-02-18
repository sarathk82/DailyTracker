/**
 * Local LLM-based text classification service
 * Uses a lightweight local model for classification (no API calls needed)
 * 
 * Current implementation: Enhanced pattern matching with ML-like scoring
 * Future: Can be replaced with ONNX Runtime + DistilBERT or TFLite model
 */

export interface ClassificationResult {
  type: 'expense' | 'action' | 'log';
  confidence: number;
  reasoning?: string;
  extractedData?: {
    amount?: number;
    currency?: string;
    category?: string;
    dueDate?: Date;
  };
}

// Training data patterns for local classification model
interface ClassificationPattern {
  type: 'expense' | 'action' | 'log';
  patterns: RegExp[];
  keywords: string[];
  weight: number;
}

export class LLMClassificationService {
  // Local model is always enabled (no API key needed)
  private static readonly LOCAL_MODE = true;

  // Enhanced pattern-based classifier (lightweight local "model")
  private static readonly CLASSIFICATION_PATTERNS: ClassificationPattern[] = [
    {
      type: 'expense',
      patterns: [
        /spent|paid|cost|bought|purchased|price|bill/i,
        /\$\d+|\d+\s*(?:dollars?|rupees?|rs\.?|inr|usd|eur|gbp)/i,
        /[₹$€£]\s*\d+/i,
        /\d+\s+for\s+\w+/i,
      ],
      keywords: ['spent', 'paid', 'bought', 'purchased', 'cost', 'price', 'bill', 'receipt', 
                 'shopping', 'store', 'restaurant', 'cafe', 'lunch', 'dinner', 'gas', 'fuel',
                 'electricity', 'rent', 'groceries', 'medicine', 'haircut', 'taxi', 'uber'],
      weight: 1.0,
    },
    {
      type: 'action',
      patterns: [
        /^\.+\s+/,  // Starts with dot
        /\btodo\b|\bto-do\b|\btask\b/i,
        /\bneed to\b|\bshould\b|\bmust\b|\bhave to\b/i,
        /\bremind(?:er)?\b|\bremember\b|\bdon'?t forget\b/i,
        /\bdeadline\b|\bdue\b|\bappointment\b|\bmeeting\b/i,
        /\bcall\b|\bemail\b|\bcontact\b|\bfollow up\b/i,
        /\bfinish\b|\bcomplete\b|\bstart\b|\bsubmit\b/i,
        /\b(?:go|going)\s+(?:to|for)\b/i,  // "go to", "going to", "going for"
        /\b(?:tomorrow|today|tonight|later|soon|this week|next week)\b/i,  // Temporal indicators
      ],
      keywords: ['todo', 'task', 'need', 'should', 'must', 'reminder', 'remember',
                 'deadline', 'due', 'appointment', 'meeting', 'call', 'email', 'finish',
                 'tomorrow', 'today', 'tonight', 'later', 'go', 'going', 'visit', 'attend'],
      weight: 1.0,
    },
  ];

  /**
   * Configure the LLM service (for compatibility, but uses local model)
   */
  static configure(config: {
    apiKey?: string;
    apiEndpoint?: string;
    model?: string;
  }) {
    console.log('Local LLM mode - no API configuration needed');
    // Configuration ignored in local mode
  }

  /**
   * Classify text using local LLM model
   */
  static async classifyText(text: string): Promise<ClassificationResult> {
    return this.localClassification(text);
  }

  /**
   * Local classification using enhanced pattern matching
   * Simulates ML model behavior with scoring and confidence
   */
  private static localClassification(text: string): ClassificationResult {
    const lowerText = text.toLowerCase().trim();
    const scores: { [key: string]: number } = {
      expense: 0,
      action: 0,
      log: 0,
    };

    // Score based on patterns and keywords
    for (const pattern of this.CLASSIFICATION_PATTERNS) {
      let score = 0;

      // Pattern matching
      for (const regex of pattern.patterns) {
        if (regex.test(text)) {
          score += 0.3;
        }
      }

      // Keyword matching with context
      for (const keyword of pattern.keywords) {
        if (lowerText.includes(keyword)) {
          // More weight if keyword appears early in text
          const position = lowerText.indexOf(keyword);
          const positionWeight = 1 - (position / text.length) * 0.3;
          score += 0.2 * positionWeight;
        }
      }

      scores[pattern.type] += score * pattern.weight;
    }

    // Special rules for higher accuracy
    
    // Dot prefix = very likely action
    if (/^\s*\.\s*\S/.test(text)) {
      scores.action += 1.5;
    }

    // Numbers + expense context = very likely expense
    const hasNumber = /\d+(\.\d{1,2})?/.test(text);
    const hasExpenseContext = /spent|paid|bought|purchased|cost|for\s+\w+/i.test(text);
    if (hasNumber && hasExpenseContext) {
      scores.expense += 1.2;
    }

    // Currency symbols = strong expense indicator
    if (/[₹$€£]/.test(text)) {
      scores.expense += 0.8;
    }

    // Question words = likely log
    if (/^(?:why|what|how|when|where|who)\b/i.test(text)) {
      scores.log += 0.5;
    }

    // Determine winner - always choose highest score
    const maxScore = Math.max(scores.expense, scores.action, scores.log);
    const totalScore = scores.expense + scores.action + scores.log;
    
    let type: 'expense' | 'action' | 'log' = 'log';
    let confidence = 0.5;

    // Always classify based on highest score (with minimum threshold of 0.1)
    if (maxScore >= 0.1) {
      if (scores.expense === maxScore) {
        type = 'expense';
      } else if (scores.action === maxScore) {
        type = 'action';
      } else {
        type = 'log';
      }
      
      // Normalize confidence (0.5 to 0.95)
      confidence = Math.min(0.95, 0.5 + (maxScore / (totalScore + 1)) * 0.45);
    }

    // Extract data based on type
    const extractedData = this.extractData(text, type);

    return {
      type,
      confidence: Math.round(confidence * 100) / 100,
      reasoning: this.generateReasoning(type, text, scores),
      extractedData,
    };
  }

  /**
   * Extract structured data from text
   */
  private static extractData(text: string, type: 'expense' | 'action' | 'log'): any {
    const data: any = {};

    if (type === 'expense') {
      // Extract amount
      const amountMatch = text.match(/(?:Rs\.?|rs\.?|₹)?\s*(\d+(?:\.\d{1,2})?)/);
      if (amountMatch) {
        data.amount = parseFloat(amountMatch[1]);
      }

      // Extract currency
      if (/₹|Rs\.?|INR/i.test(text)) {
        data.currency = 'INR';
      } else if (/\$|USD/i.test(text)) {
        data.currency = 'USD';
      } else if (/€|EUR/i.test(text)) {
        data.currency = 'EUR';
      } else if (/£|GBP/i.test(text)) {
        data.currency = 'GBP';
      }

      // Extract category
      const categories = {
        food: /food|lunch|dinner|breakfast|restaurant|cafe|coffee|snack/i,
        transport: /taxi|uber|lyft|bus|train|fuel|gas|transport/i,
        shopping: /shopping|store|bought|purchase/i,
        bills: /bill|electricity|rent|water|internet/i,
        health: /medicine|doctor|hospital|pharmacy/i,
        entertainment: /movie|concert|game|entertainment/i,
      };

      for (const [cat, regex] of Object.entries(categories)) {
        if (regex.test(text)) {
          data.category = cat.charAt(0).toUpperCase() + cat.slice(1);
          break;
        }
      }
    }

    if (type === 'action') {
      // Extract due date keywords
      const tomorrow = /tomorrow/i.test(text);
      const today = /today/i.test(text);
      const nextWeek = /next week/i.test(text);

      if (tomorrow) {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        data.dueDate = date;
      } else if (today) {
        data.dueDate = new Date();
      } else if (nextWeek) {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        data.dueDate = date;
      }
    }

    return Object.keys(data).length > 0 ? data : undefined;
  }

  /**
   * Generate human-readable reasoning
   */
  private static generateReasoning(
    type: string,
    text: string,
    scores: { [key: string]: number }
  ): string {
    const reasons: string[] = [];

    if (type === 'expense') {
      if (/[₹$€£]/.test(text)) reasons.push('contains currency symbol');
      if (/\d+/.test(text)) reasons.push('contains numeric amount');
      if (/spent|paid|bought/i.test(text)) reasons.push('expense keywords present');
    } else if (type === 'action') {
      if (/^\s*\./.test(text)) reasons.push('starts with dot prefix');
      if (/todo|task/i.test(text)) reasons.push('task keywords present');
      if (/need to|should|must/i.test(text)) reasons.push('action verbs detected');
    } else {
      reasons.push('no clear expense or task indicators');
    }

    return reasons.join(', ') || 'default classification';
  }

  /**
   * Batch classify multiple texts
   */
  static async classifyBatch(texts: string[]): Promise<ClassificationResult[]> {
    // Local model is fast, process synchronously
    return texts.map(text => this.localClassification(text));
  }
}
