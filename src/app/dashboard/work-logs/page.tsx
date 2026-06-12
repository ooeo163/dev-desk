'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Plus, Trash2, Pencil, Calendar, NotebookPen, X, MoreVertical, Eye } from 'lucide-react';
import { EmptyVault } from '@/components/ui/illustrations';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  getWorkLogs,
  deleteWorkLog,
  getOrCreateCurrentWeekWorkLog,
  updateWorkLog,
  addWorkLogItem,
  updateWorkLogItem,
  deleteWorkLogItem,
} from '@/actions/work-logs';
import { WorkLogDialog } from '@/components/vault/work-log-dialog';
import { WorkLogDetail } from '@/components/vault/work-log-detail';

interface WorkLogItem {
  id: string;
  content: string;
  isCancelled: boolean;
  sortOrder: number;
  sourceTaskId: string | null;
}

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

function getRelativeTime(date: Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
  return `${Math.floor(diffDays / 30)}月前`;
}

export default function WorkLogsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: string }>({ open: false });
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  // Inline editing state
  const [editingProgress, setEditingProgress] = useState(false);
  const [progressValue, setProgressValue] = useState('');
  const [editingItems, setEditingItems] = useState<WorkLogItem[]>([]);
  const [newItemContent, setNewItemContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const addItemInputRef = useRef<HTMLTextAreaElement>(null);

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

  // Refetch when page becomes visible (catches task→worklog sync updates)
  const pathname = usePathname();
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        invalidate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [invalidate]);

  // Refetch on SPA navigation back to this page
  useEffect(() => {
    if (pathname === '/dashboard/work-logs') {
      invalidate();
    }
  }, [pathname, invalidate]);

  useEffect(() => {
    if (editingLog) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local editing state with server data
      setProgressValue(editingLog.projectProgress ?? '');
      setEditingItems([...editingLog.items]);
      setShowAddInput(false);
      setEditingProgress(false);
    }
  }, [editingLog]);

  async function handleProgressSave() {
    if (!editingLog) return;
    setEditingProgress(false);
    setSaving(true);
    try {
      await updateWorkLog(editingLog.id, { projectProgress: progressValue });
      invalidate();
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleItemContentChange(id: string, content: string) {
    setEditingItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, content } : item))
    );
    setSaving(true);
    try {
      await updateWorkLogItem(id, { content });
      invalidate();
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleItemToggleCancel(id: string) {
    const item = editingItems.find((i) => i.id === id);
    if (!item) return;
    const newCancelled = !item.isCancelled;
    setEditingItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isCancelled: newCancelled } : i))
    );
    setSaving(true);
    try {
      await updateWorkLogItem(id, { isCancelled: newCancelled });
      invalidate();
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleItemDelete(id: string) {
    setEditingItems((prev) => prev.filter((i) => i.id !== id));
    setSaving(true);
    try {
      await deleteWorkLogItem(id);
      invalidate();
    } catch {
      toast.error('删除失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddItem() {
    if (!editingLog || !newItemContent.trim()) return;
    const content = newItemContent.trim();
    setSaving(true);
    try {
      const result = await addWorkLogItem(editingLog.id, { content });
      if (result.success) {
        setNewItemContent('');
        invalidate();
      } else {
        toast.error('添加失败');
      }
    } catch {
      toast.error('添加失败');
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

  // Record card for the list (right panel)
  const recordRow = (log: typeof workLogs[number], isCurrent: boolean) => {
    const isSelected = (editingLogId === log.id) || (!editingLogId && isCurrent);
    const activeItems = log.items.filter((i) => !i.isCancelled);
    const cancelledItems = log.items.filter((i) => i.isCancelled);
    return (
      <div
        key={log.id}
        className={cn(
          'rounded-lg cursor-pointer transition-colors',
          'hover:bg-muted/40',
          isCurrent && !isSelected && 'bg-muted/20',
          isSelected && 'bg-muted/50 ring-1 ring-foreground/[0.12]'
        )}
        onClick={() => setEditingLogId(log.id === editingLogId ? null : log.id)}
      >
        {/* Row header */}
        <div className="flex items-center gap-2 py-2 px-3">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className="text-xs font-medium shrink-0">{formatDateRange(log.weekStart, log.weekEnd)}</span>
            {isCurrent && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">本周</Badge>}
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">{log.items.length}条</Badge>
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
        {/* Progress preview */}
        {log.projectProgress && (
          <div className="px-3 pb-1.5">
            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{log.projectProgress}</p>
          </div>
        )}
        {/* Items preview */}
        {activeItems.length > 0 && (
          <div className="px-3 pb-2 space-y-px">
            {activeItems.map((item, idx) => (
              <div key={item.id} className="flex items-start gap-1.5 py-0.5 text-[11px] leading-snug">
                <span className="text-muted-foreground/50 w-3.5 text-right shrink-0 tabular-nums">{idx + 1}.</span>
                <span className="text-foreground/70 truncate">{item.content}</span>
              </div>
            ))}
            {cancelledItems.length > 0 && (
              <div className="text-[10px] text-muted-foreground/40 pt-0.5">
                另有 {cancelledItems.length} 条已取消
              </div>
            )}
          </div>
        )}
        {activeItems.length === 0 && cancelledItems.length === 0 && (
          <div className="px-3 pb-2">
            <span className="text-[11px] text-muted-foreground/50">暂无条目</span>
          </div>
        )}
      </div>
    );
  };

  const recordsList = (
    <div className="space-y-2">
      {currentWeek && recordRow(currentWeek, true)}
      {historyLogs.map((log) => recordRow(log, false))}
    </div>
  );

  return (
    <div className="flex flex-col h-full -m-4 sm:-m-6">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">工作记录</h1>
          <p className="text-sm text-muted-foreground">按周记录工作内容，任务完成自动同步</p>
        </div>
        <Button onClick={handleCreate}>
          <NotebookPen className="mr-2 h-4 w-4" /> 新建记录
        </Button>
      </div>

      {/* Main body — left-right split on desktop */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-4 px-4 sm:px-6 pb-4 sm:pb-6">
        {/* Left column: Editing panel */}
        <div className="overflow-y-auto lg:pr-2">
          {editingLog ? (
            <Card className="border border-foreground/[0.12] ring-0 shadow-sm bg-card overflow-hidden p-0" data-current-week>
              {/* Panel Header — 卡纸头样式 */}
              <div className="flex items-center justify-between px-7 py-4 bg-muted/60 border-b border-foreground/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 shadow-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold">
                      {editingLogId && editingLog && !isCurrentWeek(editingLog.weekStart, editingLog.weekEnd)
                        ? '工作记录详情'
                        : '本周工作记录'}
                    </h2>
                    <p
                      className="text-xs text-muted-foreground cursor-pointer hover:underline decoration-dotted underline-offset-4"
                      onClick={() => handleViewDetail(editingLog!.id)}
                    >
                      {formatDateRange(editingLog!.weekStart, editingLog!.weekEnd)}
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    'text-xs text-muted-foreground flex items-center gap-1 transition-all duration-300',
                    saving ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'
                  )}
                >
                  <div className="h-3 w-3 rounded-full bg-primary/40 animate-pulse" />
                  已自动保存
                </div>
              </div>

              {/* Card Body */}
              <div className="px-7 py-5 space-y-4">

              {/* Project Progress */}
              <div className="p-4 rounded-lg bg-muted/40 group/progress">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">项目进度</p>
                  <div className="h-6 w-14 flex items-center justify-end">
                    {!editingProgress && (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200
                                   opacity-0 group-hover/progress:opacity-100 inline-flex items-center gap-1"
                        onClick={() => setEditingProgress(true)}
                      >
                        <Pencil className="h-3 w-3" /> 编辑
                      </button>
                    )}
                  </div>
                </div>
                <Textarea
                  value={progressValue}
                  onChange={(e) => setProgressValue(e.target.value)}
                  onFocus={() => setEditingProgress(true)}
                  onBlur={() => {
                    if (editingProgress) handleProgressSave();
                  }}
                  placeholder="点击添加项目进度..."
                  readOnly={!editingProgress}
                  rows={editingProgress ? 4 : 2}
                  className={cn(
                    'transition-all duration-300 resize-none text-sm leading-relaxed',
                    !editingProgress && 'border-transparent bg-transparent shadow-none cursor-pointer hover:bg-muted/30 overflow-hidden',
                    editingProgress && 'bg-background border-border'
                  )}
                  tabIndex={editingProgress ? 0 : -1}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      const textarea = e.currentTarget;
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const newValue = progressValue.substring(0, start) + '\t' + progressValue.substring(end);
                      setProgressValue(newValue);
                      setTimeout(() => {
                        textarea.selectionStart = textarea.selectionEnd = start + 1;
                      }, 0);
                    }
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      handleProgressSave();
                    }
                    if (e.key === 'Escape') {
                      setEditingProgress(false);
                      setProgressValue(editingLog?.projectProgress ?? '');
                    }
                  }}
                />
              </div>

              {/* Work Items */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">工作条目</p>
                <div>
                {editingItems.length === 0 && !showAddInput ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    暂无工作条目，在下方添加
                  </p>
                ) : (
                  editingItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-start gap-3 group/item py-1.5 px-4 -mx-5',
                        'transition-all duration-200 hover:bg-muted/40',
                        idx % 2 === 0 ? 'bg-transparent' : 'bg-muted/20',
                        item.isCancelled && 'opacity-50'
                      )}
                    >
                      <span className="text-xs text-muted-foreground/60 w-4 text-right shrink-0 tabular-nums mt-0.5">
                        {idx + 1}.
                      </span>
                      <textarea
                        value={item.content}
                        onChange={(e) => {
                          const newContent = e.target.value;
                          setEditingItems((prev) =>
                            prev.map((i) => (i.id === item.id ? { ...i, content: newContent } : i))
                          );
                        }}
                        onBlur={(e) => handleItemContentChange(item.id, e.target.value)}
                        rows={1}
                        className={cn(
                          'flex-1 min-w-0 bg-transparent border-none outline-none text-sm resize-none',
                          'focus:outline-none focus:ring-0 py-0.5 leading-relaxed',
                          item.isCancelled && 'line-through text-muted-foreground'
                        )}
                        style={{ minHeight: '1.5rem', height: 'auto', overflow: 'hidden' }}
                        ref={(el) => {
                          if (!el) return;
                          el.style.height = 'auto';
                          el.style.height = el.scrollHeight + 'px';
                          const obs = new MutationObserver(() => {
                            el.style.height = 'auto';
                            el.style.height = el.scrollHeight + 'px';
                          });
                          obs.observe(el, { attributes: true, attributeFilter: ['value'] });
                        }}
                        onInput={(e) => {
                          const el = e.currentTarget;
                          el.style.height = 'auto';
                          el.style.height = el.scrollHeight + 'px';
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            const ta = e.currentTarget;
                            const s = ta.selectionStart;
                            const en = ta.selectionEnd;
                            const nv = item.content.substring(0, s) + '\t' + item.content.substring(en);
                            setEditingItems((prev) =>
                              prev.map((i) => (i.id === item.id ? { ...i, content: nv } : i))
                            );
                            setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + 1; }, 0);
                          }
                        }}
                      />
                      <div className={cn(
                        'flex items-center gap-1 shrink-0',
                        'opacity-0 scale-75 group-hover/item:opacity-100 group-hover/item:scale-100',
                        'transition-all duration-200'
                      )}>
                        <button
                          type="button"
                          onClick={() => handleItemToggleCancel(item.id)}
                          className={cn(
                            'h-6 px-1.5 flex items-center justify-center rounded-md text-xs',
                            'transition-colors duration-200',
                            item.isCancelled
                              ? 'text-foreground hover:bg-muted'
                              : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted'
                          )}
                          title={item.isCancelled ? '恢复' : '标记取消'}
                        >
                          {item.isCancelled ? '恢复' : '取消'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleItemDelete(item.id)}
                          className={cn(
                            'h-6 w-6 flex items-center justify-center rounded-md',
                            'text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10',
                            'transition-colors duration-200'
                          )}
                          title="删除"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}

                {/* Add new item */}
                {showAddInput ? (
                  <div className="mt-3 animate-[item-enter_0.2s_ease-out]">
                    <Textarea
                      ref={addItemInputRef}
                      value={newItemContent}
                      onChange={(e) => setNewItemContent(e.target.value)}
                      placeholder="输入工作条目，回车添加，Shift+回车换行..."
                      rows={1}
                      className="text-sm resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          const ta = e.currentTarget;
                          const s = ta.selectionStart;
                          const en = ta.selectionEnd;
                          const nv = newItemContent.substring(0, s) + '\t' + newItemContent.substring(en);
                          setNewItemContent(nv);
                          setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + 1; }, 0);
                        }
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddItem();
                        }
                        if (e.key === 'Escape') {
                          setShowAddInput(false);
                          setNewItemContent('');
                        }
                      }}
                      onBlur={() => {
                        if (!newItemContent.trim()) {
                          setShowAddInput(false);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddInput(true);
                      setTimeout(() => addItemInputRef.current?.focus(), 50);
                    }}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground
                               transition-colors mt-2 py-1.5 px-4 -mx-5 rounded-md hover:bg-muted/40 w-full"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    添加条目
                  </button>
                )}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-foreground/[0.06] flex items-center justify-between text-xs text-muted-foreground">
                <span>共 {editingItems.length} 条</span>
                <span>更新于 {getRelativeTime(editingLog.updatedAt)}</span>
              </div>

              </div>{/* end card body */}
            </Card>
          ) : (
            <Card className="p-8 flex flex-col items-center justify-center h-full min-h-[300px]">
              <NotebookPen className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground mb-4">本周还没有工作记录</p>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" /> 开始记录本周工作
              </Button>
            </Card>
          )}
        </div>

        {/* Right column: All records list (desktop only) */}
        <div className="overflow-y-auto hidden lg:block lg:border-l lg:border-foreground/[0.08] lg:pl-4">
          <div className="sticky top-0 bg-background z-10 py-2 flex items-center gap-2 border-b border-foreground/[0.06] mb-2">
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
            {recordsList}
          </>
        )}
      </div>

      {/* Global empty state — only when no records at all and no current week */}
      {workLogs.length === 0 && !currentWeek && (
        <div className="lg:hidden flex flex-col items-center justify-center py-8">
          <Button size="sm" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> 开始记录本周工作
          </Button>
        </div>
      )}

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
