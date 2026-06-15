'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  KeyRound,
  CheckSquare,
  Clock,
  Shield,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  User,
  MoreHorizontal,
  ArrowRight,
  NotebookPen,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { getDashboardStats } from '@/actions/dashboard';
import { getCredentialById } from '@/actions/credentials';
import { updateTaskStatus } from '@/actions/tasks';
import { getWorkLogs, getOrCreateCurrentWeekWorkLog, updateWorkLog } from '@/actions/work-logs';
import { useVaultStore } from '@/store/vault';
import { useClipboard } from '@/hooks/use-clipboard';
import { cn } from '@/lib/utils';
import { CredentialDetail } from '@/components/vault/credential-detail';
import { CredentialDialog } from '@/components/vault/credential-dialog';
import { TaskDetail } from '@/components/vault/task-detail';
import { TaskDialog } from '@/components/vault/task-dialog';

const statusConfig: Record<string, { label: string; dot: string }> = {
  todo: { label: '待办', dot: 'bg-amber-500' },
  in_progress: { label: '进行中', dot: 'bg-blue-500' },
  done: { label: '已完成', dot: 'bg-green-500' },
};

const priorityLabels = ['无', '低', '中', '高'];
const priorityColors = ['', 'bg-gray-400', 'bg-amber-500', 'bg-red-500'];

type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: number | null;
  credentialId: string | null;
  credentialTitle: string | null;
  createdAt: Date;
};

