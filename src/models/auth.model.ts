export interface User {
    id: string;
    username: string;
    passwordHash: string;
    createdAt: Date;
    lastLogin?: Date;
  }

  export interface Session {
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
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
  }