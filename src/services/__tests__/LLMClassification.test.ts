/**
 * Local LLM Classification Test
 * Run this to test the classifier without opening the full app
 */

import { LLMClassificationService } from '../LLMClassificationService';

describe('LLMClassificationService', () => {
  it('should classify expense text', async () => {
    const result = await LLMClassificationService.classifyText('spent Rs150 for coffee');
    expect(result.type).toBe('expense');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should classify action text', async () => {
    const result = await LLMClassificationService.classifyText('todo: buy birthday gift');
    expect(result.type).toBe('action');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should classify log text', async () => {
    const result = await LLMClassificationService.classifyText('had a great meeting today');
    expect(result.type).toBe('log');
    expect(result.confidence).toBeGreaterThan(0);
  });
});