export default function DashboardPage() {
  const router = useRouter();
  const { copy } = useClipboard();
  const getDekBase64 = useVaultStore((s) => s.getDekBase64);
  const queryClient = useQueryClient();
  const [copyFeedback, setCopyFeedback] = useState<Record<string, true>>({});

  // Credential dialogs
  const [credDetailId, setCredDetailId] = useState<string | null>(null);
  const [credDetailOpen, setCredDetailOpen] = useState(false);
  const [credEditOpen, setCredEditOpen] = useState(false);
  const [credEditData, setCredEditData] = useState<{
    id: string; title: string; username: string | null; address: string | null; tags: string[];
    password?: string | null; apiKey?: string | null; totpSecret?: string | null; notes?: string | null;
  } | null>(null);

  // Task dialogs
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [taskDetailData, setTaskDetailData] = useState<TaskItem | null>(null);
  const [taskEditOpen, setTaskEditOpen] = useState(false);
  const [taskEditData, setTaskEditData] = useState<{
    id: string; title: string; description: string | null;
    status: string; priority: number; credentialId: string | null;
  } | null>(null);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  });

  // ── Work log (current week) ──────────────────────
  const [wlProject, setWlProject] = useState('');
  const [wlTask, setWlTask] = useState('');
  const [wlSaving, setWlSaving] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  // Compute target week boundaries based on weekOffset
  const today = new Date();
  const todayDay = today.getDay();
  const mondayOffset = todayDay === 0 ? -6 : 1 - todayDay;
  const targetMonday = new Date(today);
  targetMonday.setDate(today.getDate() + mondayOffset + weekOffset * 7);
  targetMonday.setHours(0, 0, 0, 0);
  const targetSunday = new Date(targetMonday);
  targetSunday.setDate(targetMonday.getDate() + 6);
  targetSunday.setHours(23, 59, 59, 999);
  const isCurrentWeek = weekOffset === 0;

  const { data: workLogs = [] } = useQuery({
    queryKey: ['work-logs'],
    queryFn: getWorkLogs,
  });

  // Find work log for the currently viewed week
  const targetWeekLog = workLogs.find((log) => {
    const s = new Date(log.weekStart); const e = new Date(log.weekEnd);
    s.setHours(0, 0, 0, 0); e.setHours(23, 59, 59, 999);
    return targetMonday.getTime() === s.getTime() && targetSunday.getTime() === e.getTime();
  });
  // Keep currentWeekLog for backward compatibility in save handlers
  const currentWeekLog = isCurrentWeek ? targetWeekLog : workLogs.find((log) => {
    const now = new Date();
    const s = new Date(log.weekStart); const e = new Date(log.weekEnd);
    s.setHours(0, 0, 0, 0); e.setHours(23, 59, 59, 999);
    return now >= s && now <= e;
  });

  useEffect(() => {
    if (targetWeekLog) {
      setWlProject(targetWeekLog.projectProgress ?? '');
      setWlTask(targetWeekLog.taskDetails ?? '');
    } else {
      setWlProject('');
      setWlTask('');
    }
  }, [targetWeekLog]);

  async function ensureTargetWeekLog() {
    if (!isCurrentWeek) return;
    if (!targetWeekLog) {
      await getOrCreateCurrentWeekWorkLog();
      queryClient.invalidateQueries({ queryKey: ['work-logs'] });
    }
  }

  const saveWlProject = useCallback(async () => {
    if (!currentWeekLog) return;
    setWlSaving(true);
    try {
      await updateWorkLog(currentWeekLog.id, { projectProgress: wlProject });
      queryClient.invalidateQueries({ queryKey: ['work-logs'] });
    } catch { toast.error('保存失败'); }
    finally { setWlSaving(false); }
  }, [currentWeekLog, wlProject, queryClient]);

  const saveWlTask = useCallback(async () => {
    if (!currentWeekLog) return;
    setWlSaving(true);
    try {
      await updateWorkLog(currentWeekLog.id, { taskDetails: wlTask });
      queryClient.invalidateQueries({ queryKey: ['work-logs'] });
    } catch { toast.error('保存失败'); }
    finally { setWlSaving(false); }
  }, [currentWeekLog, wlTask, queryClient]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateTaskStatus(id, status),
    onSuccess: (_, variables) => {
      // Update local task data
      if (taskDetailData && taskDetailData.id === variables.id) {
        setTaskDetailData({ ...taskDetailData, status: variables.status });
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => {
      toast.error('状态更新失败');
    },
  });

  function triggerCopyFeedback(key: string) {
    setCopyFeedback((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopyFeedback((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 1500);
  }

  async function handleCopyPassword(id: string, title: string) {
    const dekBase64 = getDekBase64();
    if (!dekBase64) { toast.error('工作台未解锁'); return; }
    try {
      const result = await getCredentialById(id, dekBase64, ['password']);
      if (result?.password) {
        copy(result.password as string);
        triggerCopyFeedback(`pwd-${id}`);
        toast.success(`${title} 密码已复制`);
      } else {
        toast.error('该凭证没有密码');
      }
    } catch {
      toast.error('解密失败');
    }
  }

  // Credential detail handlers
  function openCredDetail(id: string) {
    setCredDetailId(id);
    setCredDetailOpen(true);
  }

  function handleCredEdit(cred: typeof credEditData) {
    setCredDetailOpen(false);
    setCredEditData(cred);
    setCredEditOpen(true);
  }

  function handleCredDialogClose(open: boolean) {
    if (!open) {
      setCredEditOpen(false);
      setCredEditData(null);
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
  }

  function handleCredDetailClose(open: boolean) {
    if (!open) {
      setCredDetailOpen(false);
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
  }

  // Task detail handlers
  function openTaskDetail(task: TaskItem) {
    setTaskDetailData(task);
    setTaskDetailOpen(true);
  }

  function handleTaskEdit(task: TaskItem) {
    setTaskDetailOpen(false);
    setTaskEditData({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status ?? 'todo',
      priority: task.priority ?? 0,
      credentialId: task.credentialId,
    });
    setTaskEditOpen(true);
  }

  function handleTaskDialogClose(open: boolean) {
    if (!open) {
      setTaskEditOpen(false);
      setTaskEditData(null);
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
  }

  function handleTaskDetailClose(open: boolean) {
    if (!open) {
      setTaskDetailOpen(false);
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
  }

  const statCards = [
    {
      title: '凭证总数',
      value: stats?.credentialCount ?? 0,
      icon: KeyRound,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      href: '/dashboard/credentials',
    },
    {
      title: '待办任务',
      value: stats?.todoCount ?? 0,
      icon: Clock,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      href: '/dashboard/tasks?status=todo',
    },
    {
      title: '进行中',
      value: stats?.inProgressCount ?? 0,
      icon: CheckSquare,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      href: '/dashboard/tasks?status=in_progress',
    },
    {
      title: '已完成',
      value: stats?.doneCount ?? 0,
      icon: Shield,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      href: '/dashboard/tasks?status=done',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">仪表板</h1>
        <p className="text-muted-foreground">欢迎回来，这是你的工作台概览。</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-12" />
                </CardContent>
              </Card>
            ))
          : statCards.map((stat) => (
              <Card
                key={stat.title}
                className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
                onClick={() => router.push(stat.href)}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', stat.bg)}>
                    <stat.icon className={cn('h-4 w-4', stat.color)} />
                  </div>
                </CardHeader>
                <CardContent className="flex items-end justify-between">
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Main content grid: 工作记录 (left) + 凭证/任务 (right) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Work Log with week navigation */}
        <Card className="lg:flex lg:flex-col">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 shrink-0">
            <div className="flex items-center gap-2 shrink-0">
              <NotebookPen className="h-4 w-4 text-orange-500" />
              <CardTitle className="text-base">工作记录</CardTitle>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {wlSaving && (
                <span className="text-xs text-muted-foreground flex items-center gap-1 mr-2">
                  <div className="h-2 w-2 rounded-full bg-primary/40 animate-pulse" />
                  保存中
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setWeekOffset((o) => o - 1)}
                title="上一周"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground flex items-center gap-1 px-1.5 min-w-[120px] justify-center tabular-nums">
                <Calendar className="h-3 w-3 shrink-0" />
                {targetMonday.getMonth() + 1}/{targetMonday.getDate()} ~ {targetSunday.getMonth() + 1}/{targetSunday.getDate()}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setWeekOffset((o) => Math.min(o + 1, 0))}
                disabled={weekOffset >= 0}
                title="下一周"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {!isCurrentWeek && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground h-7 px-2 ml-1"
                  onClick={() => setWeekOffset(0)}
                >
                  本周
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground gap-1 ml-1"
                onClick={() => router.push('/dashboard/work-logs')}
              >
                全部 <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="lg:flex-1 lg:flex lg:flex-col">
            {targetWeekLog ? (
              <div className="space-y-2 lg:flex-1 lg:flex lg:flex-col lg:gap-2">
                <div className="space-y-1 shrink-0">
                  <label className="text-xs font-medium text-muted-foreground">项目</label>
                  <Textarea
                    value={wlProject}
                    onChange={(e) => setWlProject(e.target.value)}
                    onBlur={saveWlProject}
                    placeholder="当前进行中的项目..."
                    rows={4}
                    className="resize-none text-sm leading-relaxed border-border bg-background"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveWlProject();
                    }}
                  />
                </div>
                <div className="space-y-1 lg:flex-1 lg:flex lg:flex-col">
                  <label className="text-xs font-medium text-muted-foreground">任务详情</label>
                  <Textarea
                    value={wlTask}
                    onChange={(e) => setWlTask(e.target.value)}
                    onBlur={saveWlTask}
                    placeholder="本周完成的任务..."
                    rows={5}
                    className="resize-none text-sm leading-relaxed border-border bg-background lg:flex-1 lg:min-h-[180px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveWlTask();
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <NotebookPen className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {isCurrentWeek ? '本周还没有工作记录' : '该周暂无工作记录'}
                </p>
                {isCurrentWeek && (
                  <Button size="sm" onClick={ensureTargetWeekLog}>
                    <NotebookPen className="mr-1.5 h-3.5 w-3.5" /> 创建本周记录
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Credentials + Tasks stacked */}
        <div className="space-y-6">
          {/* Recent Credentials */}
          <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-base">最近凭证</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground gap-1"
              onClick={() => router.push('/dashboard/credentials')}
            >
              全部 <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-8 w-8" />
                  </div>
                ))}
              </div>
            ) : stats?.recentCredentials && stats.recentCredentials.length > 0 ? (
              <div className="space-y-1">
                {stats.recentCredentials.map((cred) => (
                  <div
                    key={cred.id}
                    className="group flex items-center justify-between rounded-lg border border-border/60 p-3 transition-all hover:bg-muted/50 hover:border-border cursor-pointer"
                    onClick={() => openCredDetail(cred.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <KeyRound className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{cred.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {cred.username && (
                            <span className="flex items-center gap-1 truncate">
                              <User className="h-3 w-3 shrink-0" />
                              <span className="truncate">{cred.username}</span>
                            </span>
                          )}
                          <span className="shrink-0">
                            {new Date(cred.updatedAt).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {cred.hasPassword && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          title="复制密码"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyPassword(cred.id, cred.title);
                          }}
                        >
                          {copyFeedback[`pwd-${cred.id}`] ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <KeyRound className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">暂无凭证</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-purple-500" />
              <CardTitle className="text-base">最近任务</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground gap-1"
              onClick={() => router.push('/dashboard/tasks')}
            >
              全部 <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-6 w-14" />
                  </div>
                ))}
              </div>
            ) : stats?.recentTasks && stats.recentTasks.length > 0 ? (
              <div className="space-y-1">
                {stats.recentTasks.map((task) => {
                  const config = statusConfig[task.status ?? 'todo'];
                  return (
                    <div
                      key={task.id}
                      className="group flex items-center justify-between rounded-lg border border-border/60 p-3 transition-all hover:bg-muted/50 hover:border-border cursor-pointer"
                      onClick={() => openTaskDetail(task as TaskItem)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn('h-2 w-2 shrink-0 rounded-full', config.dot)} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{config.label}</span>
                            {(task.priority ?? 0) > 0 && (
                              <span className="flex items-center gap-1">
                                <span className={cn('h-1.5 w-1.5 rounded-full', priorityColors[task.priority ?? 0])} />
                                {priorityLabels[task.priority ?? 0]}优先
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                                title="快速切换状态"
                              />
                            }
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                            {task.status !== 'todo' && (
                              <DropdownMenuItem onClick={() => statusMutation.mutate({ id: task.id, status: 'todo' })}>
                                <Clock className="mr-2 h-3 w-3" /> 标记待办
                              </DropdownMenuItem>
                            )}
                            {task.status !== 'in_progress' && (
                              <DropdownMenuItem onClick={() => statusMutation.mutate({ id: task.id, status: 'in_progress' })}>
                                <CheckSquare className="mr-2 h-3 w-3" /> 标记进行中
                              </DropdownMenuItem>
                            )}
                            {task.status !== 'done' && (
                              <DropdownMenuItem onClick={() => statusMutation.mutate({ id: task.id, status: 'done' })}>
                                <Shield className="mr-2 h-3 w-3" /> 标记已完成
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckSquare className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">暂无任务</p>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Credential Detail Dialog */}
      <CredentialDetail
        credentialId={credDetailId}
        open={credDetailOpen}
        onOpenChange={handleCredDetailClose}
        onEdit={handleCredEdit}
      />

      {/* Credential Edit Dialog */}
      <CredentialDialog
        open={credEditOpen}
        onOpenChange={handleCredDialogClose}
        credential={credEditData}
      />

      {/* Task Detail Dialog */}
      <TaskDetail
        task={taskDetailData}
        open={taskDetailOpen}
        onOpenChange={handleTaskDetailClose}
        onEdit={handleTaskEdit}
        onDelete={() => {
          setTaskDetailOpen(false);
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }}
        onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
      />

      {/* Task Edit Dialog */}
      <TaskDialog
        open={taskEditOpen}
        onOpenChange={handleTaskDialogClose}
        task={taskEditData}
      />
    </div>
  );
}
