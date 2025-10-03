import { User, Session, AuthState, LoginCredentials, RegisterCredentials } from '../models/auth.model';
import { createPasswordHash, verifyPassword, generateSessionToken, validatePasswordStrength } from '../utils/crypto.util';

const AUTH_STORAGE_KEY = 'authState';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export class AuthService {
  private users: User[] = [];
  private currentSession?: Session;
  private listeners: Set<(isAuthenticated: boolean) => void> = new Set();

  constructor() {
    this.loadState();
    this.checkSessionExpiry();
  }

  /**
   * Registers a new user
   */
  async register(credentials: RegisterCredentials): Promise<{ success: boolean; error?: string }> {
    // Validate input
    if (!credentials.username || !credentials.password) {
      return { success: false, error: 'Username and password are required' };
    }

    if (credentials.username.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters long' };
    }

    if (credentials.password !== credentials.confirmPassword) {
      return { success: false, error: 'Passwords do not match' };
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(credentials.password);
    if (!passwordValidation.isValid) {
      return { success: false, error: passwordValidation.errors.join('. ') };
    }

    // Check if username already exists
    if (this.users.some(u => u.username.toLowerCase() === credentials.username.toLowerCase())) {
      return { success: false, error: 'Username already exists' };
    }

    try {
      // Create password hash
      const passwordHash = await createPasswordHash(credentials.password);

      // Create user
      const user: User = {
        id: this.generateUserId(),
        username: credentials.username,
        passwordHash,
        createdAt: new Date()
      };

      this.users.push(user);
      this.saveState();

      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Failed to create account. Please try again.' };
    }
  }

  /**
   * Authenticates a user
   */
  async login(credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> {
    if (!credentials.username || !credentials.password) {
      return { success: false, error: 'Username and password are required' };
    }

    // Find user
    const user = this.users.find(
      u => u.username.toLowerCase() === credentials.username.toLowerCase()
    );

    if (!user) {
      return { success: false, error: 'Invalid username or password' };
    }

    try {
      // Verify password
      const isValid = await verifyPassword(credentials.password, user.passwordHash);

      if (!isValid) {
        return { success: false, error: 'Invalid username or password' };
      }

      // Create session
      const session: Session = {
        userId: user.id,
        token: generateSessionToken(),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + SESSION_DURATION)
      };

      this.currentSession = session;

      // Update last login
      user.lastLogin = new Date();

      this.saveState();
      this.notifyListeners(true);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  }

  /**
   * Logs out the current user
   */
  logout(): void {
    this.currentSession = undefined;
    this.saveState();
    this.notifyListeners(false);
  }

  /**
   * Checks if user is authenticated
   */
  isAuthenticated(): boolean {
    if (!this.currentSession) return false;

    // Check if session is expired
    if (new Date() > this.currentSession.expiresAt) {
      this.logout();
      return false;
    }

    return true;
  }

  /**
   * Gets the current user
   */
  getCurrentUser(): User | null {
    if (!this.isAuthenticated() || !this.currentSession) return null;

    return this.users.find(u => u.id === this.currentSession!.userId) || null;
  }

  /**
   * Changes user password
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const user = this.getCurrentUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify old password
    const isValid = await verifyPassword(oldPassword, user.passwordHash);
    if (!isValid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Validate new password
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return { success: false, error: passwordValidation.errors.join('. ') };
    }

    try {
      // Create new password hash
      user.passwordHash = await createPasswordHash(newPassword);
      this.saveState();

      return { success: true };
    } catch (error) {
      console.error('Password change error:', error);
      return { success: false, error: 'Failed to change password' };
    }
  }

  /**
   * Deletes user account
   */
  async deleteAccount(password: string): Promise<{ success: boolean; error?: string }> {
    const user = this.getCurrentUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return { success: false, error: 'Password is incorrect' };
    }

    // Remove user
    this.users = this.users.filter(u => u.id !== user.id);
    this.logout();

    return { success: true };
  }

  /**
   * Gets all registered users (for admin purposes - username only)
   */
  getUserCount(): number {
    return this.users.length;
  }

  /**
   * Subscribes to authentication state changes
   */
  subscribe(listener: (isAuthenticated: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(isAuthenticated: boolean): void {
    this.listeners.forEach(listener => listener(isAuthenticated));
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private checkSessionExpiry(): void {
    // Check session expiry every minute
    setInterval(() => {
      if (this.currentSession && new Date() > this.currentSession.expiresAt) {
        this.logout();
      }
    }, 60000);
  }

  private loadState(): void {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return;

      const state: AuthState = JSON.parse(raw);

      this.users = state.users.map(u => ({
        ...u,
        createdAt: new Date(u.createdAt),
        lastLogin: u.lastLogin ? new Date(u.lastLogin) : undefined
      }));

      if (state.currentSession) {
        this.currentSession = {
          ...state.currentSession,
          createdAt: new Date(state.currentSession.createdAt),
          expiresAt: new Date(state.currentSession.expiresAt)
        };

        // Check if session is still valid
        if (!this.isAuthenticated()) {
          this.currentSession = undefined;
        }
      }
    } catch (error) {
      console.error('Failed to load auth state:', error);
    }
  }

  private saveState(): void {
    try {
      const state: AuthState = {
        users: this.users,
        currentSession: this.currentSession
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save auth state:', error);
    }
  }
}

// Singleton instance
export const authService = new AuthService();