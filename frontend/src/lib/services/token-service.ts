import { AUTH_TOKEN_EXPIRY, BACKEND_API_URL } from '../config';
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

export class TokenService {
  private static instance: TokenService;
  private tokenChangeCallbacks: Array<(token: string | null) => void> = [];
  private isRefreshing = false;
  private requestQueue: QueuedRequest[] = [];
  private refreshPromise: Promise<string> | null = null;
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
   * ONLY handles the access token now.
   */
  setTokens(token: string): void { // Removed refreshToken parameter
    const formattedToken = this.formatToken(token);
    const expiresAt = Date.now() + (AUTH_TOKEN_EXPIRY.ACCESS_TOKEN * 1000);

    // Store ONLY the access token in a cookie
    // Refresh token is HttpOnly, managed by server
    cookieUtils.set('token', formattedToken, {
      path: '/',
      expires: new Date(expiresAt),
      // Secure should ideally be conditional based on environment
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' // Use lax or strict as appropriate
      // No httpOnly here, as it's just the access token
    });

    // Remove refresh token cookie setting logic
    // if (refreshToken) { ... }

    // Store metadata only for the access token
    this.setTokenMetadata('access_token', {
      expiresAt,
      type: 'access'
    });
    // Remove refresh token metadata logic
    // this.setTokenMetadata('refresh_token', { ... });

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
   * Clear all auth tokens and metadata from storage
   * Clears access token cookie and associated metadata.
   * Does NOT clear the HttpOnly refresh token cookie (backend handles that via /logout).
   */
  clearTokens(): void {
    if (typeof window === 'undefined') return;

    // Clear ONLY the access token cookie
    cookieUtils.remove('token', {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' // Match the setting options
    });
    // REMOVED: Clearing refresh_token cookie (backend responsibility)
    // cookieUtils.remove('refresh_token', { ... });

    // Clear localStorage metadata
    localStorage.removeItem('access_token_metadata');
    localStorage.removeItem('refresh_token_metadata'); // Keep removing this JIC

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
   * Start token refresh process. Resolves with the new access token on success,
   * throws an error on failure.
   *
   * @throws {Error} Throws an error if refresh fails (e.g., network, invalid refresh token).
   */
  async startTokenRefresh(): Promise<string> {
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
      console.log('Token service: Skipping refresh due to cooldown period after failure');
      throw new Error('Token refresh failed recently, cooldown active.');
    }

    // Check if we have refreshed too recently (general cooldown, maybe less strict?)
    const refreshMetadata = this.getTokenMetadata('refresh_token');
    if (refreshMetadata?.lastRefresh && now - refreshMetadata.lastRefresh < this.REFRESH_COOLDOWN) {
      console.log('Token service: Checking cooldown for recent refresh.');

      const currentValidToken = this.getToken();

      // Check if token exists AND is not expired
      if (currentValidToken && !this.isTokenExpired(0)) {
        console.log('Token service: Returning current valid token during cooldown.');
        // Explicitly assert type after check
        return Promise.resolve(currentValidToken as string);
      } else {
        // If no valid token exists and we are in cooldown, we cannot refresh
        console.log('Token service: No valid token and in refresh cooldown. Cannot refresh.');
        throw new Error('Token refresh skipped due to recent activity and no valid token.');
      }
    }

    // Start the refresh process
    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const newAccessToken = await this.refreshToken();
        console.log('Token service: Refresh successful');
        this.lastRefreshFailure = 0;
        return newAccessToken;
      } catch (error: unknown) {
        console.error('Token service: Refresh failed:', error);
        this.lastRefreshFailure = now;
        if (this.isInvalidRefreshTokenError(error)) {
          console.warn('Token Service: Invalid refresh token detected. Clearing tokens.');
          this.clearTokens();
        }
        throw error;
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

  private async refreshToken(): Promise<string> {
    let newAccessToken: string | undefined;
    // REMOVED: No need to get/check refresh token here
    // const refreshToken = this.getRefreshToken();
    // if (!refreshToken) { ... }

    try {
      // Refresh token is sent automatically by browser via HttpOnly cookie
      // Just call the refresh endpoint without a body.
      console.log('Token service: Attempting to refresh token via API (using HttpOnly cookie)');
      // Use the absolute backend URL
      const response = await fetch(`${BACKEND_API_URL}/api/auth/token/refresh`, {
        method: 'POST',
        headers: {
          // Content-Type might not even be needed if body is empty
          // 'Content-Type': 'application/json',
          // No Authorization header needed for refresh endpoint
        },
        // REMOVED: Body containing refresh token
        // body: JSON.stringify({ refresh_token: refreshToken })
        // Ensure credentials (cookies) are sent
        credentials: 'include'
      });

      if (!response.ok) {
        // Backend might return 401 if HttpOnly refresh cookie is invalid/missing
        if (response.status === 401 || response.status === 403) {
          console.warn(`Token refresh failed with status ${response.status}: Invalid/missing refresh token cookie.`);
          throw new Error('Invalid refresh token'); // Specific error for invalid token
        } else {
          throw new Error(`Token refresh failed with status: ${response.status}`); // Generic error for others
        }
      }

      const data = await response.json();
      newAccessToken = data.access_token; // Expect only access_token in response now
      // REMOVED: Handling of new refresh token from response
      // newRefreshToken = data.refreshToken;

      if (!newAccessToken) {
        throw new Error('No new access token received from refresh endpoint');
      }

      // Set ONLY the new access token
      this.setTokens(newAccessToken);

      return newAccessToken; // Return the new access token
    } catch (error) { // Catch block now handles specific error types
      console.error('Error refreshing token:', error);
      // Only clear tokens if the refresh token itself was deemed invalid
      if (error instanceof Error && error.message === 'Invalid refresh token') {
        console.log('Clearing client-side tokens due to invalid refresh token.');
        // Note: Backend should have cleared the HttpOnly cookie already if verification failed
        this.clearTokens(); // Clear access token cookie + metadata
      }
      // Re-throw the original error (or a new one if preferred) regardless
      throw error; // Propagate the error for startTokenRefresh to handle
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

  /**
   * Gets a valid access token, refreshing if necessary.
   *
   * @returns {Promise<string>} A promise that resolves with a valid access token.
   * @throws {Error} Throws an error if a valid token cannot be obtained (e.g., refresh failed).
   */
  async getValidAccessToken(): Promise<string> {
    const currentToken = this.getToken();

    // Check if current token exists and is not nearing expiry
    if (currentToken && !this.isTokenExpired(this.TOKEN_REFRESH_THRESHOLD)) {
      return currentToken; // Return current token if it's still valid enough
    }

    // If no valid token or it's nearing expiry, attempt refresh
    console.log('Token service: Valid token needed, attempting refresh via getValidAccessToken.');
    try {
      // startTokenRefresh now returns Promise<string> or throws
      const newToken = await this.startTokenRefresh();
      return newToken;
    } catch (error) {
      console.error('Token service: Failed to get valid access token:', error);
      // If refresh fails, clear all tokens as a safety measure (especially if it was InvalidRefreshTokenError)
      this.clearTokens();
      // Re-throw the error to signal failure
      throw new Error(`Failed to obtain valid access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Hypothetical helper to check for specific invalid refresh token errors
  // This needs to be adjusted based on how refreshToken throws errors
  private isInvalidRefreshTokenError(error: unknown): boolean {
    // Example check: adjust based on actual error structure/type/message
    if (error instanceof Error) {
      // Check for specific status codes or messages from the API call within refreshToken
      // const axiosError = error as AxiosError; // If using Axios
      // return axiosError.response?.status === 401 || error.message.includes('invalid_grant');
      return error.message.includes('Invalid refresh token'); // Simple example
    }
    return false;
  }
}

export const tokenService = TokenService.getInstance();