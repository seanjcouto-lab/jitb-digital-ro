import { integrationGatewayService } from './integrationGatewayService';
import { Part, RepairOrder, VesselHistory } from '../types';
import { intakeSessionService } from './intakeSessionService';
import { intakeWorkflowService } from './intakeWorkflowService';
import { conversationStateService } from './conversationStateService';
import { answerInterpretationService } from './answerInterpretationService';
import { promptOrchestrationService } from './promptOrchestrationService';

export const parkerAdapterService = {
  /**
   * Starts a new intake session for Parker.
   * Creates a session and publishes an event to notify the platform.
   */
  startIntakeSession: (customerInfo?: any): string => {
    const session = intakeSessionService.createSession(customerInfo);
    conversationStateService.createConversation(session.id);
    integrationGatewayService.publishDomainEvent('parker:intake-started', { sessionId: session.id });
    return session.id;
  },

  /**
   * Generates the next spoken/chat prompt for Parker based on current state.
   */
  generateNextPrompt: (sessionId: string): string => {
    const convState = conversationStateService.getConversation(sessionId);
    if (!convState) {
      return promptOrchestrationService.getWelcomePrompt();
    }

    if (convState.awaitingConfirmation) {
      // For now, we use a generic 'that' as the value, but in a real scenario we'd extract the pending value
      return promptOrchestrationService.getConfirmationPrompt(convState.awaitingConfirmation, 'that');
    }

    if (convState.awaitingClarification) {
      return promptOrchestrationService.getClarificationPrompt(convState.awaitingClarification);
    }

    if (convState.completed) {
      return promptOrchestrationService.getCompletionPrompt(sessionId);
    }

    return promptOrchestrationService.getNextQuestionPrompt(sessionId);
  },

  /**
   * Processes a user's answer during the intake session.
   */
  processUserAnswer: (sessionId: string, answer: string): void => {
    conversationStateService.updateConversation(sessionId, { lastUserAnswer: answer });
    
    const convState = conversationStateService.getConversation(sessionId);
    const session = intakeSessionService.getSession(sessionId);
    
    if (convState && session && convState.currentQuestion) {
      const q = convState.currentQuestion;
      const updates: any = {};
      
      if (q === "May I have your name, please?") {
        const name = answerInterpretationService.interpretCustomerName(answer);
        if (name) updates.customerInfo = { ...session.customerInfo, name };
      } else if (q === "What is the best phone number or email to reach you?") {
        const phone = answerInterpretationService.interpretPhone(answer);
        if (phone) updates.customerInfo = { ...session.customerInfo, phone };
      } else if (q === "What is the make and model of your vessel?") {
        const vesselInfo = answerInterpretationService.interpretVesselInfo(answer);
        if (vesselInfo) updates.vesselInfo = { ...session.vesselInfo, ...vesselInfo };
      } else if (q === "Could you describe the problem or the service you need?") {
        const problem = answerInterpretationService.interpretProblemDescription(answer);
        if (problem) updates.reportedProblem = problem;
      }
      
      if (Object.keys(updates).length > 0) {
        intakeSessionService.updateSession(sessionId, updates);
      }
    }
  },

  /**
   * Marks that Parker needs confirmation for a specific field.
   */
  requestConfirmation: (sessionId: string, fieldName: string): void => {
    conversationStateService.markAwaitingConfirmation(sessionId, fieldName);
  },

  /**
   * Marks that Parker needs clarification for a specific field.
   */
  requestClarification: (sessionId: string, fieldName: string): void => {
    conversationStateService.markAwaitingClarification(sessionId, fieldName);
  },

  /**
   * Looks up a vessel's history by HIN to provide context for Parker.
   */
  lookupVesselByHIN: async (hin: string): Promise<VesselHistory | undefined> => {
    return await integrationGatewayService.getVesselHistory(hin);
  },

  /**
   * Checks if a requested part is available in inventory.
   */
  checkRequestedPartAvailability: async (partNumber: string): Promise<Part | undefined> => {
    return await integrationGatewayService.checkInventory(partNumber);
  },

  /**
   * Creates a staged Repair Order from the data collected during the Parker intake session.
   */
  createStagedRepairOrderFromIntake: async (
    sessionId: string
  ): Promise<RepairOrder> => {
    const session = intakeSessionService.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const payload = intakeWorkflowService.prepareRepairOrderPayload(session);
    intakeSessionService.finalizeSession(sessionId);

    const ro = await integrationGatewayService.createRepairOrder(
      payload.profileData,
      payload.selectedPackages,
      payload.manualParts,
      payload.manualDirectives,
      payload.authInfo
    );

    conversationStateService.markComplete(sessionId);

    return ro;
  },

  /**
   * Publishes an event indicating that a Parker intake session has been completed.
   */
  publishIntakeCompletedEvent: (sessionId: string, roId: string): void => {
    integrationGatewayService.publishDomainEvent('parker:intake-completed', { sessionId, roId });
  },

  /**
   * Creates a notification for the Service Desk from Parker.
   */
  createServiceDeskNotification: (message: string, data?: any): void => {
    integrationGatewayService.createNotification('info', message, data);
  }
};
