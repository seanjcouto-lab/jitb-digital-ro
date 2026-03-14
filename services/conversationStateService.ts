export interface ConversationState {
  sessionId: string;
  currentQuestion: string | null;
  lastQuestion: string | null;
  lastUserAnswer: string | null;
  awaitingConfirmation: string | null;
  awaitingClarification: string | null;
  completed: boolean;
  updatedAt: number;
}

const conversations = new Map<string, ConversationState>();

export const conversationStateService = {
  /**
   * Initializes a new conversation state for a given session ID.
   */
  createConversation: (sessionId: string): ConversationState => {
    const state: ConversationState = {
      sessionId,
      currentQuestion: null,
      lastQuestion: null,
      lastUserAnswer: null,
      awaitingConfirmation: null,
      awaitingClarification: null,
      completed: false,
      updatedAt: Date.now(),
    };
    conversations.set(sessionId, state);
    return state;
  },

  /**
   * Retrieves the current conversation state for a session.
   */
  getConversation: (sessionId: string): ConversationState | undefined => {
    return conversations.get(sessionId);
  },

  /**
   * Updates specific fields of a conversation state.
   */
  updateConversation: (
    sessionId: string,
    partialState: Partial<Omit<ConversationState, 'sessionId'>>
  ): ConversationState => {
    const state = conversations.get(sessionId);
    if (!state) {
      throw new Error(`Conversation state for session ${sessionId} not found.`);
    }
    const updatedState = { ...state, ...partialState, updatedAt: Date.now() };
    conversations.set(sessionId, updatedState);
    return updatedState;
  },

  /**
   * Marks the conversation as awaiting confirmation for a specific field.
   */
  markAwaitingConfirmation: (sessionId: string, fieldName: string | null): ConversationState => {
    return conversationStateService.updateConversation(sessionId, {
      awaitingConfirmation: fieldName,
      awaitingClarification: null, // Clear clarification if we are now asking for confirmation
    });
  },

  /**
   * Marks the conversation as awaiting clarification for a specific field.
   */
  markAwaitingClarification: (sessionId: string, fieldName: string | null): ConversationState => {
    return conversationStateService.updateConversation(sessionId, {
      awaitingClarification: fieldName,
      awaitingConfirmation: null, // Clear confirmation if we are now asking for clarification
    });
  },

  /**
   * Marks the conversation as complete.
   */
  markComplete: (sessionId: string): ConversationState => {
    return conversationStateService.updateConversation(sessionId, {
      completed: true,
      currentQuestion: null,
      awaitingConfirmation: null,
      awaitingClarification: null,
    });
  },

  /**
   * Clears all conversation states (useful for testing).
   */
  _clearConversations: () => {
    conversations.clear();
  }
};
