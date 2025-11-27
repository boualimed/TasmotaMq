import { TelegramAlertConfig, TelegramSettings } from "./telegram.model";

export interface User {
    id: string;
    username: string;
    passwordHash: string;
    createdAt: Date;
  lastLogin?: Date;

  // 🆕 NEW: Recovery fields
  securityQuestions?: SecurityQuestion[];
  recoveryKeyHash?: string; // Hashed recovery key
  deletedAt?: Date; // For soft delete
  deleteScheduledFor?: Date; // 30 days after deletion
  }

  export interface SecurityQuestion {
    question: string;
    answerHash: string; // Never store plain text!
  }

  export interface RecoveryKey {
    key: string; // The actual key shown to user ONCE
    hash: string; // What we store
  }

  export interface Session {
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    telegramSettings?: TelegramSettings;
    telegramAlertConfigs?: Record<string, TelegramAlertConfig>;
  }

  export interface AuthState {
    users: User[];
    currentSession?: Session;
  }

  export interface LoginCredentials {
    username: string;
    password: string;
  }

  export interface RegisterCredentials {
    username: string;
    password: string;
    confirmPassword: string;

    // 🆕 NEW: Recovery data
    securityQuestions?: Array<{
    question: string;
    answer: string;
  }>;
}

// 🆕 NEW: Recovery request
export interface RecoveryRequest {
  username: string;
  method: 'questions' | 'key';

  // For security questions
  answers?: string[];

  // For recovery key
  recoveryKey?: string;
}

// 🆕 NEW: Deletion request
export interface DeleteAccountRequest {
  password?: string;
  securityAnswer?: string;
  confirmText: string; // Must type "DELETE"
}