/**
 * Cookie utility functions for managing browser cookies
 */

interface CookieOptions {
  path?: string;
  expires?: Date;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  httpOnly?: boolean;
}

export const cookieUtils = {
  get(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  },

  set(name: string, value: string, options: CookieOptions = {}): void {
    let cookie = `${name}=${value}`;
    if (options.path) {
      cookie += `; path=${options.path}`;
    }
    if (options.expires) {
      cookie += `; expires=${options.expires.toUTCString()}`;
    }
    if (options.secure) {
      cookie += '; secure';
    }
    if (options.sameSite) {
      cookie += `; samesite=${options.sameSite}`;
    }
    if (options.httpOnly) {
      cookie += '; httponly';
    }
    document.cookie = cookie;
  },

  remove(name: string, options: CookieOptions = {}): void {
    const expires = new Date(0).toUTCString();
    let cookie = `${name}=; expires=${expires}`;
    if (options.path) {
      cookie += `; path=${options.path}`;
    }
    if (options.secure) {
      cookie += '; secure';
    }
    if (options.sameSite) {
      cookie += `; samesite=${options.sameSite}`;
    }
    if (options.httpOnly) {
      cookie += '; httponly';
    }
    document.cookie = cookie;
  }
};