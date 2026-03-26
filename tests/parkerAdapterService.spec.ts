import { test, expect } from '@playwright/test';
import { parkerAdapterService } from '../services/parkerAdapterService';
import { integrationGatewayService } from '../services/integrationGatewayService';
import { intakeSessionService } from '../services/intakeSessionService';
import { conversationStateService } from '../services/conversationStateService';
import { Part, RepairOrder, VesselHistory } from '../types';

test.describe('ParkerAdapterService', () => {
  test.beforeEach(() => {
    intakeSessionService._clearSessions();
    conversationStateService._clearConversations();
  });

  test('should delegate startIntakeSession to createSession, create conversation state, and publishDomainEvent', () => {
    const originalPublish = integrationGatewayService.publishDomainEvent;
    let capturedEvent: string | null = null;
    let capturedPayload: any = null;

    integrationGatewayService.publishDomainEvent = (eventName, payload) => {
      capturedEvent = eventName;
      capturedPayload = payload;
    };

    const customerInfo = { name: 'John Doe' };
    const sessionId = parkerAdapterService.startIntakeSession(customerInfo);

    expect(sessionId).toBeDefined();
    
    const session = intakeSessionService.getSession(sessionId);
    expect(session).toBeDefined();
    expect(session?.customerInfo).toEqual(customerInfo);

    const convState = conversationStateService.getConversation(sessionId);
    expect(convState).toBeDefined();
    expect(convState?.sessionId).toBe(sessionId);

    expect(capturedEvent).toBe('parker:intake-started');
    expect(capturedPayload).toEqual({ sessionId });

    integrationGatewayService.publishDomainEvent = originalPublish;
  });

  test('should generate next prompt based on conversation state', () => {
    const sessionId = parkerAdapterService.startIntakeSession();
    
    // Initial state
    let prompt = parkerAdapterService.generateNextPrompt(sessionId);
    expect(prompt).toBe('May I have your name, please?');

    // Awaiting confirmation
    parkerAdapterService.requestConfirmation(sessionId, 'vesselMake');
    prompt = parkerAdapterService.generateNextPrompt(sessionId);
    expect(prompt).toBe('I heard that for your vesselMake. Is that correct?');

    // Awaiting clarification
    parkerAdapterService.requestClarification(sessionId, 'vesselMake');
    prompt = parkerAdapterService.generateNextPrompt(sessionId);
    expect(prompt).toBe('I\'m sorry, I didn\'t quite catch that. Could you please clarify your vesselMake?');

    // Completed
    conversationStateService.markComplete(sessionId);
    prompt = parkerAdapterService.generateNextPrompt(sessionId);
    expect(prompt).toContain('Thank you');
  });

  test('should process user answer and update conversation state', () => {
    const sessionId = parkerAdapterService.startIntakeSession();
    parkerAdapterService.processUserAnswer(sessionId, 'Yes, I need an oil change.');
    
    const convState = conversationStateService.getConversation(sessionId);
    expect(convState?.lastUserAnswer).toBe('Yes, I need an oil change.');
  });

  test('should process user answer and update session based on current question', () => {
    const sessionId = parkerAdapterService.startIntakeSession();
    
    // Simulate asking for name
    conversationStateService.updateConversation(sessionId, { currentQuestion: "May I have your name, please?" });
    parkerAdapterService.processUserAnswer(sessionId, 'My name is Alice');
    
    let session = intakeSessionService.getSession(sessionId);
    expect(session?.customerInfo?.name).toBe('Alice');

    // Simulate asking for phone
    conversationStateService.updateConversation(sessionId, { currentQuestion: "What is the best phone number or email to reach you?" });
    parkerAdapterService.processUserAnswer(sessionId, '555-123-4567');
    
    session = intakeSessionService.getSession(sessionId);
    expect(session?.customerInfo?.phone).toBe('5551234567');
    
    // Simulate asking for vessel make
    conversationStateService.updateConversation(sessionId, { currentQuestion: "What is the make and model of your vessel?" });
    parkerAdapterService.processUserAnswer(sessionId, '2020 Yamaha Waverunner');
    
    session = intakeSessionService.getSession(sessionId);
    expect(session?.vesselInfo?.make).toBe('Yamaha');
    expect(session?.vesselInfo?.year).toBe(2020);

    // Simulate asking for problem
    conversationStateService.updateConversation(sessionId, { currentQuestion: "Could you describe the problem or the service you need?" });
    parkerAdapterService.processUserAnswer(sessionId, 'Needs an oil change');
    
    session = intakeSessionService.getSession(sessionId);
    expect(session?.reportedProblem).toBe('Needs an oil change');
  });

  test('should request confirmation and update conversation state', () => {
    const sessionId = parkerAdapterService.startIntakeSession();
    parkerAdapterService.requestConfirmation(sessionId, 'vesselMake');
    
    const convState = conversationStateService.getConversation(sessionId);
    expect(convState?.awaitingConfirmation).toBe('vesselMake');
    expect(convState?.awaitingClarification).toBeNull();
  });

  test('should request clarification and update conversation state', () => {
    const sessionId = parkerAdapterService.startIntakeSession();
    parkerAdapterService.requestClarification(sessionId, 'reportedProblem');
    
    const convState = conversationStateService.getConversation(sessionId);
    expect(convState?.awaitingClarification).toBe('reportedProblem');
    expect(convState?.awaitingConfirmation).toBeNull();
  });

  test('should delegate lookupVesselByHIN to getVesselHistory', async () => {
    const mockVessel = { vesselHIN: 'TESTHIN123' } as VesselHistory;
    const originalGetVesselHistory = integrationGatewayService.getVesselHistory;
    
    integrationGatewayService.getVesselHistory = async (hin) => {
      if (hin === 'TESTHIN123') return mockVessel;
      return undefined;
    };

    const result = await parkerAdapterService.lookupVesselByHIN('TESTHIN123');
    expect(result).toBe(mockVessel);

    integrationGatewayService.getVesselHistory = originalGetVesselHistory;
  });

  test('should delegate checkRequestedPartAvailability to checkInventory', async () => {
    const mockPart = { partNumber: 'TEST-PART' } as Part;
    const originalCheckInventory = integrationGatewayService.checkInventory;

    integrationGatewayService.checkInventory = async (partNumber) => {
      if (partNumber === 'TEST-PART') return mockPart;
      return undefined;
    };

    const result = await parkerAdapterService.checkRequestedPartAvailability('TEST-PART');
    expect(result).toBe(mockPart);

    integrationGatewayService.checkInventory = originalCheckInventory;
  });

  test('should delegate createStagedRepairOrderFromIntake to finalizeSession, createRepairOrder, and mark conversation complete', async () => {
    const mockRO = { id: 'ro-123' } as RepairOrder;
    const originalCreateRepairOrder = integrationGatewayService.createRepairOrder;

    let capturedArgs: any[] = [];
    integrationGatewayService.createRepairOrder = async (...args) => {
      capturedArgs = args;
      return mockRO;
    };

    const sessionId = parkerAdapterService.startIntakeSession({ name: 'Jane Doe', phone: '1234567890' });
    intakeSessionService.updateSession(sessionId, {
      vesselInfo: { make: 'Yamaha' },
      reportedProblem: 'directive1',
      requestedServices: ['pkg1']
    });

    const result = await parkerAdapterService.createStagedRepairOrderFromIntake(sessionId);

    expect(result).toBe(mockRO);
    expect(capturedArgs[0]).toEqual({
      customerName: 'Jane Doe',
      customerPhones: ['1234567890'],
      customerEmails: [],
      customerAddress: { street: '', city: '', state: '', zip: '' },
      customerNotes: null,
      vesselName: '',
      vesselHIN: '',
      boatMake: 'Yamaha',
      boatModel: '',
      boatYear: '',
      boatLength: '',
      engineMake: '',
      engineModel: '',
      engineYear: '',
      engineHorsepower: '',
      engineSerial: '',
    });
    expect(capturedArgs[1]).toEqual(['pkg1']);
    expect(capturedArgs[2]).toEqual([]);
    expect(capturedArgs[3]).toEqual(['directive1']);
    expect(capturedArgs[4].type).toBe('verbal');

    const session = intakeSessionService.getSession(sessionId);
    expect(session?.status).toBe('finalized');

    const convState = conversationStateService.getConversation(sessionId);
    expect(convState?.completed).toBe(true);

    integrationGatewayService.createRepairOrder = originalCreateRepairOrder;
  });

  test('should delegate publishIntakeCompletedEvent to publishDomainEvent', () => {
    const originalPublish = integrationGatewayService.publishDomainEvent;
    let capturedEvent: string | null = null;
    let capturedPayload: any = null;

    integrationGatewayService.publishDomainEvent = (eventName, payload) => {
      capturedEvent = eventName;
      capturedPayload = payload;
    };

    parkerAdapterService.publishIntakeCompletedEvent('session-123', 'ro-456');

    expect(capturedEvent).toBe('parker:intake-completed');
    expect(capturedPayload).toEqual({ sessionId: 'session-123', roId: 'ro-456' });

    integrationGatewayService.publishDomainEvent = originalPublish;
  });

  test('should delegate createServiceDeskNotification to createNotification', () => {
    const originalCreateNotification = integrationGatewayService.createNotification;
    let capturedType: string | null = null;
    let capturedMessage: string | null = null;
    let capturedData: any = null;

    integrationGatewayService.createNotification = (type, message, data) => {
      capturedType = type;
      capturedMessage = message;
      capturedData = data;
    };

    parkerAdapterService.createServiceDeskNotification('Parker says hi', { detail: 'test' });

    expect(capturedType).toBe('info');
    expect(capturedMessage).toBe('Parker says hi');
    expect(capturedData).toEqual({ detail: 'test' });

    integrationGatewayService.createNotification = originalCreateNotification;
  });
});
