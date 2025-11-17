import { EventEmitter } from 'events';

/**
 * JWT Token Payload Structure
 */
export interface TokenPayload {
  userId: string;
  email: string;
  username: string;
  iat: number;
  exp: number;
}

/**
 * Authentication Response
 */
export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
}

/**
 * Authenticated User
 */
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  lastLogin?: string;
}

/**
 * Session Information
 */
export interface Session {
  token: string;
  user: AuthUser;
  expiresAt: number;
  createdAt: number;
}

/**
 * Authentication Service
 * Manages JWT tokens, user sessions, and login/logout flows
 * 
 * Features:
 * - JWT token generation and validation
 * - Session management with local storage
 * - Token refresh before expiration
 * - Logout with token revocation
 * - Event-driven authentication state
 */
export class AuthService extends EventEmitter {
  private session: Session | null = null;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;
  private apiBaseUrl: string;
  private tokenKey = 'auth_token';
  private sessionKey = 'auth_session';

  constructor(apiBaseUrl: string = 'http://localhost:3001/api') {
    super();
    this.apiBaseUrl = apiBaseUrl;
    this.loadSessionFromStorage();
    this.setupTokenRefresh();
  }

  /**
   * Register a new user
   */
  async register(email: string, username: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        this.emit('auth-error', { event: 'register', error: error.message });
        return { success: false, error: error.message };
      }

