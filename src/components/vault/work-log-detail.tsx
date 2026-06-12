'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface WorkLogItemData {
  id: string;
  content: string;
  isCancelled: boolean;
  sortOrder: number;
  sourceTaskId: string | null;
}

interface WorkLogData {
  id: string;
  weekStart: Date;
  weekEnd: Date;
  projectProgress: string | null;
  items: WorkLogItemData[];
  createdAt: Date;
  updatedAt: Date;
}

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
  const [data, setData] = useState<WorkLogData | null>(null);

  useEffect(() => {
    if (open && workLogId) {
      setData(null);
      setLoading(true);
      getWorkLogById(workLogId)
        .then((result) => {
          if (result) setData(result as unknown as WorkLogData);
        })
        .catch(() => toast.error('加载失败'))
        .finally(() => setLoading(false));
    }
  }, [open, workLogId]);

  const activeItems = data?.items.filter((item) => !item.isCancelled) ?? [];
  const cancelledItems = data?.items.filter((item) => item.isCancelled) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {data ? `${formatDateFull(data.weekStart)} ~ ${formatDateFull(data.weekEnd)}` : '工作记录详情'}
          </DialogTitle>
          <DialogDescription>
            {data && `共 ${data.items.length} 条工作条目`}
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
                <p className="text-sm font-medium text-muted-foreground">项目进度</p>
                <div className="rounded-md border border-border p-3 text-sm whitespace-pre-wrap bg-muted/30">
                  {data.projectProgress}
                </div>
              </div>
            )}

            {activeItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">工作条目</p>
                <div className="space-y-1">
                  {activeItems.map((item, idx) => (
                    <div key={item.id} className="flex items-start gap-2 py-1">
                      <span className="text-sm text-muted-foreground w-6 text-right shrink-0">{idx + 1}.</span>
                      <span className="text-sm">{item.content}</span>
                      {item.sourceTaskId && (
                        <Badge variant="secondary" className="text-xs ml-auto shrink-0">任务同步</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cancelledItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">已取消</p>
                <div className="space-y-1">
                  {cancelledItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-2 py-1 opacity-50">
                      <span className="text-sm line-through">{item.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.items.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">暂无工作条目</p>
            )}

            <Separator />

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(data.id)}>
                <Pencil className="mr-1 h-3 w-3" /> 编辑
              </Button>
              <Button variant="destructive" size="sm" className="ml-auto" onClick={() => onDelete(data.id)}>
                <Trash2 className="mr-1 h-3 w-3" /> 删除
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>创建: {new Date(data.createdAt).toLocaleString('zh-CN')}</p>
              <p>更新: {new Date(data.updatedAt).toLocaleString('zh-CN')}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
