'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createTask, updateTask } from '@/actions/tasks';

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: number;
    credentialId: string | null;
  } | null;
}

const statusOptions = [
  { value: 'todo', label: '待办' },
  { value: 'in_progress', label: '进行中' },
  { value: 'done', label: '已完成' },
];

const priorityOptions = [
  { value: 0, label: '无', color: '' },
  { value: 1, label: '低', color: 'bg-gray-400' },
  { value: 2, label: '中', color: 'bg-amber-500' },
  { value: 3, label: '高', color: 'bg-red-500' },
];

export function TaskDialog({ open, onOpenChange, task }: TaskDialogProps) {
  const isEdit = !!task;
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState(0);

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? '');
      setDescription(task?.description ?? '');
      setStatus(task?.status ?? 'todo');
      setPriority(task?.priority ?? 0);
      setLoading(false);
    }
  }, [open, task]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const input = isEdit
      ? { title, description: description || null, status, priority }
      : { title, description: description || undefined, status, priority };

    try {
      let result;
      if (isEdit && task) {
        result = await updateTask(task.id, input);
      } else {
        result = await createTask(input);
      }

      if (result.success) {
        toast.success(isEdit ? '任务已更新' : '任务已创建');
        onOpenChange(false);
      } else {
        toast.error(result.error || '操作失败');
      }
    } catch {
      toast.error('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl min-h-[60vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">{isEdit ? '编辑任务' : '新建任务'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '修改任务信息' : '创建新任务'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">标题 *</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="任务标题"
              required
            />
          </div>

          <div className="flex-1 flex flex-col space-y-2 min-h-0">
            <Label>描述</Label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              className="flex-1 flex flex-col min-h-0 [&_.tiptap]:flex-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-status">状态</Label>
              <select
                id="task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-priority">优先级</Label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                {priorityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={loading || !title}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 保存中...</>
              ) : isEdit ? '保存修改' : '创建任务'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
