'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Pencil, Calendar, ListChecks, NotebookPen, ChevronRight } from 'lucide-react';
import { EmptyVault } from '@/components/ui/illustrations';
import { toast } from 'sonner';
import { getWorkLogs, deleteWorkLog, getOrCreateCurrentWeekWorkLog } from '@/actions/work-logs';
import { WorkLogDialog } from '@/components/vault/work-log-dialog';
import { WorkLogDetail } from '@/components/vault/work-log-detail';

interface WorkLogItem {
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
  items: WorkLogItem[];
  createdAt: Date;
  updatedAt: Date;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function formatDateFull(date: Date): string {
  return new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
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

  const { data: workLogs = [], refetch } = useQuery({
    queryKey: ['work-logs'],
    queryFn: getWorkLogs,
  });

  const currentWeek = workLogs.find((log) => isCurrentWeek(log.weekStart, log.weekEnd));
  const historyLogs = workLogs.filter((log) => !isCurrentWeek(log.weekStart, log.weekEnd));

  async function handleCreateCurrentWeek() {
    try {
      const id = await getOrCreateCurrentWeekWorkLog();
      setSelectedId(id);
      setDetailOpen(true);
      refetch();
    } catch {
      toast.error('创建本周记录失败');
    }
  }

  function handleCreate() {
    setEditId(null);
    setDialogOpen(true);
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
    await deleteWorkLog(deleteConfirm.id);
    toast.success('工作记录已删除');
    setDeleteConfirm({ open: false });
    setDetailOpen(false);
    refetch();
  }

  function handleDialogClose(open: boolean) {
    if (!open) {
      setDialogOpen(false);
      setEditId(null);
      refetch();
    }
  }

  function handleDetailClose(open: boolean) {
    if (!open) {
      setDetailOpen(false);
      refetch();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">工作记录</h1>
          <p className="text-muted-foreground">按周记录工作内容，任务完成自动同步</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> 新建周记录
          </Button>
          {!currentWeek && (
            <Button onClick={handleCreateCurrentWeek}>
              <NotebookPen className="mr-2 h-4 w-4" /> 创建本周记录
            </Button>
          )}
        </div>
      </div>

      {/* Current Week Panel */}
      {currentWeek ? (
        <Card className="p-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">本周工作记录</h2>
                <p className="text-sm text-muted-foreground">
                  {formatDateFull(currentWeek.weekStart)} ~ {formatDateFull(currentWeek.weekEnd)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleEdit(currentWeek.id)}>
                <Pencil className="mr-1 h-3 w-3" /> 编辑
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleViewDetail(currentWeek.id)}>
                查看详情 <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>

          {currentWeek.projectProgress && (
            <div className="mb-4 p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs font-medium text-muted-foreground mb-1">项目进度</p>
              <div className="text-sm whitespace-pre-wrap">{currentWeek.projectProgress}</div>
            </div>
          )}

          <div className="space-y-2">
            {currentWeek.items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">暂无工作条目，点击编辑添加</p>
            ) : (
              currentWeek.items.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-2 py-1 ${item.isCancelled ? 'opacity-50' : ''}`}
                >
                  <span className="text-sm text-muted-foreground w-6 text-right shrink-0">{idx + 1}.</span>
                  <span className={`text-sm ${item.isCancelled ? 'line-through' : ''}`}>
                    {item.content}
                  </span>
                  {item.sourceTaskId && (
                    <Badge variant="secondary" className="text-xs ml-auto shrink-0">任务同步</Badge>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span>共 {currentWeek.items.length} 条</span>
            <span>更新于 {getRelativeTime(currentWeek.updatedAt)}</span>
          </div>
        </Card>
      ) : (
        <Card className="p-8 flex flex-col items-center justify-center">
          <NotebookPen className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground mb-4">本周还没有工作记录</p>
          <Button onClick={handleCreateCurrentWeek}>
            <Plus className="mr-2 h-4 w-4" /> 创建本周记录
          </Button>
        </Card>
      )}

      {/* History */}
      {historyLogs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">历史记录</h2>
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
            {historyLogs.map((log) => (
              <Card
                key={log.id}
                className="cursor-pointer p-4 transition-all hover:bg-muted/50 hover:shadow-sm hover:scale-[1.005]"
                onClick={() => handleViewDetail(log.id)}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {formatDate(log.weekStart)} ~ {formatDate(log.weekEnd)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{getRelativeTime(log.updatedAt)}</span>
                  </div>

                  {log.projectProgress && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{log.projectProgress}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ListChecks className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{log.items.length} 条</span>
                      {log.items.filter(i => i.isCancelled).length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({log.items.filter(i => i.isCancelled).length} 条已取消)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(log.id);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(log.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {workLogs.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-16">
          <EmptyVault className="mb-4 h-24 w-24 text-muted-foreground/40" />
          <p className="text-muted-foreground mb-4">还没有工作记录</p>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> 新建周记录
          </Button>
        </Card>
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
