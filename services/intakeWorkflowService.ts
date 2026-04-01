import { IntakeSession } from './intakeSessionService';
import { conversationStateService } from './conversationStateService';

export const intakeWorkflowService = {
  detectMissingInformation: (session: IntakeSession): string[] => {
    const missing: string[] = [];
    if (!session.customerInfo || !session.customerInfo.name) missing.push('customerName');
    if (!session.customerInfo || (!session.customerInfo.phone && !session.customerInfo.email)) missing.push('contactInfo');
    if (!session.vesselInfo || !session.vesselInfo.make) missing.push('vesselMake');
    if (!session.reportedProblem && (!session.requestedServices || session.requestedServices.length === 0)) missing.push('serviceReason');
    return missing;
  },

  determineNextQuestion: (session: IntakeSession): string | null => {
    const missing = intakeWorkflowService.detectMissingInformation(session);
    let nextQuestion: string | null = null;
    
    if (missing.length === 0) {
      nextQuestion = null; // Ready to finalize
    } else if (missing.includes('customerName')) {
      nextQuestion = "May I have your name, please?";
    } else if (missing.includes('contactInfo')) {
      nextQuestion = "What is the best phone number or email to reach you?";
    } else if (missing.includes('vesselMake')) {
      nextQuestion = "What is the make and model of your vessel?";
    } else if (missing.includes('serviceReason')) {
      nextQuestion = "Could you describe the problem or the service you need?";
    } else {
      nextQuestion = "Could you provide more details about your request?";
    }

    const convState = conversationStateService.getConversation(session.id);
    if (convState) {
      conversationStateService.updateConversation(session.id, {
        lastQuestion: convState.currentQuestion,
        currentQuestion: nextQuestion
      });
    }

    return nextQuestion;
  },

  validateSessionData: (session: IntakeSession): boolean => {
    return intakeWorkflowService.detectMissingInformation(session).length === 0;
  },

  prepareRepairOrderPayload: (session: IntakeSession) => {
    if (!intakeWorkflowService.validateSessionData(session)) {
      throw new Error("Session is missing required information to create a Repair Order.");
    }

    return {
      profileData: {
        customerName: session.customerInfo.name,
        customerPhones: session.customerInfo.phone ? [session.customerInfo.phone] : [],
        customerEmails: session.customerInfo.email ? [session.customerInfo.email] : [],
        customerAddress: { street: '', city: '', state: '', zip: '' },
        customerNotes: null,
        vesselName: '',
        vesselHIN: session.vesselInfo?.hin || '',
        boatMake: session.vesselInfo?.make || '',
        boatModel: session.vesselInfo?.model || '',
        boatYear: '',
        boatLength: '',
        engineMake: '',
        engineModel: '',
        engineYear: '',
        engineHours: undefined,
        engineHorsepower: '',
        engineSerial: '',
      },
      selectedPackages: session.requestedServices || [],
      manualParts: [], // Parker doesn't directly map requestedParts to Part objects here without inventory lookup, so we leave it empty for manual review
      manualDirectives: session.reportedProblem ? [session.reportedProblem] : [],
      authInfo: { type: 'verbal' as const, data: 'Authorized via Parker Intake', timestamp: Date.now() }
    };
  }
};
