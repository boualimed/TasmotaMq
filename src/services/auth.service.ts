import { User, Session, AuthState, LoginCredentials, RegisterCredentials, DeleteAccountRequest, RecoveryRequest, SecurityQuestion } from '../models/auth.model';
import { createPasswordHash, verifyPassword, generateSessionToken, validatePasswordStrength } from '../utils/crypto.util';
// 🆕 NEW: Add recovery utilities
import { generateRecoveryKey, hashRecoveryKey, verifyRecoveryKey } from '../utils/recovery.util';
import { storageService } from './storage-service';
import { deviceService } from './device-service'; //
import { userSessionManager } from './user-session.manager';

const AUTH_STORAGE_KEY = 'authState';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const SOFT_DELETE_PERIOD = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_RECOVERY_ATTEMPTS = 5;
const RECOVERY_LOCKOUT_DURATION = 60 * 60 * 1000; // 1 hour

export class AuthService {
  private users: User[] = [];
  private currentSession?: Session;
  private listeners: Set<(isAuthenticated: boolean) => void> = new Set();
 // 🆕 NEW: Rate limiting for recovery
 private recoveryAttempts = new Map<string, { count: number; lockoutUntil?: Date }>();

  constructor() {
    this.loadState();
    this.checkSessionExpiry();
    this.cleanupDeletedAccounts(); // 🆕 NEW
  }

  /**
   * Restore soft-deleted account
   */
  async restoreAccount(username: string, password: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const user = this.users.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.deletedAt
    );

    if (!user) {
      return { success: false, error: 'No deleted account found' };
    }

    if (!user.deleteScheduledFor || new Date() > user.deleteScheduledFor) {
      return { success: false, error: 'Account recovery period has expired' };
    }

