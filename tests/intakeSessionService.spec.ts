import { test, expect } from '@playwright/test';
import { intakeSessionService } from '../services/intakeSessionService';

test.describe('IntakeSessionService', () => {
  test.beforeEach(() => {
    intakeSessionService._clearSessions();
  });

  test('should create a session', () => {
    const customerInfo = { name: 'Test Customer' };
    const session = intakeSessionService.createSession(customerInfo);
    
    expect(session).toBeDefined();
    expect(session.id).toBeDefined();
    expect(session.status).toBe('active');
    expect(session.customerInfo).toEqual(customerInfo);
    
    const fetchedSession = intakeSessionService.getSession(session.id);
    expect(fetchedSession).toEqual(session);
  });

  test('should update a session', () => {
    const session = intakeSessionService.createSession();
    
    const updatedSession = intakeSessionService.updateSession(session.id, {
      reportedProblem: 'Engine won\'t start',
      requestedServices: ['Diagnostic'],
      notes: 'Customer is in a hurry'
    });
    
    expect(updatedSession.reportedProblem).toBe('Engine won\'t start');
    expect(updatedSession.requestedServices).toEqual(['Diagnostic']);
    expect(updatedSession.notes).toBe('Customer is in a hurry');
    expect(updatedSession.status).toBe('active');
    
    const fetchedSession = intakeSessionService.getSession(session.id);
    expect(fetchedSession).toEqual(updatedSession);
  });

  test('should finalize a session', () => {
    const session = intakeSessionService.createSession();
    
    const finalizedSession = intakeSessionService.finalizeSession(session.id);
    
    expect(finalizedSession.status).toBe('finalized');
    
    const fetchedSession = intakeSessionService.getSession(session.id);
    expect(fetchedSession?.status).toBe('finalized');
  });

  test('should cancel a session', () => {
    const session = intakeSessionService.createSession();
    
    const cancelledSession = intakeSessionService.cancelSession(session.id);
    
    expect(cancelledSession.status).toBe('cancelled');
    
    const fetchedSession = intakeSessionService.getSession(session.id);
    expect(fetchedSession?.status).toBe('cancelled');
  });

  test('should not allow updating a finalized session', () => {
    const session = intakeSessionService.createSession();
    intakeSessionService.finalizeSession(session.id);
    
    expect(() => {
      intakeSessionService.updateSession(session.id, { notes: 'test' });
    }).toThrow(/Cannot update session/);
  });

  test('should not allow finalizing a cancelled session', () => {
    const session = intakeSessionService.createSession();
    intakeSessionService.cancelSession(session.id);
    
    expect(() => {
      intakeSessionService.finalizeSession(session.id);
    }).toThrow(/Cannot finalize session/);
  });
});
