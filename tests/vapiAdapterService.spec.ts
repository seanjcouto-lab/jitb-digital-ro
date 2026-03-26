import { test, expect } from '@playwright/test';
import { vapiAdapterService } from '../services/vapiAdapterService';
import { parkerAdapterService } from '../services/parkerAdapterService';
import { intakeSessionService } from '../services/intakeSessionService';
import { conversationStateService } from '../services/conversationStateService';
import { roStore } from '../data/roStore';
import { inventoryService } from '../services/inventoryService';
import { RepairOrder } from '../types';

test.describe('VapiAdapterService', () => {
  const mockCallId = 'vapi-call-123';
  let addedROs: RepairOrder[] = [];
  let originalRoStoreAdd: any;

  let originalFetchMasterInventory: any;

  test.beforeEach(async () => {
    vapiAdapterService._clearMappings();
    intakeSessionService._clearSessions();
    conversationStateService._clearConversations();
    addedROs = [];
    originalRoStoreAdd = roStore.add;
    roStore.add = async (ro: RepairOrder) => {
      addedROs.push(ro);
      return ro;
    };
    originalFetchMasterInventory = inventoryService.fetchMasterInventory;
    inventoryService.fetchMasterInventory = async () => [];
  });

  test.afterEach(() => {
    roStore.add = originalRoStoreAdd;
    inventoryService.fetchMasterInventory = originalFetchMasterInventory;
  });

  test('should handle a complete voice call flow', async () => {
    // 1. Call Started
    const welcomePrompt = await vapiAdapterService.callStarted(mockCallId);
    expect(welcomePrompt).toBe("May I have your name, please?");

    // 2. User Speech Received (Name)
    const nextPrompt1 = await vapiAdapterService.userSpeechReceived(mockCallId, 'My name is John Doe');
    expect(nextPrompt1).toBe('What is the best phone number or email to reach you?');

    // 3. User Speech Received (Contact)
    const nextPrompt2 = await vapiAdapterService.userSpeechReceived(mockCallId, 'My number is 555-1234');
    expect(nextPrompt2).toBe('What is the make and model of your vessel?');

    // 4. User Speech Received (Vessel)
    const nextPrompt3 = await vapiAdapterService.userSpeechReceived(mockCallId, 'I have a Yamaha 242X');
    expect(nextPrompt3).toBe('Could you describe the problem or the service you need?');

    // 5. User Speech Received (Problem)
    const nextPrompt4 = await vapiAdapterService.userSpeechReceived(mockCallId, 'The engine is making a weird noise');
    
    // It should now be complete and ready to finalize
    expect(nextPrompt4).toContain('Thank you');

    // 6. Generate Voice Response directly
    const generatedResponse = await vapiAdapterService.generateVoiceResponse(mockCallId);
    expect(generatedResponse).toBe(nextPrompt4);

    // 7. Call Ended
    await vapiAdapterService.callEnded(mockCallId);

    // Verify repair order was created
    expect(addedROs.length).toBe(1);
    expect(addedROs[0].customerName).toBe('John Doe');
    expect(addedROs[0].customerPhones[0]).toBe('5551234');
    expect(addedROs[0].boatMake).toBe('Yamaha');
    // model not extracted by interpretVesselInfo — stored in directive instead
    expect(addedROs[0].directives.some(d => d.title.includes('THE ENGINE IS MAKING A WEIRD NOISE'))).toBe(true);
  });

  test('should throw error for unknown call ID', async () => {
    await expect(vapiAdapterService.userSpeechReceived('unknown-id', 'Hello')).rejects.toThrow('No active session found for Vapi call ID: unknown-id');
    await expect(vapiAdapterService.generateVoiceResponse('unknown-id')).rejects.toThrow('No active session found for Vapi call ID: unknown-id');
    await expect(vapiAdapterService.callEnded('unknown-id')).rejects.toThrow('No active session found for Vapi call ID: unknown-id');
  });

  test('should handle call ended with incomplete session gracefully', async () => {
    // Start call
    await vapiAdapterService.callStarted(mockCallId);
    
    // User provides name only
    await vapiAdapterService.userSpeechReceived(mockCallId, 'My name is Jane Doe');
    
    // Call ends prematurely
    await vapiAdapterService.callEnded(mockCallId);
    
    // Should not create a repair order because it's incomplete and will throw an error internally,
    // but the adapter should catch it and not crash.
    expect(addedROs.length).toBe(0);
  });
});
