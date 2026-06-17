'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { CheckSquare, KeyRound, NotebookPen, Plus } from 'lucide-react';
import { getCredentials } from '@/actions/credentials';
import { getTasks } from '@/actions/tasks';

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: number | null;
  credentialId: string | null;
  credentialTitle: string | null;
  createdAt: Date;
}

export default function QuickSearchPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  const { data: credentials = [] } = useQuery({
    queryKey: ['credentials'],
    queryFn: getCredentials,
    staleTime: 30000,
  });

  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => getTasks({ pageSize: 200 }),
    staleTime: 30000,
  });

  const tasks = useMemo(() => tasksData?.data ?? [], [tasksData]);

  useEffect(() => {
    inputRef.current?.focus();

    window.electronAPI?.onQuickSearchFocus?.(() => {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        window.electronAPI?.hideQuickSearch?.();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function openWorkbench(path: string) {
    if (window.electronAPI?.openWorkbench) {
      await window.electronAPI.openWorkbench(path);
      return;
    }

    window.location.href = path;
  }

  return (
    <main className="min-h-screen bg-transparent p-3">
      <Command
        value={query}
        onValueChange={setQuery}
        className="h-full rounded-xl border border-border/70 bg-popover/98 shadow-2xl"
      >
        <CommandInput
          ref={inputRef}
          placeholder="搜索凭证、任务或操作..."
          className="h-11 text-base"
        />
        <CommandList className="max-h-[340px]">
          <CommandEmpty>没有找到结果</CommandEmpty>

          <CommandGroup heading="操作">
            <CommandItem value="new-credential 新建凭证" onSelect={() => openWorkbench('/dashboard/credentials?action=create')}>
              <Plus className="mr-2 h-4 w-4" />
              新建凭证
            </CommandItem>
            <CommandItem value="credentials 凭证管理" onSelect={() => openWorkbench('/dashboard/credentials')}>
              <KeyRound className="mr-2 h-4 w-4" />
              凭证管理
            </CommandItem>
            <CommandItem value="work-logs 工作记录" onSelect={() => openWorkbench('/dashboard/work-logs')}>
              <NotebookPen className="mr-2 h-4 w-4" />
              工作记录
            </CommandItem>
          </CommandGroup>

          {credentials.length > 0 && (
            <CommandGroup heading="凭证">
              {credentials.map((cred) => (
                <CommandItem
                  key={cred.id}
                  value={`credential ${cred.title} ${cred.username ?? ''} ${cred.address ?? ''}`}
                  onSelect={() => openWorkbench(`/dashboard/credentials?detail=${cred.id}`)}
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  <span className="truncate">{cred.title}</span>
                  {cred.username && (
                    <span className="ml-auto max-w-40 truncate text-xs text-muted-foreground">
                      {cred.username}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {tasks.length > 0 && (
            <CommandGroup heading="任务">
              {tasks.map((task: TaskItem) => (
                <CommandItem
                  key={task.id}
                  value={`task ${task.title} ${task.credentialTitle ?? ''}`}
                  onSelect={() => openWorkbench('/dashboard')}
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  <span className="truncate">{task.title}</span>
                  {task.credentialTitle && (
                    <span className="ml-auto max-w-40 truncate text-xs text-muted-foreground">
                      {task.credentialTitle}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </main>
  );
}
