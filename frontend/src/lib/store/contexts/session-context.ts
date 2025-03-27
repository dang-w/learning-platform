import { createContext } from 'react';
import type { MockSessionService } from '../../utils/test-utils/session-mocks';

export const SessionContext = createContext<MockSessionService | null>(null);