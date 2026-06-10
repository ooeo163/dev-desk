'use client';

import { useState, useEffect, useRef, useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { checkVaultStatus, initializeVault, unlockVault } from '@/actions/auth';
import { deriveDek } from '@/lib/client-crypto';
import { useVaultStore } from '@/store/vault';

export default function AuthPage() {
  const router = useRouter();
  const unlockStore = useVaultStore((s) => s.unlock);
  const [isSetup, setIsSetup] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const passwordRef = useRef('');

  useEffect(() => {
    checkVaultStatus().then(({ initialized }) => {
      setIsSetup(!initialized);
    });
  }, []);

  const [initState, initAction, initPending] = useActionState(initializeVault, {});
  const [unlockState, unlockAction, unlockPending] = useActionState(unlockVault, {});

  // Handle init result
  useEffect(() => {
    if (initState?.success && initState.kdfSalt) {
      deriveDek(passwordRef.current, initState.kdfSalt)
        .then((dek) => {
          unlockStore(dek);
          router.push('/dashboard');
        })
        .catch(() => toast.error('密钥派生失败，请重试'));
    } else if (initState?.error) {
      toast.error(initState.error);
    }
  }, [initState, unlockStore, router]);

  // Handle unlock result
  useEffect(() => {
    if (unlockState?.success && unlockState.kdfSalt) {
      deriveDek(passwordRef.current, unlockState.kdfSalt)
        .then((dek) => {
          unlockStore(dek);
          router.push('/dashboard');
        })
        .catch(() => toast.error('密钥派生失败，请重试'));
    } else if (unlockState?.error) {
      toast.error(unlockState.error);
    }
  }, [unlockState, unlockStore, router]);

  if (isSetup === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-start justify-center bg-background p-4 pt-[22vh]">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">DevDesk</h2>
          </div>
          {/* <CardDescription>
            {isSetup ? '设置你的主密码来初始化工作台' : '输入主密码解锁工作台'}
          </CardDescription> */}
        </CardHeader>
        <CardContent className="pb-8">
          {isSetup ? (
            <form action={initAction} className="space-y-5">
              <input type="text" name="username" autoComplete="username" className="hidden" tabIndex={-1} aria-hidden="true" />
              <div className="space-y-2">
                <Label htmlFor="setup-password">主密码</Label>
                <div className="relative">
                  <Input
                    id="setup-password"
                    name="masterPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="至少8个字符..."
                    className="h-11 pr-10"
                    autoComplete="new-password"
                    required
                    onChange={(e) => { passwordRef.current = e.target.value; }}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-confirm">确认密码</Label>
                <div className="relative">
                  <Input
                    id="setup-confirm"
                    name="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="再次输入主密码..."
                    className="h-11 pr-10"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    onClick={() => setShowConfirm(!showConfirm)}
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <Button className="w-full h-11" type="submit" disabled={initPending}>
                {initPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    初始化中...
                  </>
                ) : '初始化工作台'}
              </Button>
            </form>
          ) : (
            <form action={unlockAction} className="space-y-5">
              <input type="text" name="username" autoComplete="username" className="hidden" tabIndex={-1} aria-hidden="true" />
              <div className="space-y-2">
                {/* <Label htmlFor="unlock-password">主密码</Label> */}
                <div className="relative">
                  <Input
                    id="unlock-password"
                    name="masterPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="输入主密码..."
                    className="h-11 pr-10"
                    autoComplete="new-password"
                    required
                    autoFocus
                    onChange={(e) => { passwordRef.current = e.target.value; }}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <Button className="w-full h-11" type="submit" disabled={unlockPending}>
                {unlockPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    解锁中...
                  </>
                ) : '解锁'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
