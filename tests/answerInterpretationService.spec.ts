import { test, expect } from '@playwright/test';
import { answerInterpretationService } from '../services/answerInterpretationService';

test.describe('AnswerInterpretationService', () => {
  test('should interpret customer name', () => {
    expect(answerInterpretationService.interpretCustomerName('My name is John Doe')).toBe('John Doe');
    expect(answerInterpretationService.interpretCustomerName('I am Jane Smith')).toBe('Jane Smith');
    expect(answerInterpretationService.interpretCustomerName('Bob')).toBe('Bob');
  });

  test('should interpret phone number', () => {
    expect(answerInterpretationService.interpretPhone('My number is 555-123-4567')).toBe('5551234567');
    expect(answerInterpretationService.interpretPhone('(555) 987-6543')).toBe('5559876543');
    expect(answerInterpretationService.interpretPhone('no number')).toBeNull();
  });

  test('should interpret vessel info', () => {
    expect(answerInterpretationService.interpretVesselInfo('2015 Yamaha Waverunner')).toEqual({ year: 2015, make: 'Yamaha' });
    expect(answerInterpretationService.interpretVesselInfo('Sea Ray')).toEqual({ make: 'Sea Ray' });
    expect(answerInterpretationService.interpretVesselInfo('Custom Boat')).toEqual({ make: 'Custom Boat' });
  });

  test('should interpret problem description', () => {
    expect(answerInterpretationService.interpretProblemDescription(' The engine is making a weird noise ')).toBe('The engine is making a weird noise');
    expect(answerInterpretationService.interpretProblemDescription('a')).toBeNull();
  });
});
