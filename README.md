# Daily Tracker

A React Native app for tracking daily happenings with automatic detection of action items and expenses.

## Features

### 📝 Journal Tab
- WhatsApp-like chat interface for logging daily events
- Full Markdown support for rich text formatting
- Real-time text analysis to detect action items and expenses
- Chronological timeline of all entries

### ✅ Action Items Tab
- Automatically generated from journal entries using keywords:
  - "need to", "must", "todo", "reminder"
  - Markdown checklist format: `- [ ] task`
  - TODO and REMINDER formats
- Mark tasks as complete/incomplete
- Edit task titles and descriptions
- Filter by pending/completed tasks
- Delete functionality

### 💰 Expenses Tab
- Auto-detection of expenses from journal entries:
  - Currency symbols: $, ₹, €, £
  - Keywords: "bought", "paid", "cost", "expense", etc.
- Manual editing of expense details
- Category support (Food, Transportation, Shopping, etc.)
- Multi-currency support
- Monthly and all-time filtering
- Total amount calculations per currency

## Smart Detection

### Expense Detection
- **Currency patterns**: $50, ₹100, €25.50, £10
- **Text patterns**: "50 dollars", "100 rupees"
- **Keywords**: bought, paid, cost, expense, spent, purchase, bill, etc.

### Action Item Detection
- **Keywords**: need to, must, todo, reminder, should, have to, etc.
- **Markdown format**: `- [ ] task description`
- **TODO format**: `TODO: description`
- **REMINDER format**: `REMINDER: description`

## Manual Categorization
Users can manually:
- Mark any journal entry as an expense
- Edit expense amounts, currency, and categories
- Convert any entry to an action item
- Edit action item titles and descriptions

## Installation

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm start
   ```
5. Use Expo Go app to scan the QR code or run on simulator

## Tech Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **React Navigation** for tab navigation
- **AsyncStorage** for local data persistence
- **react-native-markdown-display** for markdown rendering
- **date-fns** for date formatting
- **Expo Vector Icons** for UI icons

## Data Storage

All data is stored locally on the device using AsyncStorage:
- Journal entries with timestamps and type classification
- Action items with completion status and metadata
- Expenses with amounts, currencies, and categories

## UI/UX Design

- Clean, modern interface inspired by WhatsApp
- Tab-based navigation for easy access
- Intuitive gestures and interactions
- Responsive design for various screen sizes
- Real-time feedback and animations
