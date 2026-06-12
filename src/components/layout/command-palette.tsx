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
import { KeyRound, CheckSquare, Plus, Lock, Sun, Moon, NotebookPen } from 'lucide-react';
import { EmptySearch } from '@/components/ui/illustrations';
import { useTheme } from 'next-themes';
import { useCommandPalette } from '@/hooks/use-command-palette';
import { useVaultStore } from '@/store/vault';
import { lockVault } from '@/actions/auth';
import { getCredentials } from '@/actions/credentials';
import { getTasks } from '@/actions/tasks';
import { toast } from 'sonner';
import { CredentialDetail } from '@/components/vault/credential-detail';
import { CredentialDialog } from '@/components/vault/credential-dialog';
import { TaskDetail } from '@/components/vault/task-detail';
import { TaskDialog } from '@/components/vault/task-dialog';

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

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const lock = useVaultStore((s) => s.lock);
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange! : setInternalOpen;

  const toggle = useCallback(() => setIsOpen(!isOpen), [isOpen, setIsOpen]);
  useCommandPalette(toggle);

  const { data: credentials = [] } = useQuery({
    queryKey: ['credentials'],
    queryFn: getCredentials,
    staleTime: 30000,
  });

  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => getTasks(),
    staleTime: 30000,
  });

  const tasks = tasksData?.data ?? [];

  const [credDetailOpen, setCredDetailOpen] = useState(false);
  const [selectedCredId, setSelectedCredId] = useState<string | null>(null);
  const [credDialogOpen, setCredDialogOpen] = useState(false);
  const [editCred, setEditCred] = useState<{
    id: string; title: string; username: string | null; address: string | null; tags: string[];
    password?: string | null; apiKey?: string | null; totpSecret?: string | null; notes?: string | null;
  } | null>(null);

  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<{
    id: string; title: string; description: string | null;
    status: string; priority: number; credentialId: string | null;
  } | null>(null);

  function handleSelect(action: string) {
    setIsOpen(false);
    switch (action) {
      case 'new-credential':
        setEditCred(null);
        setCredDialogOpen(true);
        break;
      case 'new-task':
        setEditTask(null);
        setTaskDialogOpen(true);
        break;
      case 'work-logs':
        router.push('/dashboard/work-logs');
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
          const credId = action.slice(5);
          setSelectedCredId(credId);
          setCredDetailOpen(true);
        } else if (action.startsWith('task:')) {
          const taskId = action.slice(5);
          const task = tasks.find((t) => t.id === taskId);
          if (task) {
            setSelectedTask(task);
            setTaskDetailOpen(true);
          }
        }
    }
  }

  function handleCredEdit(cred: {
    id: string; title: string; username: string | null; address: string | null; tags: string[];
    password?: string | null; apiKey?: string | null; totpSecret?: string | null; notes?: string | null;
  }) {
    setCredDetailOpen(false);
    setEditCred(cred);
    setCredDialogOpen(true);
  }

  function handleTaskEdit(task: TaskItem) {
    setTaskDetailOpen(false);
    setEditTask({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status ?? 'todo',
      priority: task.priority ?? 0,
      credentialId: task.credentialId,
    });
    setTaskDialogOpen(true);
  }

  function handleTaskStatusChange(_id: string, _status: string) {
    setTaskDetailOpen(false);
  }

  return (
    <>
      <CommandDialog open={isOpen} onOpenChange={setIsOpen} className="sm:max-w-3xl">
        <CommandInput placeholder="搜索凭证、任务、工作记录或操作..." />
        <CommandList className="max-h-[32rem]">
          <CommandEmpty>
            <EmptySearch className="mx-auto h-12 w-12 text-muted-foreground/30 mb-2" />
            没有找到结果
          </CommandEmpty>

          <CommandGroup heading="操作">
            <CommandItem value="new-credential" onSelect={() => handleSelect('new-credential')}>
              <Plus className="mr-2 h-4 w-4" /> 新建凭证
            </CommandItem>
            <CommandItem value="new-task" onSelect={() => handleSelect('new-task')}>
              <Plus className="mr-2 h-4 w-4" /> 新建任务
            </CommandItem>
            <CommandItem value="work-logs" onSelect={() => handleSelect('work-logs')}>
              <NotebookPen className="mr-2 h-4 w-4" /> 工作记录
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
              {credentials.slice(0, 5).map((cred) => (
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
              {tasks.slice(0, 5).map((task) => (
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

      <CredentialDetail
        credentialId={selectedCredId}
        open={credDetailOpen}
        onOpenChange={setCredDetailOpen}
        onEdit={handleCredEdit}
      />

      <CredentialDialog
        open={credDialogOpen}
        onOpenChange={(open) => {
          setCredDialogOpen(open);
          if (!open) setEditCred(null);
        }}
        credential={editCred}
      />

      <TaskDetail
        task={selectedTask}
        open={taskDetailOpen}
        onOpenChange={setTaskDetailOpen}
        onEdit={handleTaskEdit}
        onDelete={() => setTaskDetailOpen(false)}
        onStatusChange={handleTaskStatusChange}
      />

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={(open) => {
          setTaskDialogOpen(open);
          if (!open) setEditTask(null);
        }}
        task={editTask}
      />
    </>
  );
}
