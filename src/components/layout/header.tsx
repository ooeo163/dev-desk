'use client';

import { useRouter } from 'next/navigation';
import { Search, Sun, Moon, Lock, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { lockVault } from '@/actions/auth';
import { useVaultStore } from '@/store/vault';

interface HeaderProps {
  onMenuClick?: () => void;
  onSearchClick?: () => void;
}

export function Header({ onMenuClick, onSearchClick }: HeaderProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const lock = useVaultStore((s) => s.lock);

  async function handleLock() {
    lock();
    await lockVault();
    toast.success('工作台已锁定');
    router.push('/');
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-2">
        {onMenuClick && (
          <Button variant="ghost" size="icon" className="h-9 w-9 lg:hidden" onClick={onMenuClick}>
            <Menu className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="outline"
          className="h-9 flex-1 max-w-2xl justify-start text-muted-foreground"
          onClick={onSearchClick}
        >
          <Search className="mr-2 h-4 w-4" />
          <span className="text-sm">搜索...</span>
          <kbd className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
            ⌘K
          </kbd>
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleLock} title="锁定工作台">
          <Lock className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
