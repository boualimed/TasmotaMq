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
  storeMqttMessages: boolean;
  lastSync?: Date;
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
  syncDevices: true,
  syncMqttSettings: true,
  storeMqttMessages: false
};