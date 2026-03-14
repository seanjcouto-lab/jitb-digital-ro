export interface IntakeSession {
  id: string;
  status: 'active' | 'finalized' | 'cancelled';
  customerInfo?: any;
  vesselInfo?: any;
  reportedProblem?: string;
  requestedServices?: string[];
  requestedParts?: string[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

const sessions = new Map<string, IntakeSession>();

export const intakeSessionService = {
  createSession: (customerInfo?: any): IntakeSession => {
    const id = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const session: IntakeSession = {
      id,
      status: 'active',
      customerInfo,
      requestedServices: [],
      requestedParts: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    sessions.set(id, session);
    return session;
  },

  updateSession: (sessionId: string, partialData: Partial<Omit<IntakeSession, 'id' | 'createdAt' | 'updatedAt' | 'status'>>): IntakeSession => {
    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    if (session.status !== 'active') {
      throw new Error(`Cannot update session ${sessionId} in status ${session.status}`);
    }
    const updatedSession = {
      ...session,
      ...partialData,
      updatedAt: Date.now(),
    };
    sessions.set(sessionId, updatedSession);
    return updatedSession;
  },

  getSession: (sessionId: string): IntakeSession | undefined => {
    return sessions.get(sessionId);
  },

  finalizeSession: (sessionId: string): IntakeSession => {
    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    if (session.status !== 'active') {
      throw new Error(`Cannot finalize session ${sessionId} in status ${session.status}`);
    }
    session.status = 'finalized';
    session.updatedAt = Date.now();
    return session;
  },

  cancelSession: (sessionId: string): IntakeSession => {
    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    if (session.status !== 'active') {
      throw new Error(`Cannot cancel session ${sessionId} in status ${session.status}`);
    }
    session.status = 'cancelled';
    session.updatedAt = Date.now();
    return session;
  },
  
  // For testing purposes
  _clearSessions: () => {
    sessions.clear();
  }
};
