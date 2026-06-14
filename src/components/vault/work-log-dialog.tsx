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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getWorkLogById, createWorkLog, updateWorkLog } from '@/actions/work-logs';

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
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function WorkLogDialog({ open, onOpenChange, workLogId }: WorkLogDialogProps) {
  const isEdit = !!workLogId;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const [projectProgress, setProjectProgress] = useState('');
  const [taskDetails, setTaskDetails] = useState('');

  useEffect(() => {
    if (open) {
      if (workLogId) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form state when dialog opens
        setLoading(true);
        getWorkLogById(workLogId)
          .then((data) => {
            if (data) {
              setWeekStart(formatDateInput(new Date(data.weekStart)));
              setWeekEnd(formatDateInput(new Date(data.weekEnd)));
              setProjectProgress(data.projectProgress ?? '');
              setTaskDetails(data.taskDetails ?? '');
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
        setTaskDetails('');
      }
    }
  }, [open, workLogId]);

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
          taskDetails: taskDetails || null,
        });
        toast.success('工作记录已更新');
      } else {
        const result = await createWorkLog({
          weekStart,
          weekEnd,
          projectProgress: projectProgress || undefined,
          taskDetails: taskDetails || undefined,
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
      <DialogContent className="max-h-[85vh] flex flex-col sm:max-w-2xl">
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
                        const monday = parseLocalDate(e.target.value);
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
                <Label htmlFor="project-progress">项目</Label>
                <Textarea
                  id="project-progress"
                  value={projectProgress}
                  onChange={(e) => setProjectProgress(e.target.value)}
                  placeholder="当前进行中的项目或模块..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-details">任务详情</Label>
                <Textarea
                  id="task-details"
                  value={taskDetails}
                  onChange={(e) => setTaskDetails(e.target.value)}
                  placeholder="本周完成的任务和工作内容..."
                  rows={6}
                />
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
