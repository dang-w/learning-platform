import { AUTH_TOKEN_EXPIRY } from '../config';
import { cookieUtils } from '../utils/cookie';

interface TokenPayload {
  exp: number;
  type: 'access' | 'refresh';
  sub: string;
  [key: string]: unknown;
}

interface QueuedRequest {
  resolve: (value: Response | PromiseLike<Response>) => void;
  reject: (reason?: unknown) => void;
  request: () => Promise<Response>;
}

interface TokenMetadata {
  expiresAt: number;
  type: 'access' | 'refresh';
  lastRefresh?: number;
}

class TokenService {
  private static instance: TokenService;
  private tokenChangeCallbacks: Array<(token: string | null) => void> = [];
  private isRefreshing = false;
  private requestQueue: QueuedRequest[] = [];
  private refreshPromise: Promise<string | null> | null = null;
  private lastRefreshFailure = 0;
  private readonly REFRESH_COOLDOWN = 5000; // 5 seconds cooldown after a failed refresh
  private readonly TOKEN_REFRESH_THRESHOLD = 300; // Refresh token if less than 5 minutes until expiry

  private constructor() {
    // Initialize cross-tab synchronization
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageChange.bind(this));
    }
  }

  static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  /**
   * Set authentication tokens with proper formatting and storage
   */
  setTokens(token: string, refreshToken?: string): void {
    const formattedToken = this.formatToken(token);
    const expiresAt = Date.now() + (AUTH_TOKEN_EXPIRY.ACCESS_TOKEN * 1000);

    // Store tokens in cookies (primary storage)
    cookieUtils.set('token', formattedToken, {
      path: '/',
      expires: new Date(expiresAt),
      secure: true,
      sameSite: 'strict',
      httpOnly: true
    });

    if (refreshToken) {
      const refreshExpiresAt = Date.now() + (AUTH_TOKEN_EXPIRY.REFRESH_TOKEN * 1000);
      cookieUtils.set('refresh_token', refreshToken, {
        path: '/',
        expires: new Date(refreshExpiresAt),
        secure: true,
        sameSite: 'strict',
        httpOnly: true
      });

      // Store minimal metadata in localStorage for token management
      this.setTokenMetadata('refresh_token', {
        expiresAt: refreshExpiresAt,
        type: 'refresh',
        lastRefresh: Date.now()
      });
    }

    // Store minimal metadata in localStorage for token management
    this.setTokenMetadata('access_token', {
      expiresAt,
      type: 'access'
    });

    // Process queued requests if any
    this.processQueue(formattedToken);

    // Notify subscribers
    this.notifyTokenChange(formattedToken);
  }

  /**
   * Get the current auth token from storage
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null;

    // Only use cookie storage for token
    return cookieUtils.get('token');
  }

  /**
   * Get the refresh token from storage
   */
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return cookieUtils.get('refresh_token');
  }

  /**
   * Clear all auth tokens and metadata from storage
   */
  clearTokens(): void {
    if (typeof window === 'undefined') return;

    // Clear cookies
    cookieUtils.remove('token', {
      path: '/',
      secure: true,
      sameSite: 'strict',
      httpOnly: true
    });
    cookieUtils.remove('refresh_token', {
      path: '/',
      secure: true,
      sameSite: 'strict',
      httpOnly: true
    });

    // Clear localStorage metadata
    localStorage.removeItem('access_token_metadata');
    localStorage.removeItem('refresh_token_metadata');

    // Clear any queued requests
    this.rejectQueue(new Error('Authentication cleared'));

    // Reset refresh state
    this.isRefreshing = false;
    this.refreshPromise = null;
    this.lastRefreshFailure = 0;

    // Notify subscribers
    this.notifyTokenChange(null);
  }

  /**
   * Check if the current token is expired or will expire soon
   */
  isTokenExpired(threshold = 0): boolean {
    if (typeof window === 'undefined') return true;

    const metadata = this.getTokenMetadata('access_token');
    if (!metadata) return true;

    // Check if token is expired or will expire within threshold seconds
    return Date.now() + (threshold * 1000) >= metadata.expiresAt;
  }

  /**
   * Check if token needs to be refreshed (close to expiration)
   */
  shouldRefreshToken(): boolean {
    return this.isTokenExpired(this.TOKEN_REFRESH_THRESHOLD);
  }

  /**
   * Queue a request to be executed after token refresh
   */
  async queueRequest(request: () => Promise<Response>): Promise<Response> {
    // If we're not refreshing, execute the request immediately
    if (!this.isRefreshing) {
      return request();
    }

    // If we have a refresh promise, wait for it to complete
    if (this.refreshPromise) {
      const token = await this.refreshPromise;
      if (token) {
        return request();
      }
      throw new Error('Authentication failed');
    }

    // Queue the request
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ resolve, reject, request });
    });
  }

  /**
   * Check if a token refresh is in progress
   */
  isRefreshingToken(): boolean {
    return this.isRefreshing;
  }

  /**
   * Start token refresh process
   */
  async startTokenRefresh(): Promise<string | null> {
    const now = Date.now();

    // If a refresh is already in progress, return the existing promise
    if (this.refreshPromise) {
      console.log('Token service: Refresh already in progress, returning existing promise');
      return this.refreshPromise;
    }

    // If we're in the refresh process but don't have a promise, something went wrong
    if (this.isRefreshing) {
      console.log('Token service: In refresh cycle but no promise exists, creating new one');
      this.isRefreshing = false;
    }

    // Check if we need to observe the cooldown period after a failed refresh
    if (this.lastRefreshFailure > 0 && now - this.lastRefreshFailure < this.REFRESH_COOLDOWN) {
      console.log('Token service: Skipping refresh due to cooldown period');
      return Promise.resolve(null);
    }

    // Check if we have refreshed too recently
    const refreshMetadata = this.getTokenMetadata('refresh_token');
    if (refreshMetadata?.lastRefresh && now - refreshMetadata.lastRefresh < this.REFRESH_COOLDOWN) {
      console.log('Token service: Skipping refresh - too soon since last refresh');
      const currentToken = this.getToken();
      return Promise.resolve(currentToken);
    }

    // Start the refresh process
    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const token = await this.refreshToken();
        if (token) {
          this.setTokens(token);
          return token;
        }
        this.lastRefreshFailure = now;
        return null;
      } catch (error) {
        console.error('Token service: Refresh failed:', error);
        this.lastRefreshFailure = now;
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Subscribe to token changes
   */
  onTokenChange(callback: (token: string | null) => void): () => void {
    this.tokenChangeCallbacks.push(callback);
    return () => {
      this.tokenChangeCallbacks = this.tokenChangeCallbacks.filter(cb => cb !== callback);
    };
  }

  private async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch('/api/auth/token/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.clearTokens();
      return null;
    }
  }

  /**
   * Parse and validate a JWT token
   */
  private parseToken(token: string): TokenPayload | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join(''));

      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error parsing token:', error);
      return null;
    }
  }

  /**
   * Store token metadata in localStorage
   */
  private setTokenMetadata(type: 'access_token' | 'refresh_token', metadata: TokenMetadata): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${type}_metadata`, JSON.stringify(metadata));
  }

  /**
   * Get token metadata from localStorage
   */
  private getTokenMetadata(type: 'access_token' | 'refresh_token'): TokenMetadata | null {
    if (typeof window === 'undefined') return null;

    try {
      const metadata = localStorage.getItem(`${type}_metadata`);
      return metadata ? JSON.parse(metadata) : null;
    } catch (error) {
      console.error(`Error reading ${type} metadata:`, error);
      return null;
    }
  }

  /**
   * Handle storage changes for cross-tab synchronization
   */
  private handleStorageChange(event: StorageEvent): void {
    if (!event.key?.endsWith('_metadata')) return;

    const token = this.getToken();
    if (event.key === 'access_token_metadata' || event.key === 'refresh_token_metadata') {
      // If metadata was cleared in another tab
      if (!event.newValue) {
        this.clearTokens();
      } else {
        // Notify subscribers of token changes
        this.notifyTokenChange(token);
      }
    }
  }

  private formatToken(token: string): string {
    return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  private notifyTokenChange(token: string | null): void {
    this.tokenChangeCallbacks.forEach(callback => callback(token));
  }

  private processQueue(token: string | null): void {
    const queue = this.requestQueue;
    this.requestQueue = [];

    // Process each queued request in order
    queue.forEach(async ({ resolve, reject, request }) => {
      if (!token) {
        reject(new Error('Authentication failed'));
        return;
      }

      try {
        const response = await request();
        resolve(response);
      } catch (error) {
        reject(error);
      }
    });
  }

  private rejectQueue(error: Error): void {
    const queue = this.requestQueue;
    this.requestQueue = [];
    queue.forEach(({ reject }) => reject(error));
  }

  public getMetadata<T>(key: string): T | null {
    try {
      const value = localStorage.getItem(`${key}_metadata`);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error getting metadata:', error);
      return null;
    }
  }

  public setMetadata<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`${key}_metadata`, JSON.stringify(value));
    } catch (error) {
      console.error('Error setting metadata:', error);
    }
  }
}

export const tokenService = TokenService.getInstance();