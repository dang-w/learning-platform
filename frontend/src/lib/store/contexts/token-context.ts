import { createContext } from 'react';
import type { TokenServiceMockFns } from '../../utils/test-utils/auth-mocks';

export const TokenContext = createContext<TokenServiceMockFns | null>(null);