import { create } from 'zustand';

interface AuthStore {
  redirectUrl: string | null;
  setRedirectUrl: (url: string | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  redirectUrl: null,
  setRedirectUrl: (url) => set({ redirectUrl: url }),
}));
