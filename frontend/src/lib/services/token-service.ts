import { AUTH_TOKEN_EXPIRY } from '../config';
import { cookieUtils } from '../utils/cookie';

interface QueuedRequest {
  resolve: (value: Response | PromiseLike<Response>) => void;
  reject: (reason?: unknown) => void;
  request: () => Promise<Response>;
}

class TokenService {
  private static instance: TokenService;
  private tokenChangeCallbacks: Array<(token: string | null) => void> = [];
  private isRefreshing = false;
  private requestQueue: QueuedRequest[] = [];
  private refreshPromise: Promise<string | null> | null = null;
  private lastRefreshFailure = 0;
  private readonly REFRESH_COOLDOWN = 5000; // 5 seconds cooldown after a failed refresh

  private constructor() {}

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

    // Set HttpOnly cookie as primary storage
    cookieUtils.set('token', formattedToken, {
      path: '/',
      expires: new Date(expiresAt),
      secure: true,
      sameSite: 'strict'
    });

    if (refreshToken) {
      const refreshExpiresAt = Date.now() + (AUTH_TOKEN_EXPIRY.REFRESH_TOKEN * 1000);
      cookieUtils.set('refresh_token', refreshToken, {
        path: '/',
        expires: new Date(refreshExpiresAt),
        secure: true,
        sameSite: 'strict'
      });
    }

    // Set localStorage as backup with minimal data
    if (typeof window !== 'undefined') {
      localStorage.setItem('token_expiry', expiresAt.toString());
    }

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
   * Clear all auth tokens from storage
   */
  clearTokens(): void {
    if (typeof window === 'undefined') return;

    // Clear cookies
    cookieUtils.remove('token', { path: '/', secure: true, sameSite: 'strict' });
    cookieUtils.remove('refresh_token', { path: '/', secure: true, sameSite: 'strict' });

    // Clear localStorage backup
    localStorage.removeItem('token_expiry');

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
    // Check if we need to observe the cooldown period after a failed refresh
    const now = Date.now();
    if (this.lastRefreshFailure > 0 && now - this.lastRefreshFailure < this.REFRESH_COOLDOWN) {
      return null;
    }

    // If a refresh is already in progress, return the existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Start the refresh process
    this.isRefreshing = true;
    this.refreshPromise = this.refreshToken();

    try {
      const token = await this.refreshPromise;
      if (token) {
        this.setTokens(token);
      }
      return token;
    } catch {
      this.lastRefreshFailure = Date.now();
      return null;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
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

  /**
   * Check if the current token is expired
   */
  isTokenExpired(): boolean {
    if (typeof window === 'undefined') return true;

    const expiryStr = localStorage.getItem('token_expiry');
    if (!expiryStr) return true;

    const expiryTime = parseInt(expiryStr, 10);
    return Date.now() > expiryTime;
  }

  private formatToken(token: string): string {
    return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  private notifyTokenChange(token: string | null): void {
    this.tokenChangeCallbacks.forEach(callback => callback(token));
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
}

export const tokenService = TokenService.getInstance();