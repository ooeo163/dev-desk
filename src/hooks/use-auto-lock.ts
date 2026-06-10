'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useVaultStore } from '@/store/vault';
import { lockVault } from '@/actions/auth';

export function useAutoLock() {
  const router = useRouter();
  const isUnlocked = useVaultStore((s) => s.isUnlocked);
  const lock = useVaultStore((s) => s.lock);
  const autoLockTimeoutMs = useVaultStore((s) => s.autoLockTimeoutMs);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doLock = useCallback(async () => {
    lock();
    await lockVault();
    toast.info('工作台已因空闲自动锁定');
    router.push('/');
  }, [lock, router]);

  useEffect(() => {
    if (!isUnlocked) return;

    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(doLock, autoLockTimeoutMs);
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));

    // Start the initial timer
    resetTimer();

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isUnlocked, autoLockTimeoutMs, doLock]);
}
