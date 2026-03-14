import { test, expect } from '@playwright/test';
import { conversationStateService } from '../services/conversationStateService';

test.describe('ConversationStateService', () => {
  test.beforeEach(() => {
    conversationStateService._clearConversations();
  });

  test('should create a conversation state', () => {
    const sessionId = 'session-123';
    const state = conversationStateService.createConversation(sessionId);
    
    expect(state.sessionId).toBe(sessionId);
    expect(state.currentQuestion).toBeNull();
    expect(state.completed).toBe(false);
    expect(state.awaitingConfirmation).toBeNull();
    expect(state.awaitingClarification).toBeNull();
    
    const retrieved = conversationStateService.getConversation(sessionId);
    expect(retrieved).toEqual(state);
  });

  test('should update a conversation state', () => {
    const sessionId = 'session-123';
    conversationStateService.createConversation(sessionId);
    
    const updated = conversationStateService.updateConversation(sessionId, {
      currentQuestion: 'What is your name?',
      lastUserAnswer: 'I need an oil change'
    });
    
    expect(updated.currentQuestion).toBe('What is your name?');
    expect(updated.lastUserAnswer).toBe('I need an oil change');
    expect(updated.completed).toBe(false);
  });

  test('should throw error when updating non-existent conversation', () => {
    expect(() => {
      conversationStateService.updateConversation('invalid-id', { currentQuestion: 'Hello?' });
    }).toThrow(/not found/);
  });

  test('should mark awaiting confirmation', () => {
    const sessionId = 'session-123';
    conversationStateService.createConversation(sessionId);
    
    const state = conversationStateService.markAwaitingConfirmation(sessionId, 'vesselMake');
    expect(state.awaitingConfirmation).toBe('vesselMake');
    expect(state.awaitingClarification).toBeNull();
  });

  test('should mark awaiting clarification', () => {
    const sessionId = 'session-123';
    conversationStateService.createConversation(sessionId);
    
    const state = conversationStateService.markAwaitingClarification(sessionId, 'reportedProblem');
    expect(state.awaitingClarification).toBe('reportedProblem');
    expect(state.awaitingConfirmation).toBeNull();
  });

  test('should mark complete', () => {
    const sessionId = 'session-123';
    conversationStateService.createConversation(sessionId);
    conversationStateService.updateConversation(sessionId, {
      currentQuestion: 'Anything else?',
      awaitingConfirmation: 'finalReview'
    });
    
    const state = conversationStateService.markComplete(sessionId);
    expect(state.completed).toBe(true);
    expect(state.currentQuestion).toBeNull();
    expect(state.awaitingConfirmation).toBeNull();
    expect(state.awaitingClarification).toBeNull();
  });
});