      const data = await response.json();
      this.setSession(data.token, data.user);
      this.emit('user-registered', { user: data.user });
      return { success: true, token: data.token, user: data.user };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      this.emit('auth-error', { event: 'register', error: message });
      return { success: false, error: message };
    }
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        this.emit('auth-error', { event: 'login', error: error.message });
        return { success: false, error: error.message };
      }

      const data = await response.json();
      this.setSession(data.token, data.user);
      this.emit('user-logged-in', { user: data.user });
      return { success: true, token: data.token, user: data.user };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      this.emit('auth-error', { event: 'login', error: message });
      return { success: false, error: message };
    }
  }

  /**
   * Logout current user and revoke token
   */
  async logout(): Promise<void> {
    try {
      if (this.session?.token) {
        await fetch(`${this.apiBaseUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.session.token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      // Log but continue with local cleanup
      console.warn('Logout request failed:', error);
    } finally {
      this.clearSession();
      this.emit('user-logged-out');
    }
  }

  /**
   * Set session with token and user data
   */
  private setSession(token: string, user: AuthUser): void {
    const payload = this.decodeToken(token);
    if (!payload) {
      throw new Error('Invalid token');
    }

    this.session = {
      token,
      user,
      expiresAt: payload.exp * 1000,
      createdAt: Date.now(),
    };

    this.saveSessionToStorage();
    this.emit('session-updated', { session: this.session });
  }

  /**
   * Clear current session
   */
  private clearSession(): void {
    this.session = null;
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.sessionKey);
    this.clearTokenRefreshTimer();
  }

  /**
   * Get current session
   */
  getSession(): Session | null {
    return this.session;
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): AuthUser | null {
    return this.session?.user || null;
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.session?.token || null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    if (!this.session) {
      return false;
    }

    // Check if token is expired
    return this.session.expiresAt > Date.now();
  }

  /**
   * Get Bearer token for API requests
   */
  getAuthorizationHeader(): string {
    const token = this.getToken();
    return token ? `Bearer ${token}` : '';
  }

  /**
   * Refresh token before expiration
   */
  async refreshAccessToken(): Promise<boolean> {
    try {
      if (!this.session) {
        return false;
      }

      const response = await fetch(`${this.apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.session.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        this.clearSession();
        this.emit('token-expired');
        return false;
      }

      const data = await response.json();
      const payload = this.decodeToken(data.token);
      if (!payload) {
        throw new Error('Invalid refresh token response');
      }
      this.session.token = data.token;
      this.session.expiresAt = payload.exp * 1000;
      this.saveSessionToStorage();
      this.emit('token-refreshed', { expiresAt: this.session.expiresAt });
      return true;
    } catch (error) {
      this.clearSession();
      this.emit('token-refresh-error', { error: error instanceof Error ? error.message : 'Token refresh failed' });
      return false;
    }
  }

  /**
   * Decode JWT token without verification (for client-side use)
   */
  private decodeToken(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const decoded = JSON.parse(atob(parts[1]));
      return decoded as TokenPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get token expiration time in milliseconds
   */
  getTokenExpiresIn(): number {
    if (!this.session) {
      return 0;
    }

    const remaining = this.session.expiresAt - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Setup automatic token refresh before expiration
   */
  private setupTokenRefresh(): void {
    if (!this.session) {
      return;
    }

    // Refresh token 5 minutes before expiration
    const refreshTime = this.getTokenExpiresIn() - 5 * 60 * 1000;

    if (refreshTime > 0) {
      this.tokenRefreshTimer = setTimeout(() => {
        this.refreshAccessToken().then(() => {
          this.setupTokenRefresh();
        });
      }, refreshTime);
    }
  }

  /**
   * Clear token refresh timer
   */
  private clearTokenRefreshTimer(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }

  /**
   * Save session to local storage
   */
  private saveSessionToStorage(): void {
    if (this.session) {
      localStorage.setItem(this.tokenKey, this.session.token);
      localStorage.setItem(this.sessionKey, JSON.stringify({
        user: this.session.user,
        expiresAt: this.session.expiresAt,
        createdAt: this.session.createdAt,
      }));
    }
  }

  /**
   * Load session from local storage
   */
  private loadSessionFromStorage(): void {
    try {
      const token = localStorage.getItem(this.tokenKey);
      const sessionStr = localStorage.getItem(this.sessionKey);

      if (token && sessionStr) {
        const sessionData = JSON.parse(sessionStr);
        this.session = {
          token,
          user: sessionData.user,
          expiresAt: sessionData.expiresAt,
          createdAt: sessionData.createdAt,
        };

        // Check if token is still valid
        if (this.session.expiresAt <= Date.now()) {
          this.clearSession();
        } else {
          this.setupTokenRefresh();
          this.emit('session-restored', { user: this.session.user });
        }
      }
    } catch (error) {
      console.warn('Failed to load session from storage:', error);
    }
  }
}

/**
 * React Hook for Authentication
 */
export function useAuth() {
  const [auth, setAuth] = React.useState<AuthService | null>(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const authService = new AuthService();

    authService.on('session-restored', () => {
      setUser(authService.getCurrentUser());
      setIsAuthenticated(authService.isAuthenticated());
      setLoading(false);
    });

    authService.on('user-logged-in', ({ user: newUser }) => {
      setUser(newUser);
      setIsAuthenticated(true);
    });

    authService.on('user-logged-out', () => {
      setUser(null);
      setIsAuthenticated(false);
    });

    authService.on('session-updated', () => {
      setUser(authService.getCurrentUser());
      setIsAuthenticated(authService.isAuthenticated());
    });

    setAuth(authService);
    setLoading(false);

    return () => {
      authService.removeAllListeners();
    };
  }, []);

  const register = React.useCallback(async (email: string, username: string, password: string) => {
    if (!auth) return { success: false, error: 'Auth service not initialized' };
    return auth.register(email, username, password);
  }, [auth]);

  const login = React.useCallback(async (email: string, password: string) => {
    if (!auth) return { success: false, error: 'Auth service not initialized' };
    return auth.login(email, password);
  }, [auth]);

  const logout = React.useCallback(async () => {
    if (!auth) return;
    await auth.logout();
  }, [auth]);

  return {
    auth,
    isAuthenticated,
    user,
    loading,
    register,
    login,
    logout,
  };
}

import React from 'react';
