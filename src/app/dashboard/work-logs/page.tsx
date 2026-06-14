'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, Pencil, Calendar, NotebookPen, Eye, MoreVertical } from 'lucide-react';
import { EmptyVault } from '@/components/ui/illustrations';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  getWorkLogs,
  deleteWorkLog,
  getOrCreateCurrentWeekWorkLog,
  updateWorkLog,
} from '@/actions/work-logs';
import { WorkLogDialog } from '@/components/vault/work-log-dialog';
import { WorkLogDetail } from '@/components/vault/work-log-detail';

function formatDateRange(start: Date, end: Date): string {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.getMonth() + 1}/${s.getDate()}(周一) ~ ${e.getMonth() + 1}/${e.getDate()}(周日)`;
}

function isCurrentWeek(weekStart: Date, weekEnd: Date): boolean {
  const now = new Date();
  const start = new Date(weekStart);
  const end = new Date(weekEnd);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return now >= start && now <= end;
}

type WorkLogRow = Awaited<ReturnType<typeof getWorkLogs>>[number];

export default function WorkLogsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: string }>({ open: false });
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  // Inline editing state
  const [projectValue, setProjectValue] = useState('');
  const [taskValue, setTaskValue] = useState('');
  const [saving, setSaving] = useState(false);

  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['work-logs'] });
  }, [queryClient]);

  const { data: workLogs = [] } = useQuery({
    queryKey: ['work-logs'],
    queryFn: getWorkLogs,
  });

  const currentWeek = workLogs.find((log) => isCurrentWeek(log.weekStart, log.weekEnd));
  const historyLogs = workLogs.filter((log) => !isCurrentWeek(log.weekStart, log.weekEnd));
  const editingLog = editingLogId
    ? workLogs.find((log) => log.id === editingLogId) ?? currentWeek ?? null
    : currentWeek ?? null;

  // Refetch when page becomes visible
  const pathname = usePathname();
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') invalidate();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [invalidate]);

  useEffect(() => {
    if (pathname === '/dashboard/work-logs') invalidate();
  }, [pathname, invalidate]);

  // Sync local state when editingLog changes
  useEffect(() => {
    if (editingLog) {
      setProjectValue(editingLog.projectProgress ?? '');
      setTaskValue(editingLog.taskDetails ?? '');
    }
  }, [editingLog]);

  async function handleProjectSave() {
    if (!editingLog) return;
    setSaving(true);
    try {
      await updateWorkLog(editingLog.id, { projectProgress: projectValue });
      invalidate();
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleTaskSave() {
    if (!editingLog) return;
    setSaving(true);
    try {
      await updateWorkLog(editingLog.id, { taskDetails: taskValue });
      invalidate();
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    if (!currentWeek) {
      try {
        await getOrCreateCurrentWeekWorkLog();
        invalidate();
      } catch {
        toast.error('创建本周记录失败');
      }
    } else {
      toast.info('本周已有工作记录，可直接在左侧编辑');
      document.querySelector('[data-current-week]')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function handleEdit(id: string) {
    setEditId(id);
    setDetailOpen(false);
    setDialogOpen(true);
  }

  function handleViewDetail(id: string) {
    setSelectedId(id);
    setDetailOpen(true);
  }

  function handleDelete(id: string) {
    setDeleteConfirm({ open: true, id });
  }

  async function confirmDelete() {
    if (!deleteConfirm.id) return;
    try {
      await deleteWorkLog(deleteConfirm.id);
      toast.success('工作记录已删除');
      setDeleteConfirm({ open: false });
      setDetailOpen(false);
      invalidate();
    } catch {
      toast.error('删除失败');
    }
  }

  function handleDialogClose(open: boolean) {
    if (!open) {
      setDialogOpen(false);
      setEditId(null);
      invalidate();
    }
  }

  function handleDetailClose(open: boolean) {
    if (!open) {
      setDetailOpen(false);
      invalidate();
    }
  }

  // Record card for the right panel
  const recordRow = (log: WorkLogRow, isCurrent: boolean) => {
    const isSelected = (editingLogId === log.id) || (!editingLogId && isCurrent);
    return (
      <div
        key={log.id}
        className={cn(
          'rounded-lg cursor-pointer transition-colors border px-3 py-2.5',
          'border-border/40 hover:border-border/70',
          isCurrent && !isSelected && 'border-border/50',
          isSelected && 'border-border ring-1 ring-foreground/[0.06]'
        )}
        onClick={() => setEditingLogId(log.id === editingLogId ? null : log.id)}
      >
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className="text-xs font-medium shrink-0">{formatDateRange(log.weekStart, log.weekEnd)}</span>
            {isCurrent && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">本周</Badge>}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" />}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
            >
              <MoreVertical className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => handleViewDetail(log.id)}>
                <Eye className="mr-2 h-3 w-3" /> 查看详情
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(log.id)}>
                <Pencil className="mr-2 h-3 w-3" /> 编辑
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(log.id)}>
                <Trash2 className="mr-2 h-3 w-3" /> 删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* Project preview */}
        {log.projectProgress && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mt-1.5">{log.projectProgress}</p>
        )}
        {/* Task details preview */}
        {log.taskDetails && (
          <p className="text-[11px] text-muted-foreground/70 line-clamp-2 leading-relaxed mt-1">{log.taskDetails}</p>
        )}
        {!log.projectProgress && !log.taskDetails && (
          <span className="text-[11px] text-muted-foreground/50 mt-1 block">暂无内容</span>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full -m-4 sm:-m-6">
      {/* Header — compact single row */}
      <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 pt-3 sm:pt-4 pb-2">
        <h1 className="text-lg font-bold tracking-tight">工作记录</h1>
        <Button size="sm" onClick={handleCreate}>
          <NotebookPen className="mr-1.5 h-3.5 w-3.5" /> 新建记录
        </Button>
      </div>

      {/* Main body — left-right split on desktop */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 px-4 sm:px-6 pb-3 sm:pb-4">
        {/* Left column: Editing panel */}
        <div className="overflow-y-auto lg:pr-2">
          {editingLog ? (
            <Card className="border border-border/60 shadow-sm bg-card overflow-hidden p-0 h-full flex flex-col" data-current-week>
              {/* Panel Header — minimal: just date + save indicator */}
              <div className="flex items-center justify-between px-5 py-2.5 border-b border-border/40">
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span
                    className="font-medium cursor-pointer hover:underline decoration-dotted underline-offset-4"
                    onClick={() => handleViewDetail(editingLog!.id)}
                  >
                    {formatDateRange(editingLog!.weekStart, editingLog!.weekEnd)}
                  </span>
                </div>
                <div
                  className={cn(
                    'text-xs text-muted-foreground flex items-center gap-1 transition-all duration-300',
                    saving ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  )}
                >
                  <div className="h-2.5 w-2.5 rounded-full bg-primary/40 animate-pulse" />
                  已保存
                </div>
              </div>

              {/* Card Body — two textareas fill remaining space */}
              <div className="flex-1 flex flex-col px-5 py-3 gap-3 min-h-0">

                {/* Section 1: 项目 */}
                <div className="flex flex-col shrink-0">
                  <label className="text-xs font-medium text-muted-foreground mb-1">项目</label>
                  <Textarea
                    value={projectValue}
                    onChange={(e) => setProjectValue(e.target.value)}
                    onBlur={handleProjectSave}
                    placeholder="当前进行中的项目或模块..."
                    rows={4}
                    className="resize-none text-sm leading-relaxed border-border bg-background flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        const ta = e.currentTarget;
                        const s = ta.selectionStart;
                        const en = ta.selectionEnd;
                        const nv = projectValue.substring(0, s) + '\t' + projectValue.substring(en);
                        setProjectValue(nv);
                        setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + 1; }, 0);
                      }
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleProjectSave();
                    }}
                  />
                </div>

                {/* Section 2: 任务详情 — fills remaining vertical space */}
                <div className="flex flex-col flex-1 min-h-0">
                  <label className="text-xs font-medium text-muted-foreground mb-1">任务详情</label>
                  <Textarea
                    value={taskValue}
                    onChange={(e) => setTaskValue(e.target.value)}
                    onBlur={handleTaskSave}
                    placeholder="本周完成的任务和工作内容..."
                    className="resize-none text-sm leading-relaxed border-border bg-background flex-1"
                    style={{ minHeight: '200px' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        const ta = e.currentTarget;
                        const s = ta.selectionStart;
                        const en = ta.selectionEnd;
                        const nv = taskValue.substring(0, s) + '\t' + taskValue.substring(en);
                        setTaskValue(nv);
                        setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + 1; }, 0);
                      }
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleTaskSave();
                    }}
                  />
                </div>

              </div>
            </Card>
          ) : (
            <Card className="p-8 flex flex-col items-center justify-center h-full min-h-[300px]">
              <NotebookPen className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground mb-4">本周还没有工作记录</p>
              <Button onClick={handleCreate}>
                <NotebookPen className="mr-2 h-4 w-4" /> 开始记录本周工作
              </Button>
            </Card>
          )}
        </div>

        {/* Right column: All records list (desktop only) */}
        <div className="overflow-y-auto hidden lg:block lg:border-l lg:border-border/40 lg:pl-4">
          <div className="sticky top-0 bg-background z-10 py-2 flex items-center gap-2 mb-2">
            <h2 className="text-sm font-semibold">全部记录</h2>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{workLogs.length}</Badge>
          </div>
          {workLogs.length > 0 ? (
            <div className="space-y-2">
              {currentWeek && recordRow(currentWeek, true)}
              {historyLogs.map((log) => recordRow(log, false))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <EmptyVault className="mb-3 h-16 w-16 opacity-40" />
              <p className="text-sm">还没有工作记录</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: All records below */}
      <div className="lg:hidden px-4 sm:px-6 pb-4 sm:pb-6">
        {workLogs.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-semibold">全部记录</h2>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{workLogs.length}</Badge>
            </div>
            <div className="space-y-2">
              {currentWeek && recordRow(currentWeek, true)}
              {historyLogs.map((log) => recordRow(log, false))}
            </div>
          </>
        )}
      </div>

      <WorkLogDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        workLogId={editId}
      />

      <WorkLogDetail
        workLogId={selectedId}
        open={detailOpen}
        onOpenChange={handleDetailClose}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm((p) => ({ ...p, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这条工作记录吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm({ open: false })}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              删除
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
