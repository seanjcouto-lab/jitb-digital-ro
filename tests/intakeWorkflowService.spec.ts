import { test, expect } from '@playwright/test';
import { intakeWorkflowService } from '../services/intakeWorkflowService';
import { intakeSessionService } from '../services/intakeSessionService';
import { conversationStateService } from '../services/conversationStateService';

test.describe('IntakeWorkflowService', () => {
  test.beforeEach(() => {
    intakeSessionService._clearSessions();
    conversationStateService._clearConversations();
  });

  test('should detect missing information', () => {
    const session = intakeSessionService.createSession();
    const missing = intakeWorkflowService.detectMissingInformation(session);
    
    expect(missing).toContain('customerName');
    expect(missing).toContain('contactInfo');
    expect(missing).toContain('vesselMake');
    expect(missing).toContain('serviceReason');
  });

  test('should determine next question and update conversation state', () => {
    const session = intakeSessionService.createSession();
    conversationStateService.createConversation(session.id);

    const q1 = intakeWorkflowService.determineNextQuestion(session);
    expect(q1).toBe("May I have your name, please?");
    
    let convState = conversationStateService.getConversation(session.id)!;
    expect(convState.currentQuestion).toBe("May I have your name, please?");
    expect(convState.lastQuestion).toBeNull();
    
    intakeSessionService.updateSession(session.id, {
      customerInfo: { name: 'John Doe' }
    });
    const session2 = intakeSessionService.getSession(session.id)!;
    
    const q2 = intakeWorkflowService.determineNextQuestion(session2);
    expect(q2).toBe("What is the best phone number or email to reach you?");

    convState = conversationStateService.getConversation(session.id)!;
    expect(convState.currentQuestion).toBe("What is the best phone number or email to reach you?");
    expect(convState.lastQuestion).toBe("May I have your name, please?");
  });

  test('should validate session data', () => {
    const session = intakeSessionService.createSession({ name: 'John Doe', phone: '1234567890' });
    conversationStateService.createConversation(session.id);

    intakeSessionService.updateSession(session.id, {
      vesselInfo: { make: 'Sea Ray' },
      reportedProblem: 'Engine noise'
    });
    
    const validSession = intakeSessionService.getSession(session.id)!;
    expect(intakeWorkflowService.validateSessionData(validSession)).toBe(true);
    
    const q = intakeWorkflowService.determineNextQuestion(validSession);
    expect(q).toBeNull();

    const convState = conversationStateService.getConversation(session.id)!;
    expect(convState.currentQuestion).toBeNull();
  });

  test('should prepare repair order payload', () => {
    const session = intakeSessionService.createSession({ name: 'John Doe', phone: '1234567890' });
    intakeSessionService.updateSession(session.id, {
      vesselInfo: { make: 'Sea Ray', model: 'Sundancer' },
      reportedProblem: 'Engine noise',
      requestedServices: ['Oil Change']
    });
    
    const validSession = intakeSessionService.getSession(session.id)!;
    const payload = intakeWorkflowService.prepareRepairOrderPayload(validSession);
    
    expect(payload.profileData.customerName).toBe('John Doe');
    expect(payload.profileData.vesselMake).toBe('Sea Ray');
    expect(payload.selectedPackages).toEqual(['Oil Change']);
    expect(payload.manualDirectives).toEqual(['Engine noise']);
    expect(payload.authInfo.type).toBe('verbal');
  });

  test('should throw error when preparing payload for invalid session', () => {
    const session = intakeSessionService.createSession();
    expect(() => {
      intakeWorkflowService.prepareRepairOrderPayload(session);
    }).toThrow(/Session is missing required information/);
  });
});
