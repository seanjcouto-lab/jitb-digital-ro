import { IntakeSession } from './intakeSessionService';

export const answerInterpretationService = {
  interpretCustomerName(answer: string): string | null {
    const cleaned = answer.replace(/^(my name is|i am|this is|it's)\s+/i, '').trim();
    if (cleaned.length > 1) return cleaned;
    return null;
  },

  interpretPhone(answer: string): string | null {
    const digits = answer.replace(/\D/g, '');
    if (digits.length >= 7) return digits;
    return null;
  },

  interpretVesselInfo(answer: string): { make?: string, model?: string, year?: number } | null {
    const result: { make?: string, model?: string, year?: number } = {};
    const yearMatch = answer.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      result.year = parseInt(yearMatch[0], 10);
    }
    
    const lowerAnswer = answer.toLowerCase();
    if (lowerAnswer.includes('yamaha')) result.make = 'Yamaha';
    else if (lowerAnswer.includes('sea ray') || lowerAnswer.includes('searay')) result.make = 'Sea Ray';
    else if (lowerAnswer.includes('bayliner')) result.make = 'Bayliner';
    else if (lowerAnswer.includes('mastercraft')) result.make = 'Mastercraft';
    else result.make = answer.trim();

    return Object.keys(result).length > 0 ? result : null;
  },

  interpretProblemDescription(answer: string): string | null {
    if (answer.trim().length > 2) return answer.trim();
    return null;
  }
};
