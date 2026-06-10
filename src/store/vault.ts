import { create } from 'zustand';
import { dekToBase64, base64ToDek } from '@/lib/client-crypto';

interface VaultState {
  isUnlocked: boolean;
  dek: Uint8Array | null;
  autoLockTimeoutMs: number;
  unlock: (dek: Uint8Array) => void;
  lock: () => void;
  getDekBase64: () => string | null;
  setAutoLockTimeout: (ms: number) => void;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  isUnlocked: false,
  dek: null,
  autoLockTimeoutMs: 5 * 60 * 1000, // 5 minutes default
  unlock: (dek: Uint8Array) => set({ isUnlocked: true, dek }),
  lock: () => set({ isUnlocked: false, dek: null }),
  getDekBase64: () => {
    const { dek } = get();
    return dek ? dekToBase64(dek) : null;
  },
  setAutoLockTimeout: (ms: number) => set({ autoLockTimeoutMs: ms }),
}));
