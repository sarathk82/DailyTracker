/**
 * Local LLM Classification Test
 * Run this to test the classifier without opening the full app
 */

import { LLMClassificationService } from '../services/LLMClassificationService';

const testCases = [
  // Expenses
  "spent Rs150 for coffee",
  "bought groceries for $45.50",
  "paid ₹2500 for electricity bill",
  "lunch cost $12.99",
  "purchased fuel Rs3200",
  "500 for haircut",
  "₹300 for taxi",
  
  // Tasks/Actions
  ". call mom tomorrow",
  "need to finish the quarterly report",
  "todo: buy birthday gift for Sarah",
  "must submit tax documents by Friday",
  "should book flight tickets",
  "reminder: doctor appointment at 3pm",
  
  // Logs
  "had a great meeting today",
  "weather is lovely",
  "feeling productive this morning",
  "learned something new about React Native",
  "grateful for a good day",
  "enjoyed my morning coffee",
];

async function runTests() {
  console.log('\n🤖 Local LLM Classification Test\n');
  console.log('='.repeat(80));
  
  for (const text of testCases) {
    const result = await LLMClassificationService.classifyText(text);
    
    const emoji = {
      expense: '💰',
      action: '✅',
      log: '📝'
    }[result.type];
    
    const confidence = (result.confidence * 100).toFixed(0);
    
    console.log(`\n${emoji} [${result.type.toUpperCase()}] ${confidence}% confidence`);
    console.log(`   Input: "${text}"`);
    console.log(`   Reason: ${result.reasoning}`);
    
    if (result.extractedData && Object.keys(result.extractedData).length > 0) {
      console.log(`   Data: ${JSON.stringify(result.extractedData)}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Test complete!\n');
}

// Run tests
runTests().catch(console.error);

export { runTests };
