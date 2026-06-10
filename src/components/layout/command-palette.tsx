'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { KeyRound, CheckSquare, Plus, Lock, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCommandPalette } from '@/hooks/use-command-palette';
import { useVaultStore } from '@/store/vault';
import { lockVault } from '@/actions/auth';
import { getCredentials } from '@/actions/credentials';
import { getTasks } from '@/actions/tasks';
import { toast } from 'sonner';

export function CommandPalette() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const lock = useVaultStore((s) => s.lock);
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);
  useCommandPalette(toggle);

  const { data: credentials = [] } = useQuery({
    queryKey: ['credentials'],
    queryFn: getCredentials,
    enabled: open,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => getTasks(),
    enabled: open,
  });

  function handleSelect(action: string) {
    setOpen(false);
    switch (action) {
      case 'new-credential':
        router.push('/dashboard/credentials');
        break;
      case 'new-task':
        router.push('/dashboard/tasks');
        break;
      case 'lock':
        lock();
        lockVault();
        toast.success('工作台已锁定');
        router.push('/');
        break;
      case 'toggle-theme':
        setTheme(theme === 'dark' ? 'light' : 'dark');
        break;
      default:
        if (action.startsWith('cred:')) {
          router.push('/dashboard/credentials');
        } else if (action.startsWith('task:')) {
          router.push('/dashboard/tasks');
        }
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="搜索凭证、任务或操作..." />
      <CommandList>
        <CommandEmpty>没有找到结果</CommandEmpty>

        <CommandGroup heading="操作">
          <CommandItem value="new-credential" onSelect={() => handleSelect('new-credential')}>
            <Plus className="mr-2 h-4 w-4" /> 新建凭证
          </CommandItem>
          <CommandItem value="new-task" onSelect={() => handleSelect('new-task')}>
            <Plus className="mr-2 h-4 w-4" /> 新建任务
          </CommandItem>
          <CommandItem value="lock" onSelect={() => handleSelect('lock')}>
            <Lock className="mr-2 h-4 w-4" /> 锁定工作台
          </CommandItem>
          <CommandItem value="toggle-theme" onSelect={() => handleSelect('toggle-theme')}>
            {theme === 'dark' ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            切换主题
          </CommandItem>
        </CommandGroup>

        {credentials.length > 0 && (
          <CommandGroup heading="凭证">
            {credentials.map((cred) => (
              <CommandItem
                key={cred.id}
                value={`cred:${cred.title} ${cred.username ?? ''}`}
                onSelect={() => handleSelect(`cred:${cred.id}`)}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                <span>{cred.title}</span>
                {cred.username && (
                  <span className="ml-2 text-xs text-muted-foreground">{cred.username}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {tasks.length > 0 && (
          <CommandGroup heading="任务">
            {tasks.map((task) => (
              <CommandItem
                key={task.id}
                value={`task:${task.title}`}
                onSelect={() => handleSelect(`task:${task.id}`)}
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                <span>{task.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
