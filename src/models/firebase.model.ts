export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  databaseURL?: string;
}

export interface FirebaseSettings {
  enabled: boolean;
  config: FirebaseConfig;
  syncDevices: boolean;
  syncMqttSettings: boolean;
}

export const DEFAULT_FIREBASE_SETTINGS: FirebaseSettings = {
  enabled: false,
  config: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    measurementId: '',
    databaseURL: ''
  },
  syncDevices: false,
  syncMqttSettings: false
};

export interface FirebaseTestResult {
  success: boolean;
  error?: string;
}

export interface FirebaseInitResult {
  success: boolean;
  error?: string;
}