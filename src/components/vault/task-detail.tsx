'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; color: string }> = {
  todo: { label: '待办', color: 'bg-amber-500' },
  in_progress: { label: '进行中', color: 'bg-blue-500' },
  done: { label: '已完成', color: 'bg-green-500' },
};

const statusOrder = ['todo', 'in_progress', 'done'] as const;

const priorityLabels = ['无', '低', '中', '高'];
const priorityColors = ['', 'bg-gray-400', 'bg-amber-500', 'bg-red-500'];

interface TaskData {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: number | null;
  credentialId: string | null;
  credentialTitle: string | null;
  createdAt: Date;
}

interface TaskDetailProps {
  task: TaskData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (task: TaskData) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}

export function TaskDetail({ task, open, onOpenChange, onEdit, onDelete, onStatusChange }: TaskDetailProps) {
  if (!task) return null;

  const currentStatus = task.status ?? 'todo';
  const status = statusConfig[currentStatus] ?? statusConfig.todo;
  const priority = task.priority ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">{task.title}</DialogTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <span className={`h-2 w-2 rounded-full ${status.color}`} />
              {status.label}
            </Badge>
            {priority > 0 && (
              <Badge variant="outline" className="gap-1">
                <span className={`h-2 w-2 rounded-full ${priorityColors[priority]}`} />
                {priorityLabels[priority]}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <Separator />

        <div className="flex-1 flex flex-col space-y-1 min-h-0">
          <p className="text-sm font-medium text-muted-foreground shrink-0">描述</p>
          <div className="prose prose-sm dark:prose-invert flex-1 rounded-md border border-border p-3 overflow-y-auto min-h-0 max-w-none">
            {task.description ? (
              <div dangerouslySetInnerHTML={{ __html: task.description }} />
            ) : (
              <span className="text-muted-foreground">暂无描述</span>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">状态</p>
          <div className="flex gap-2 items-end">
            {statusOrder.map((s) => {
              const isActive = s === currentStatus;
              const cfg = statusConfig[s];
              return (
                <Button
                  key={s}
                  size={isActive ? 'sm' : 'xs'}
                  variant="outline"
                  className={cn(
                    isActive ? 'border-foreground/30' : 'text-muted-foreground/60 opacity-60'
                  )}
                  onClick={() => onStatusChange(task.id, s)}
                >
                  <span className={`mr-1 h-2 w-2 rounded-full ${cfg.color}`} />
                  {cfg.label}
                </Button>
              );
            })}
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(task)}>
              <Pencil className="mr-1 h-3 w-3" /> 编辑
            </Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete(task.id)}>
              <Trash2 className="mr-1 h-3 w-3" /> 删除
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            <p>创建: {new Date(task.createdAt).toLocaleString('zh-CN')}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
