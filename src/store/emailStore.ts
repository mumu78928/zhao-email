import { create } from 'zustand';

export interface EmailProvider {
  id: string;
  name: string;
  icon: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  webUrl: string;
  authHelpUrl: string;
}

export interface EmailConfig {
  id: string;
  email: string;
  password: string;
  providerId: string;
  customConfig?: Partial<EmailProvider>;
}

export interface EmailMessage {
  id: string;
  uid: number;
  from: { name: string; address: string };
  to: { name: string; address: string }[];
  subject: string;
  body: string;
  htmlBody: string;
  attachments: EmailAttachment[];
  date: Date;
  read: boolean;
  accountEmail: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  content: string;
  emailId: string;
}

interface EmailStore {
  providers: EmailProvider[];
  configs: EmailConfig[];
  activeConfigId: string | null;
  emails: EmailMessage[];
  selectedEmail: EmailMessage | null;
  loading: boolean;
  error: string | null;
  setProviders: (providers: EmailProvider[]) => void;
  addConfig: (config: Omit<EmailConfig, 'id'> | EmailConfig) => void;
  removeConfig: (configId: string) => void;
  setActiveConfig: (configId: string | null) => void;
  clearConfigs: () => void;
  setEmails: (emails: EmailMessage[]) => void;
  setSelectedEmail: (email: EmailMessage | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getConfigsFromStorage: () => EmailConfig[];
  saveConfigsToStorage: (configs: EmailConfig[]) => void;
  getActiveConfig: () => EmailConfig | null;
}

const STORAGE_KEY = 'email_client_configs';

function loadConfigsFromStorage(): EmailConfig[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      const oldConfig = parsed;
      if (oldConfig.email && oldConfig.password) {
        return [{ id: '1', ...oldConfig }];
      }
    }
  } catch {
    // ignore
  }
  return [];
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useEmailStore = create<EmailStore>((set, get) => {
  const savedConfigs = loadConfigsFromStorage();
  
  return {
    providers: [],
    configs: savedConfigs,
    activeConfigId: savedConfigs.length > 0 ? savedConfigs[0].id : null,
    emails: [],
    selectedEmail: null,
    loading: false,
    error: null,

    setProviders: (providers) => set({ providers }),

    addConfig: (config) => {
      const newConfig = { ...config, id: 'id' in config && config.id ? config.id : generateId() };
      set(state => {
        const exists = state.configs.some(c => c.email === newConfig.email);
        if (exists) {
          return { configs: state.configs.map(c => c.email === newConfig.email ? newConfig : c) };
        }
        return { configs: [...state.configs, newConfig], activeConfigId: newConfig.id };
      });
      get().saveConfigsToStorage(get().configs);
    },

    removeConfig: (configId) => {
      set(state => {
        const newConfigs = state.configs.filter(c => c.id !== configId);
        let newActiveId = state.activeConfigId;
        if (state.activeConfigId === configId) {
          newActiveId = newConfigs.length > 0 ? newConfigs[0].id : null;
        }
        return { configs: newConfigs, activeConfigId: newActiveId, emails: [], selectedEmail: null };
      });
      get().saveConfigsToStorage(get().configs);
    },

    setActiveConfig: (configId) => {
      set({ activeConfigId: configId });
    },

    clearConfigs: () => {
      set({ configs: [], activeConfigId: null, emails: [], selectedEmail: null });
      localStorage.removeItem(STORAGE_KEY);
    },

    setEmails: (emails) => set({ emails }),

    setSelectedEmail: (email) => set({ selectedEmail: email }),

    setLoading: (loading) => set({ loading }),

    setError: (error) => set({ error }),

    getConfigsFromStorage: () => {
      return loadConfigsFromStorage();
    },

    saveConfigsToStorage: (configs) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
    },

    getActiveConfig: () => {
      const { configs, activeConfigId } = get();
      return configs.find(c => c.id === activeConfigId) || null;
    }
  };
});