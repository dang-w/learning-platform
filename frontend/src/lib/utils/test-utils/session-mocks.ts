/// <reference lib="dom" />

export interface MockSession {
  id: string;
  userId: string;
  deviceId: string;
  createdAt: string;
  lastActiveAt: string;
  isActive: boolean;
}

export interface SessionTransition {
  from: Partial<MockSession>;
  to: Partial<MockSession>;
  trigger: string;
  timestamp: number;
}

export interface MockSessionServiceOptions {
  simulateDeviceFingerprint?: boolean;
  trackSessionActivity?: boolean;
  simulateNetworkDelay?: number;
  simulateSessionExpiry?: boolean;
  expiryTime?: number;
}

export interface MockSessionService {
  createSession: jest.Mock<Promise<MockSession>>;
  validateSession: jest.Mock<Promise<boolean>>;
  endSession: jest.Mock<Promise<void>>;
  getActiveSessions: jest.Mock<Promise<MockSession[]>>;
  updateLastActive: jest.Mock<Promise<void>>;
  cleanup: jest.Mock<Promise<void>>;
  getSessionTransitions: () => SessionTransition[];
  clearSessionTransitions: () => void;
}

export function createMockSessionService(options: MockSessionServiceOptions = {}): MockSessionService {
  const activeSessions = new Map<string, MockSession>();
  const sessionTransitions: SessionTransition[] = [];
  let expiryInterval: NodeJS.Timeout | null = null;

  const trackTransition = (trigger: string, sessionId: string, changes: Partial<MockSession>) => {
    if (!options.trackSessionActivity) return;

    const currentSession = activeSessions.get(sessionId);
    if (!currentSession) return;

    sessionTransitions.push({
      from: { ...currentSession },
      to: changes,
      trigger,
      timestamp: Date.now()
    });
  };

  const simulateDelay = async () => {
    if (options.simulateNetworkDelay) {
      await new Promise(resolve => setTimeout(resolve, options.simulateNetworkDelay));
    }
  };

  // Set up session expiry if enabled
  if (options.simulateSessionExpiry) {
    const expiryTime = options.expiryTime ?? 30000; // Default 30s
    expiryInterval = setInterval(() => {
      const now = Date.now();
      activeSessions.forEach((session, sessionId) => {
        const lastActive = new Date(session.lastActiveAt).getTime();
        if (now - lastActive > expiryTime) {
          trackTransition('session_expired', sessionId, { isActive: false });
          activeSessions.delete(sessionId);
        }
      });
    }, 1000);
  }

  const service: MockSessionService = {
    createSession: jest.fn().mockImplementation(async (userId: string) => {
      await simulateDelay();

      const session: MockSession = {
        id: Math.random().toString(36).substring(7),
        userId,
        deviceId: options.simulateDeviceFingerprint ?
          'mock-device-' + Math.random().toString(36).substring(7) : 'mock-device',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        isActive: true
      };

      activeSessions.set(session.id, session);
      trackTransition('session_created', session.id, session);
      return session;
    }),

    validateSession: jest.fn().mockImplementation(async (sessionId: string) => {
      await simulateDelay();
      const session = activeSessions.get(sessionId);

      if (!session) {
        return false;
      }

      if (options.simulateSessionExpiry) {
        const expiryTime = options.expiryTime ?? 30000;
        const lastActive = new Date(session.lastActiveAt).getTime();
        const isExpired = Date.now() - lastActive > expiryTime;

        if (isExpired) {
          trackTransition('session_expired', sessionId, { isActive: false });
          activeSessions.delete(sessionId);
          return false;
        }
      }

      trackTransition('session_validated', sessionId, { lastActiveAt: new Date().toISOString() });
      return true;
    }),

    endSession: jest.fn().mockImplementation(async (sessionId: string) => {
      await simulateDelay();
      const session = activeSessions.get(sessionId);

      if (session) {
        trackTransition('session_ended', sessionId, { isActive: false });
        activeSessions.delete(sessionId);
      }
    }),

    getActiveSessions: jest.fn().mockImplementation(async () => {
      await simulateDelay();
      return Array.from(activeSessions.values());
    }),

    updateLastActive: jest.fn().mockImplementation(async (sessionId: string) => {
      await simulateDelay();
      const session = activeSessions.get(sessionId);

      if (session) {
        const updatedSession = {
          ...session,
          lastActiveAt: new Date().toISOString()
        };
        activeSessions.set(sessionId, updatedSession);
        trackTransition('session_activity_updated', sessionId, { lastActiveAt: updatedSession.lastActiveAt });
      }
    }),

    cleanup: jest.fn().mockImplementation(async () => {
      await simulateDelay();
      activeSessions.clear();
      sessionTransitions.length = 0;
      if (expiryInterval) {
        clearInterval(expiryInterval);
        expiryInterval = null;
      }
    }),

    getSessionTransitions: () => [...sessionTransitions],

    clearSessionTransitions: () => {
      sessionTransitions.length = 0;
    }
  };

  return service;
}

// Cleanup utility for tests
export function cleanupMockSessions() {
  afterEach(() => {
    jest.clearAllMocks();
  });
}