    try {
      const isValid = await verifyPassword(password, user.passwordHash);

      if (!isValid) {
        return { success: false, error: 'Invalid password' };
      }

      // Restore account
      delete user.deletedAt;
      delete user.deleteScheduledFor;

      this.saveState();

      return { success: true };
    } catch (error) {
      console.error('Account restoration error:', error);
      return { success: false, error: 'Failed to restore account' };
    }
  }


   /**
   * 🆕 NEW: Check if recovery is available for username
   */
   getRecoveryOptions(username: string): {
    hasSecurityQuestions: boolean;
    hasRecoveryKey: boolean;
    questions?: string[];
  } {
    const user = this.users.find(
      u => u.username.toLowerCase() === username.toLowerCase()
    );

    if (!user) {
      // Don't reveal if user exists
      return { hasSecurityQuestions: false, hasRecoveryKey: false };
    }

    return {
      hasSecurityQuestions: Boolean(user.securityQuestions?.length),
      hasRecoveryKey: Boolean(user.recoveryKeyHash),
      questions: user.securityQuestions?.map(q => q.question)
    };
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  private async verifySecurityQuestions(user: User, answers: string[]): Promise<boolean> {
    if (!user.securityQuestions || answers.length !== user.securityQuestions.length) {
      return false;
    }

    for (let i = 0; i < user.securityQuestions.length; i++) {
      const isValid = await verifyPassword(
        answers[i].toLowerCase().trim(),
        user.securityQuestions[i].answerHash
      );

      if (!isValid) {
        return false;
      }
    }

    return true;
  }

  private async verifyRecoveryKey(user: User, recoveryKey: string): Promise<boolean> {
    if (!user.recoveryKeyHash) {
      return false;
    }

    return await verifyRecoveryKey(recoveryKey, user.recoveryKeyHash);
  }

  private incrementRecoveryAttempts(username: string): void {
    const current = this.recoveryAttempts.get(username);
    this.recoveryAttempts.set(username, {
      count: (current?.count || 0) + 1,
      lockoutUntil: current?.lockoutUntil
    });
  }

/**
   *  Cleanup accounts past grace period
   */
/**private cleanupDeletedAccounts(): void {
  setInterval(() => {
    const now = new Date();
    const activeUsers = this.users.filter(user => {
      if (user.deleteScheduledFor && now > user.deleteScheduledFor) {
        console.log(`Permanently deleting account: ${user.username}`);
        // TODO: Also cleanup from Firebase/Supabase
        return false;
      }
      return true;
    });

    if (activeUsers.length !== this.users.length) {
      this.users = activeUsers;
      this.saveState();
    }
  }, 24 * 60 * 60 * 1000); // Check daily
}**/

 /**
   * 🆕 FIXED: Cleanup deleted accounts with proper deletion
   */
 private cleanupDeletedAccounts(): void {
  // Run immediately on startup
  this.performCleanup();

  // Then check daily
  setInterval(() => {
    this.performCleanup();
  }, 24 * 60 * 60 * 1000);
}

   /**
   * 🆕 FIXED: Actually perform the cleanup
   */
   private performCleanup(): void {
    const now = new Date();
    const toDelete: string[] = [];

    this.users.forEach(user => {
      if (user.deleteScheduledFor && now > user.deleteScheduledFor) {
        console.log(`🗑️ Found expired deletion: ${user.username} (${user.id})`);
        toDelete.push(user.id);
      }
    });

    if (toDelete.length > 0) {
      console.log(`🗑️ Cleaning up ${toDelete.length} expired deletion(s)`);

      // 🆕 FIX: Actually call permanentlyDeleteUser for each
      toDelete.forEach(userId => {
        this.permanentlyDeleteUser(userId);
      });
    } else {
      console.log('✅ No expired deletions found');
    }
  }

    /**
   * 🆕 NEW: Immediate permanent deletion (skip grace period)
   */
    async deleteAccountImmediately(request: DeleteAccountRequest): Promise<{
      success: boolean;
      error?: string;
    }> {
      const user = this.getCurrentUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      if (request.confirmText !== 'DELETE') {
        return { success: false, error: 'Please type DELETE to confirm' };
      }

      try {
        let isVerified = false;

        if (request.password) {
          isVerified = await verifyPassword(request.password, user.passwordHash);
        } else if (request.securityAnswer && user.securityQuestions?.[0]) {
          isVerified = await verifyPassword(
            request.securityAnswer.toLowerCase().trim(),
            user.securityQuestions[0].answerHash
          );
        }

        if (!isVerified) {
          return { success: false, error: 'Verification failed' };
        }

        // Delete immediately
        await this.permanentlyDeleteUser(user.id);
        this.logout();

        return { success: true };
      } catch (error) {
        console.error('Immediate deletion error:', error);
        return { success: false, error: 'Failed to delete account' };
      }
    }



  // with session initialization

  async login(credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> {
        if (!credentials.username || !credentials.password) {
          return { success: false, error: 'Username and password are required' };
        }

        const user = this.users.find(
          u => u.username.toLowerCase() === credentials.username.toLowerCase()
        );

        if (!user) {
          return { success: false, error: 'Invalid username or password' };
        }

        try {
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
          user.lastLogin = new Date();

          // 🆕 Initialize user session with isolated data
          const userSession = userSessionManager.initializeSession(user);
          console.log('✅ User session initialized:', {
            userId: userSession.userId,
            tier: userSession.subscription.tier,
            devices: userSession.devices.length
          });

          this.saveState();
          this.notifyListeners(true);

          return { success: true };
        } catch (error) {
          console.error('Login error:', error);
          return { success: false, error: 'Login failed. Please try again.' };
        }
      }


  // with session cleanup
   logout(): void {
      const currentUser = this.getCurrentUser();

      if (currentUser) {
        console.log('🚪 Logout for user:', currentUser.id);

        // If user is marked for deletion, ensure their data is gone
        if (currentUser.deletedAt || currentUser.deleteScheduledFor) {
          console.log('🗑️ User is marked for deletion, ensuring data cleanup');
          userSessionManager.deleteUserSession(currentUser.id);
          storageService.deleteUserData(currentUser.id);
          deviceService.clearDevices();
        } else {
          // Normal logout - just clear current session
          userSessionManager.clearSession();
        }
      }

      this.currentSession = undefined;
      this.saveState();
      this.notifyListeners(false);

      console.log('🚪 Logout complete');
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
   *  Register with recovery options
   */
  async register(credentials: RegisterCredentials): Promise<{
    success: boolean;
    error?: string;
    recoveryKey?: string; // Return recovery key to show user ONCE
  }> {
    // Existing validation...
    if (!credentials.username || !credentials.password) {
      return { success: false, error: 'Username and password are required' };
    }

    if (credentials.username.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters long' };
    }

    if (credentials.password !== credentials.confirmPassword) {
      return { success: false, error: 'Passwords do not match' };
    }

    const passwordValidation = validatePasswordStrength(credentials.password);
    if (!passwordValidation.isValid) {
      return { success: false, error: passwordValidation.errors.join('. ') };
    }

    if (this.users.some(u => u.username.toLowerCase() === credentials.username.toLowerCase())) {
      return { success: false, error: 'Username already exists' };
    }

    // 🆕 NEW: Validate security questions
    if (credentials.securityQuestions) {
      if (credentials.securityQuestions.length < 2) {
        return { success: false, error: 'Please provide at least 2 security questions' };
      }

      for (const qa of credentials.securityQuestions) {
        if (!qa.question || !qa.answer) {
          return { success: false, error: 'All security questions must have answers' };
        }
        if (qa.answer.trim().length < 2) {
          return { success: false, error: 'Security answers must be at least 2 characters' };
        }
      }
    }

    try {
      const passwordHash = await createPasswordHash(credentials.password);

      // 🆕 NEW: Generate recovery key
      const recoveryKey = generateRecoveryKey();
      const recoveryKeyHash = await hashRecoveryKey(recoveryKey);

      // 🆕 NEW: Hash security question answers
      const securityQuestions: SecurityQuestion[] | undefined = credentials.securityQuestions
        ? await Promise.all(
            credentials.securityQuestions.map(async (qa) => ({
              question: qa.question,
              answerHash: await createPasswordHash(qa.answer.toLowerCase().trim())
            }))
          )
        : undefined;

      const user: User = {
        id: this.generateUserId(),
        username: credentials.username,
        passwordHash,
        createdAt: new Date(),
        securityQuestions,
        recoveryKeyHash
      };

      this.users.push(user);
      this.saveState();

      // Initialize session for new user
            userSessionManager.initializeSession(user);
            console.log('✅ New user session created:', user.username);


      return {
        success: true,
        recoveryKey // ⚠️ RETURN THIS - user must save it!
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Failed to create account. Please try again.' };
    }
  }

  /**
   *  Initiate account recovery
   */
  async recoverAccount(request: RecoveryRequest, newPassword: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    // Check rate limiting
    const attempts = this.recoveryAttempts.get(request.username);
    if (attempts) {
      if (attempts.lockoutUntil && new Date() < attempts.lockoutUntil) {
        const minutesLeft = Math.ceil((attempts.lockoutUntil.getTime() - Date.now()) / 60000);
        return {
          success: false,
          error: `Too many attempts. Try again in ${minutesLeft} minutes`
        };
      }

      if (attempts.count >= MAX_RECOVERY_ATTEMPTS) {
        const lockoutUntil = new Date(Date.now() + RECOVERY_LOCKOUT_DURATION);
        this.recoveryAttempts.set(request.username, { count: 0, lockoutUntil });
        return {
          success: false,
          error: 'Too many attempts. Account locked for 1 hour'
        };
      }
    }

    // Find user (including soft-deleted)
    const user = this.users.find(
      u => u.username.toLowerCase() === request.username.toLowerCase()
    );

    if (!user) {
      this.incrementRecoveryAttempts(request.username);
      return { success: false, error: 'User not found' };
    }

    // Validate new password
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return { success: false, error: passwordValidation.errors.join('. ') };
    }

    try {
      let isValid = false;

      if (request.method === 'questions') {
        isValid = await this.verifySecurityQuestions(user, request.answers || []);
      } else if (request.method === 'key') {
        isValid = await this.verifyRecoveryKey(user, request.recoveryKey || '');
      }

      if (!isValid) {
        this.incrementRecoveryAttempts(request.username);
        return { success: false, error: 'Invalid recovery credentials' };
      }

      // Reset password
      user.passwordHash = await createPasswordHash(newPassword);

      // If account was soft-deleted, restore it
      if (user.deletedAt) {
        delete user.deletedAt;
        delete user.deleteScheduledFor;
      }

      this.saveState();
      this.recoveryAttempts.delete(request.username); // Clear attempts

      return { success: true };
    } catch (error) {
      console.error('Recovery error:', error);
      return { success: false, error: 'Recovery failed. Please try again.' };
    }
  }


/**
   *  Delete account with immediate data cleanup
   */
  async deleteAccount(request: DeleteAccountRequest): Promise<{
    success: boolean;
    error?: string;
    gracePeriodEnds?: Date;
    deletionSummary?: {
      localStorage: string[];
      firebase?: boolean;
      supabase?: boolean;
    };
  }> {
    const user = this.getCurrentUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify confirmation text
    if (request.confirmText !== 'DELETE') {
      return { success: false, error: 'Please type DELETE to confirm' };
    }

    console.log('🗑️ DELETION START:', {
      userId: user.id,
      username: user.username,
      storageKeysBefore: Object.keys(localStorage)
    });

    try {
      let isVerified = false;

      // Verify with password OR security question
      if (request.password) {
        isVerified = await verifyPassword(request.password, user.passwordHash);
      } else if (request.securityAnswer && user.securityQuestions?.[0]) {
        isVerified = await verifyPassword(
          request.securityAnswer.toLowerCase().trim(),
          user.securityQuestions[0].answerHash
        );
      }

      if (!isVerified) {
        return { success: false, error: 'Verification failed' };
      }

      // Mark for deletion (grace period)
      const gracePeriodEnds = new Date(Date.now() + SOFT_DELETE_PERIOD);
      user.deletedAt = new Date();
      user.deleteScheduledFor = gracePeriodEnds;

      // Save the deletion state to authState
      this.saveState();

      //  Delete user session and data
            console.log('🗑️ Deleting user session for:', user.id);
            userSessionManager.deleteUserSession(user.id);
            storageService.deleteUserData(user.id);
            deviceService.clearDevices();

      // Schedule cascading deletion (for Firebase/Supabase after grace period)
      this.scheduleCascadingDeletion(user.id, gracePeriodEnds);

      // Logout AFTER deletion
      this.logout();

      return {
        success: true,
        gracePeriodEnds
      };
    } catch (error) {
      console.error('Account deletion error:', error);
      return { success: false, error: 'Failed to delete account' };
    }
  }


   /**
     * Get current user session
     */
    getCurrentUserSession() {
      return userSessionManager.getCurrentSession();
    }

    /**
     * Check feature access for current user
     */
    canAccessFeature(feature: string): {
      allowed: boolean;
      reason?: string;
      upgradeRequired?: string;
    } {
      return userSessionManager.canPerformAction(feature);
    }


/**
   * 🆕 FIXED: Permanently delete user and ALL associated data
   */
private async permanentlyDeleteUser(userId: string): Promise<void> {
  const user = this.users.find(u => u.id === userId);
  if (!user) {
    console.warn(`⚠️ User ${userId} not found for deletion`);
    return;
  }

  console.log(`🗑️ PERMANENT DELETION START for user: ${user.username} (${userId})`);

  try {
    // 1. Delete from localStorage
    console.log('🗑️ Step 1: Deleting localStorage...');
    const localResult = storageService.deleteUserData(userId);
    console.log('✅ LocalStorage deletion:', localResult);

    // 2. Clear in-memory state
    console.log('🗑️ Step 2: Clearing in-memory state...');
    deviceService.clearDevices();
    console.log('✅ In-memory state cleared');

    // 3. Delete from Firebase (if enabled)
    const { firebaseService } = await import('./firebase.service');
    if (firebaseService.isEnabled()) {
      console.log('🗑️ Step 3: Deleting Firebase data...');
      try {
        await firebaseService.deleteUserData(userId);
        console.log('✅ Firebase data deleted');
      } catch (error) {
        console.error('❌ Firebase deletion failed:', error);
      }
    }

    // 4. Delete from Supabase (if enabled)
    const { supabaseService } = await import('./supabase.service');
    if (supabaseService.isEnabled()) {
      console.log('🗑️ Step 4: Deleting Supabase data...');
      try {
        await supabaseService.deleteUserData(userId);
        console.log('✅ Supabase data deleted');
      } catch (error) {
        console.error('❌ Supabase deletion failed:', error);
      }
    }

    // 5. Remove user from memory
    console.log('🗑️ Step 5: Removing user from memory...');
    this.users = this.users.filter(u => u.id !== userId);
    this.saveState();

    console.log(`✅ PERMANENT DELETION COMPLETE for user: ${user.username}`);
    console.log('📊 Final storage state:', Object.keys(localStorage));
  } catch (error) {
    console.error('❌ Permanent deletion failed:', error);
    // Still remove from users array even if cleanup fails
    this.users = this.users.filter(u => u.id !== userId);
    this.saveState();
  }
}

/**
   * Schedule cascading deletion after grace period
   */
private scheduleCascadingDeletion(userId: string, deleteAt: Date): void {
  const delay = deleteAt.getTime() - Date.now();

  if (delay <= 0) {
    // Grace period already expired, delete immediately
    console.log('⚠️ Grace period expired, deleting immediately');
    this.permanentlyDeleteUser(userId);
    return;
  }

  console.log(`⏰ Scheduled deletion for ${new Date(deleteAt).toLocaleString()}`);

  // Schedule deletion (Note: This won't persist across app restarts)
  // That's why we also check in cleanupDeletedAccounts()
  setTimeout(() => {
    console.log('⏰ Scheduled deletion timer triggered');
    this.permanentlyDeleteUser(userId);
  }, delay);
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

/**
   * Generate unique user ID with better randomness
   */
private generateUserId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);

  // 🆕 FIX: Add crypto random for better uniqueness
  const cryptoArray = new Uint32Array(1);
  crypto.getRandomValues(cryptoArray);
  const cryptoRandom = cryptoArray[0].toString(36);

  const userId = `user_${timestamp}_${random}_${cryptoRandom}`;
  console.log('🆕 Generated new user ID:', userId);
  return userId;
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