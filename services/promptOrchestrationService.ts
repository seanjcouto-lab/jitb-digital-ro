import { intakeSessionService } from './intakeSessionService';
import { intakeWorkflowService } from './intakeWorkflowService';

export const promptOrchestrationService = {
  getWelcomePrompt(): string {
    return "Hello, I'm Parker, the AI service assistant. I can help you get your vessel checked in for service. Let's get started.";
  },

  getNextQuestionPrompt(sessionId: string): string {
    const session = intakeSessionService.getSession(sessionId);
    if (!session) {
      return "I'm sorry, I couldn't find your session. Let's start over.";
    }

    const nextQuestion = intakeWorkflowService.determineNextQuestion(session);
    if (!nextQuestion) {
      return this.getCompletionPrompt(sessionId);
    }
    return nextQuestion;
  },

  getConfirmationPrompt(fieldName: string, value: string): string {
    return `I heard ${value} for your ${fieldName}. Is that correct?`;
  },

  getClarificationPrompt(fieldName: string): string {
    return `I'm sorry, I didn't quite catch that. Could you please clarify your ${fieldName}?`;
  },

  getCompletionPrompt(sessionId: string): string {
    const session = intakeSessionService.getSession(sessionId);
    const name = session?.customerInfo?.name || 'there';
    return `Thank you, ${name}. I have all the information I need. I'll create a service request for your vessel now.`;
  }
};
