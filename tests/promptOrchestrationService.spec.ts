import { test, expect } from '@playwright/test';
import { promptOrchestrationService } from '../services/promptOrchestrationService';
import { intakeSessionService } from '../services/intakeSessionService';
import { conversationStateService } from '../services/conversationStateService';

test.describe('PromptOrchestrationService', () => {
  test('should return welcome prompt', () => {
    expect(promptOrchestrationService.getWelcomePrompt()).toContain('Hello, I\'m Parker');
  });

  test('should return next question prompt', () => {
    const session = intakeSessionService.createSession();
    conversationStateService.createConversation(session.id);
    
    const prompt = promptOrchestrationService.getNextQuestionPrompt(session.id);
    expect(prompt).toBe('May I have your name, please?');
  });

  test('should return confirmation prompt', () => {
    expect(promptOrchestrationService.getConfirmationPrompt('name', 'Alice')).toBe('I heard Alice for your name. Is that correct?');
  });

  test('should return clarification prompt', () => {
    expect(promptOrchestrationService.getClarificationPrompt('phone number')).toBe('I\'m sorry, I didn\'t quite catch that. Could you please clarify your phone number?');
  });

  test('should return completion prompt', () => {
    const session = intakeSessionService.createSession({ name: 'Bob' });
    conversationStateService.createConversation(session.id);
    
    const prompt = promptOrchestrationService.getCompletionPrompt(session.id);
    expect(prompt).toContain('Thank you, Bob');
  });

  test('should handle missing session for next question', () => {
    expect(promptOrchestrationService.getNextQuestionPrompt('invalid-id')).toContain('couldn\'t find your session');
  });
});
