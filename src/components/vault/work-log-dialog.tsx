'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Plus, X, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { getWorkLogById, createWorkLog, updateWorkLog, addWorkLogItem, deleteWorkLogItem } from '@/actions/work-logs';

interface WorkLogItemData {
  id: string;
  content: string;
  isCancelled: boolean;
  sortOrder: number;
  sourceTaskId: string | null;
}

interface WorkLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workLogId?: string | null;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getSunday(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatDateInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function WorkLogDialog({ open, onOpenChange, workLogId }: WorkLogDialogProps) {
  const isEdit = !!workLogId;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const [projectProgress, setProjectProgress] = useState('');
  const [items, setItems] = useState<WorkLogItemData[]>([]);
  const [newItemContent, setNewItemContent] = useState('');

  useEffect(() => {
    if (open) {
      if (workLogId) {
        setLoading(true);
        getWorkLogById(workLogId)
          .then((data) => {
            if (data) {
              setWeekStart(formatDateInput(new Date(data.weekStart)));
              setWeekEnd(formatDateInput(new Date(data.weekEnd)));
              setProjectProgress(data.projectProgress ?? '');
              setItems(data.items as WorkLogItemData[]);
            }
          })
          .catch(() => toast.error('加载失败'))
          .finally(() => setLoading(false));
      } else {
        const monday = getMonday(new Date());
        const sunday = getSunday(monday);
        setWeekStart(formatDateInput(monday));
        setWeekEnd(formatDateInput(sunday));
        setProjectProgress('');
        setItems([]);
      }
      setNewItemContent('');
    }
  }, [open, workLogId]);

  function handleAddItem() {
    const content = newItemContent.trim();
    if (!content) return;
    setItems((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        content,
        isCancelled: false,
        sortOrder: prev.length,
        sourceTaskId: null,
      },
    ]);
    setNewItemContent('');
  }

  function handleRemoveItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function handleToggleCancel(id: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isCancelled: !item.isCancelled } : item
      )
    );
  }

  function handleItemContentChange(id: string, content: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, content } : item
      )
    );
  }

  function handleMoveItem(fromIndex: number, toIndex: number) {
    setItems((prev) => {
      const newItems = [...prev];
      const [moved] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, moved);
      return newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!weekStart || !weekEnd) {
      toast.error('请选择日期范围');
      return;
    }

    setSaving(true);

    try {
      if (isEdit) {
        await updateWorkLog(workLogId, {
          weekStart,
          weekEnd,
          projectProgress: projectProgress || null,
        });

        const existing = await getWorkLogById(workLogId);
        const existingIds = new Set(existing?.items.map((i) => i.id) ?? []);
        const currentIds = new Set(items.filter((i) => !i.id.startsWith('temp-')).map((i) => i.id));

        for (const id of existingIds) {
          if (!currentIds.has(id)) {
            await deleteWorkLogItem(id);
          }
        }

        for (const item of items) {
          if (item.id.startsWith('temp-')) {
            await addWorkLogItem(workLogId, { content: item.content, isCancelled: item.isCancelled });
          }
        }

        toast.success('工作记录已更新');
      } else {
        const result = await createWorkLog({
          weekStart,
          weekEnd,
          projectProgress: projectProgress || undefined,
          items: items.map((item) => ({ content: item.content })),
        });

        if (result.success) {
          toast.success('工作记录已创建');
        } else {
          toast.error(result.error || '创建失败');
        }
      }
      onOpenChange(false);
    } catch {
      toast.error('操作失败，请重试');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[85vh] flex flex-col sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEdit ? '编辑工作记录' : '新建工作记录'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '修改工作记录信息' : '填写本周工作内容'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="week-start">周一开始日期 *</Label>
                  <Input
                    id="week-start"
                    type="date"
                    value={weekStart}
                    onChange={(e) => {
                      setWeekStart(e.target.value);
                      if (e.target.value) {
                        const monday = new Date(e.target.value);
                        setWeekEnd(formatDateInput(getSunday(monday)));
                      }
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="week-end">周日结束日期 *</Label>
                  <Input
                    id="week-end"
                    type="date"
                    value={weekEnd}
                    onChange={(e) => setWeekEnd(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-progress">项目进度</Label>
                <Textarea
                  id="project-progress"
                  value={projectProgress}
                  onChange={(e) => setProjectProgress(e.target.value)}
                  placeholder="当前进行中的项目或模块状态..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>工作条目</Label>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-2 group ${item.isCancelled ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-grab"
                          disabled={idx === 0}
                          onClick={() => handleMoveItem(idx, idx - 1)}
                        >
                          <GripVertical className="h-3 w-3" />
                        </button>
                        <span className="text-xs text-muted-foreground w-5 text-right">{idx + 1}</span>
                      </div>
                      <Input
                        value={item.content}
                        onChange={(e) => handleItemContentChange(item.id, e.target.value)}
                        className={`flex-1 ${item.isCancelled ? 'line-through' : ''}`}
                        disabled={!!item.sourceTaskId}
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={item.isCancelled ? '恢复' : '标记取消'}
                          onClick={() => handleToggleCancel(item.id)}
                        >
                          <span className={`text-xs ${item.isCancelled ? 'text-green-500' : 'text-muted-foreground'}`}>
                            {item.isCancelled ? '恢复' : '取消'}
                          </span>
                        </Button>
                        {!item.sourceTaskId && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={newItemContent}
                    onChange={(e) => setNewItemContent(e.target.value)}
                    placeholder="输入新的工作条目..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddItem();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={handleAddItem} disabled={!newItemContent.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="shrink-0 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button type="submit" disabled={saving || !weekStart || !weekEnd}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  isEdit ? '保存修改' : '创建记录'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
