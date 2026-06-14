'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Pencil, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { getWorkLogById } from '@/actions/work-logs';

interface WorkLogDetailProps {
  workLogId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatDateFull(date: Date): string {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
}

export function WorkLogDetail({ workLogId, open, onOpenChange, onEdit, onDelete }: WorkLogDetailProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    id: string;
    weekStart: Date;
    weekEnd: Date;
    projectProgress: string | null;
    taskDetails: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null>(null);

  useEffect(() => {
    if (open && workLogId) {
      setData(null);
      setLoading(true);
      getWorkLogById(workLogId)
        .then((result) => {
          if (result) setData(result);
        })
        .catch(() => toast.error('加载失败'))
        .finally(() => setLoading(false));
    }
  }, [open, workLogId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {data ? `${formatDateFull(data.weekStart)} ~ ${formatDateFull(data.weekEnd)}` : '工作记录详情'}
          </DialogTitle>
          <DialogDescription>
            工作记录详情
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {data && !loading && (
          <div className="space-y-4">
            {data.projectProgress && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">项目</p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {data.projectProgress}
                </p>
              </div>
            )}

            {data.taskDetails && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">任务详情</p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {data.taskDetails}
                </p>
              </div>
            )}

            {!data.projectProgress && !data.taskDetails && (
              <p className="text-sm text-muted-foreground text-center py-4">暂无内容</p>
            )}

            <Separator />

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(data.id)}>
                <Pencil className="mr-1 h-3 w-3" /> 编辑
              </Button>
              <Button variant="ghost" size="sm" className="ml-auto text-destructive" onClick={() => onDelete(data.id)}>
                <Trash2 className="mr-1 h-3 w-3" /> 删除
              </Button>
            </div>

            <div className="text-xs text-muted-foreground/60 pt-2 border-t space-y-0.5">
              <p>创建: {new Date(data.createdAt).toLocaleString('zh-CN')}</p>
              <p>更新: {new Date(data.updatedAt).toLocaleString('zh-CN')}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
