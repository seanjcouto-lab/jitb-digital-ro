import { parkerAdapterService } from './parkerAdapterService';

// Map to associate Vapi call IDs with Parker session IDs
const callSessionMap = new Map<string, string>();

export const vapiAdapterService = {
  /**
   * Handles the start of a Vapi call.
   * Creates a new intake session, initializes conversation state, and returns the welcome prompt.
   * 
   * @param callId The unique identifier for the Vapi call.
   * @returns The welcome prompt text for TTS.
   */
  callStarted: async (callId: string): Promise<string> => {
    const sessionId = parkerAdapterService.startIntakeSession({ vapiCallId: callId });
    callSessionMap.set(callId, sessionId);
    return parkerAdapterService.generateNextPrompt(sessionId);
  },

  /**
   * Handles user speech received from Vapi.
   * Processes the transcript, updates the conversation state, and returns the next prompt.
   * 
   * @param callId The unique identifier for the Vapi call.
   * @param transcript The text transcript of the user's speech.
   * @returns The next prompt text for TTS.
   */
  userSpeechReceived: async (callId: string, transcript: string): Promise<string> => {
    const sessionId = callSessionMap.get(callId);
    if (!sessionId) {
      throw new Error(`No active session found for Vapi call ID: ${callId}`);
    }

    parkerAdapterService.processUserAnswer(sessionId, transcript);
    return parkerAdapterService.generateNextPrompt(sessionId);
  },

  /**
   * Generates the next voice response for Vapi based on the current conversation state.
   * 
   * @param callId The unique identifier for the Vapi call.
   * @returns The next prompt text for TTS.
   */
  generateVoiceResponse: async (callId: string): Promise<string> => {
    const sessionId = callSessionMap.get(callId);
    if (!sessionId) {
      throw new Error(`No active session found for Vapi call ID: ${callId}`);
    }

    return parkerAdapterService.generateNextPrompt(sessionId);
  },

  /**
   * Handles the end of a Vapi call.
   * Finalizes the session and triggers the creation of a staged repair order.
   * 
   * @param callId The unique identifier for the Vapi call.
   */
  callEnded: async (callId: string): Promise<void> => {
    const sessionId = callSessionMap.get(callId);
    if (!sessionId) {
      throw new Error(`No active session found for Vapi call ID: ${callId}`);
    }

    try {
      await parkerAdapterService.createStagedRepairOrderFromIntake(sessionId);
    } catch (error) {
      console.error(`Failed to create staged repair order for call ${callId}:`, error);
      // Depending on requirements, we might want to notify the service desk here
      parkerAdapterService.createServiceDeskNotification(
        `Failed to finalize intake for call ${callId}`,
        { error: error instanceof Error ? error.message : String(error) }
      );
    } finally {
      callSessionMap.delete(callId);
    }
  },

  /**
   * Clears the internal call-to-session mapping (useful for testing).
   */
  _clearMappings: () => {
    callSessionMap.clear();
  }
};
