'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Plus, MoreVertical, Trash2, Pencil } from 'lucide-react';
import { EmptyTodo, EmptyInProgress, EmptyDone } from '@/components/ui/illustrations';
import { toast } from 'sonner';
import { getTasks, updateTaskStatus, deleteTask } from '@/actions/tasks';
import { TaskDialog } from '@/components/vault/task-dialog';
import { TaskDetail } from '@/components/vault/task-detail';
import { Pagination } from '@/components/ui/pagination';
import type { TaskStatus } from '@/lib/validation';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; color: string }> = {
  todo: { label: '待办', color: 'bg-amber-500' },
  in_progress: { label: '进行中', color: 'bg-blue-500' },
  done: { label: '已完成', color: 'bg-green-500' },
};

const statusOrder = ['todo', 'in_progress', 'done'] as const;

const priorityLabels = ['无', '低', '中', '高'];
const priorityColors = ['', 'bg-gray-400', 'bg-amber-500', 'bg-red-500'];

type TaskItem = {
  id: string; title: string; description: string | null;
  status: string | null; priority: number | null;
  credentialId: string | null; credentialTitle: string | null; createdAt: Date;
};

function DroppableColumn({ statusKey, children }: { statusKey: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: statusKey });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'space-y-2 flex-1 min-h-0 rounded-lg transition-all duration-150 p-1 -m-1 overflow-y-auto',
        isOver && 'bg-primary/10 ring-2 ring-primary/30 scale-[1.005]'
      )}
    >
      {children}
    </div>
  );
}

function DraggableCard({ task, children, onClick }: { task: TaskItem; children: React.ReactNode; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative transition-all duration-150',
        isDragging && 'opacity-30'
      )}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
    >
      <Card
        className={cn(
          'cursor-pointer p-3 transition-colors hover:bg-muted/50',
          isDragging && 'border-dashed border-primary/40'
        )}
        onClick={onClick}
        {...attributes}
        {...listeners}
      >
        {children}
      </Card>
    </div>
  );
}

function TaskCardContent({ task }: { task: TaskItem }) {
  return (
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">{task.title}</p>
        {(task.priority ?? 0) > 0 && (
          <Badge variant="outline" className="text-xs gap-1">
            <span className={`h-2 w-2 rounded-full ${priorityColors[task.priority ?? 0]}`} />
            {priorityLabels[task.priority ?? 0]}
          </Badge>
        )}
      </div>
      {task.description && (
        <>
          <div className="border-b border-border/50" />
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description.replace(/<[^>]+>/g, '')}
          </p>
        </>
      )}
    </div>
  );
}

export default function TasksPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: string; fromDetail?: boolean }>({ open: false });
  const [editTask, setEditTask] = useState<{
    id: string; title: string; description: string | null;
    status: string; priority: number; credentialId: string | null;
  } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [highlightStatus, setHighlightStatus] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<string>('todo');
  const [pages, setPages] = useState({
    todo: 1,
    in_progress: 1,
    done: 1
  });
  const pageSize = 20;
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  // 乐观更新 mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateTaskStatus(id, status),
    onMutate: async ({ id, status }) => {
      // 取消正在进行的查询，防止覆盖乐观更新
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      // 保存所有状态列的之前数据
      const previousTodo = queryClient.getQueryData(['tasks', 'todo', pages.todo]);
      const previousInProgress = queryClient.getQueryData(['tasks', 'in_progress', pages.in_progress]);
      const previousDone = queryClient.getQueryData(['tasks', 'done', pages.done]);

      // 找到任务所在的源状态列
      const sourceStatus = allTasks.find(t => t.id === id)?.status;

      // 乐观更新：从源状态列移除任务
      if (sourceStatus) {
        queryClient.setQueryData(['tasks', sourceStatus, pages[sourceStatus as keyof typeof pages]], (old: { data: TaskItem[]; total: number } | undefined) => {
          if (!old) return old;
          return { ...old, data: old.data.filter((t: TaskItem) => t.id !== id), total: old.total - 1 };
        });
      }

      // 乐观更新：添加任务到目标状态列
      const task = allTasks.find(t => t.id === id);
      if (task) {
        queryClient.setQueryData(['tasks', status, pages[status as keyof typeof pages]], (old: { data: TaskItem[]; total: number } | undefined) => {
          if (!old) return old;
          const updatedTask = { ...task, status };
          return { ...old, data: [updatedTask, ...old.data], total: old.total + 1 };
        });
      }

      // 更新选中的任务
      setSelectedTask((prev) => prev && prev.id === id ? { ...prev, status: status as TaskStatus } : prev);

      return { previousTodo, previousInProgress, previousDone, sourceStatus };
    },
    onError: (err, variables, context) => {
      // 回滚到之前的状态
      if (context?.previousTodo) {
        queryClient.setQueryData(['tasks', 'todo', pages.todo], context.previousTodo);
      }
      if (context?.previousInProgress) {
        queryClient.setQueryData(['tasks', 'in_progress', pages.in_progress], context.previousInProgress);
      }
      if (context?.previousDone) {
        queryClient.setQueryData(['tasks', 'done', pages.done], context.previousDone);
      }
      toast.error('状态更新失败');
    },
    onSettled: () => {
      // 重新获取数据以确保一致性
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const { data: todoData, refetch: refetchTodo } = useQuery({
    queryKey: ['tasks', 'todo', pages.todo],
    queryFn: () => getTasks({ status: 'todo', page: pages.todo, pageSize }),
  });

  const { data: inProgressData, refetch: refetchInProgress } = useQuery({
    queryKey: ['tasks', 'in_progress', pages.in_progress],
    queryFn: () => getTasks({ status: 'in_progress', page: pages.in_progress, pageSize }),
  });

  const { data: doneData, refetch: refetchDone } = useQuery({
    queryKey: ['tasks', 'done', pages.done],
    queryFn: () => getTasks({ status: 'done', page: pages.done, pageSize }),
  });

  const grouped = {
    todo: todoData?.data ?? [],
    in_progress: inProgressData?.data ?? [],
    done: doneData?.data ?? [],
  };

  const totals = {
    todo: todoData?.total ?? 0,
    in_progress: inProgressData?.total ?? 0,
    done: doneData?.total ?? 0,
  };

  const allTasks = useMemo(
    () => [...grouped.todo, ...grouped.in_progress, ...grouped.done],
    [grouped.todo, grouped.in_progress, grouped.done]
  );

  function refetchAll() {
    refetchTodo();
    refetchInProgress();
    refetchDone();
  }

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const action = searchParams.get('action');
    const detail = searchParams.get('detail');
    const status = searchParams.get('status');
    if (action === 'create') {
      setEditTask(null);
      setDialogOpen(true);
      router.replace('/dashboard/tasks');
    } else if (detail) {
      const task = allTasks.find((t) => t.id === detail);
      if (task) {
        setSelectedTask(task);
        setDetailOpen(true);
        router.replace('/dashboard/tasks');
      }
    } else if (status && ['todo', 'in_progress', 'done'].includes(status)) {
      setHighlightStatus(status);
      setMobileTab(status);
      router.replace('/dashboard/tasks');
      setTimeout(() => setHighlightStatus(null), 2000);
    }
  }, [searchParams, allTasks, router]);

  const activeTask = activeId ? allTasks.find((t) => t.id === activeId) ?? null : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const overId = String(over.id);

    let targetStatus: string;
    if (statusOrder.includes(overId as typeof statusOrder[number])) {
      targetStatus = overId;
    } else {
      const targetTask = allTasks.find((t) => t.id === overId);
      if (!targetTask) return;
      targetStatus = targetTask.status ?? 'todo';
    }

    const task = allTasks.find((t) => t.id === taskId);
    if (task && task.status !== targetStatus) {
      await handleStatusChange(taskId, targetStatus);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    statusMutation.mutate({ id, status });
  }

  function handleDelete(id: string) {
    setDeleteConfirm({ open: true, id });
  }

  function handleEdit(task: TaskItem) {
    setEditTask({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status ?? 'todo',
      priority: task.priority ?? 0,
      credentialId: task.credentialId,
    });
    setDetailOpen(false);
    setDialogOpen(true);
  }

  function handleCreate() {
    setEditTask(null);
    setDialogOpen(true);
  }

  function handleDialogClose(open: boolean) {
    if (!open) {
      setDialogOpen(false);
      setEditTask(null);
      refetchAll();
    }
  }

  function handleDetailClose(open: boolean) {
    if (!open) {
      setDetailOpen(false);
      refetchAll();
    }
  }

  function handleDetailDelete(id: string) {
    setDeleteConfirm({ open: true, id, fromDetail: true });
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">任务管理</h1>
          <p className="text-sm sm:text-base text-muted-foreground hidden sm:block">拖拽卡片可快速切换状态</p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> 新建任务
        </Button>
      </div>

      {/* Mobile Status Tabs */}
      <div className="flex gap-1 mb-4 lg:hidden rounded-lg bg-muted/50 p-1">
        {statusOrder.map((statusKey) => {
          const config = statusConfig[statusKey];
          const total = totals[statusKey];
          return (
            <button
              key={statusKey}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all',
                mobileTab === statusKey
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setMobileTab(statusKey)}
            >
              <div className={`h-2 w-2 rounded-full ${config.color}`} />
              {config.label}
              <Badge variant="secondary" className="text-xs h-5 min-w-[20px] px-1">{total}</Badge>
            </button>
          );
        })}
      </div>

      {/* Mobile List View */}
      <div className="flex-1 min-h-0 overflow-y-auto lg:hidden">
        {(() => {
          const items = grouped[mobileTab as keyof typeof grouped];
          const total = totals[mobileTab as keyof typeof totals];
          return (
            <div className="space-y-2">
              {items.length === 0 ? (
                <Card className="flex flex-col items-center justify-center py-12 gap-2">
                  {mobileTab === 'todo' && <EmptyTodo className="h-16 w-16 text-muted-foreground/30" />}
                  {mobileTab === 'in_progress' && <EmptyInProgress className="h-16 w-16 text-muted-foreground/30" />}
                  {mobileTab === 'done' && <EmptyDone className="h-16 w-16 text-muted-foreground/30" />}
                  <p className="text-sm text-muted-foreground mt-1">
                    {mobileTab === 'todo' && '没有待办事项'}
                    {mobileTab === 'in_progress' && '没有进行中的任务'}
                    {mobileTab === 'done' && '还没有完成的任务'}
                  </p>
                </Card>
              ) : (
                items.map((task) => (
                  <Card
                    key={task.id}
                    className="cursor-pointer p-4 transition-colors hover:bg-muted/50 active:bg-muted"
                    onClick={() => {
                      setSelectedTask(task);
                      setDetailOpen(true);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <TaskCardContent task={task} />
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" />}
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => handleEdit(task)}>
                            <Pencil className="mr-2 h-3 w-3" /> 编辑
                          </DropdownMenuItem>
                          {mobileTab !== 'todo' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'todo')}>
                              标记为待办
                            </DropdownMenuItem>
                          )}
                          {mobileTab !== 'in_progress' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'in_progress')}>
                              标记为进行中
                            </DropdownMenuItem>
                          )}
                          {mobileTab !== 'done' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'done')}>
                              标记为已完成
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(task.id)}
                          >
                            <Trash2 className="mr-2 h-3 w-3" /> 删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                ))
              )}
              <Pagination
                page={pages[mobileTab as keyof typeof pages]}
                total={total}
                pageSize={pageSize}
                onChange={(page) => setPages(prev => ({ ...prev, [mobileTab]: page }))}
                className="pt-3 mt-2 border-t"
              />
            </div>
          );
        })()}
      </div>

      {/* Desktop Kanban */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="hidden lg:flex flex-1 min-h-0 gap-6">
          {statusOrder.map((statusKey) => {
            const config = statusConfig[statusKey];
            const items = grouped[statusKey];
            const total = totals[statusKey];

            return (
              <div
                key={statusKey}
                className={cn(
                  'flex-1 min-h-0 space-y-3 flex flex-col rounded-lg transition-all duration-500',
                  highlightStatus === statusKey && 'ring-2 ring-primary/30 bg-primary/5'
                )}
              >
                <div className="flex items-center gap-2 px-1">
                  <div className={`h-2 w-2 rounded-full ${config.color}`} />
                  <h2 className="text-sm font-semibold">{config.label}</h2>
                  <Badge variant="secondary" className="text-xs">{total}</Badge>
                </div>

                <DroppableColumn statusKey={statusKey}>
                  {items.length === 0 ? (
                    <Card className="flex flex-col items-center justify-center py-8 gap-2">
                      {statusKey === 'todo' && <EmptyTodo className="h-14 w-14 text-muted-foreground/30" />}
                      {statusKey === 'in_progress' && <EmptyInProgress className="h-14 w-14 text-muted-foreground/30" />}
                      {statusKey === 'done' && <EmptyDone className="h-14 w-14 text-muted-foreground/30" />}
                      <p className="text-sm text-muted-foreground mt-1">
                        {statusKey === 'todo' && '没有待办事项'}
                        {statusKey === 'in_progress' && '没有进行中的任务'}
                        {statusKey === 'done' && '还没有完成的任务'}
                      </p>
                    </Card>
                  ) : (
                    items.map((task) => (
                      <DraggableCard
                        key={task.id}
                        task={task}
                        onClick={() => {
                          setSelectedTask(task);
                          setDetailOpen(true);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <TaskCardContent task={task} />
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={<Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" />}
                              onClick={(e: React.MouseEvent) => e.stopPropagation()}
                              onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-3 w-3" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => handleEdit(task)}>
                                <Pencil className="mr-2 h-3 w-3" /> 编辑
                              </DropdownMenuItem>
                              {statusKey !== 'todo' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'todo')}>
                                  标记为待办
                                </DropdownMenuItem>
                              )}
                              {statusKey !== 'in_progress' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'in_progress')}>
                                  标记为进行中
                                </DropdownMenuItem>
                              )}
                              {statusKey !== 'done' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'done')}>
                                  标记为已完成
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(task.id)}
                              >
                                <Trash2 className="mr-2 h-3 w-3" /> 删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </DraggableCard>
                    ))
                  )}
                </DroppableColumn>

                <Pagination
                  page={pages[statusKey]}
                  total={total}
                  pageSize={pageSize}
                  onChange={(page) => setPages(prev => ({ ...prev, [statusKey]: page }))}
                  className="mt-2 pt-2 border-t"
                />
              </div>
            );
          })}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <Card className="p-3 shadow-xl border-primary/20 bg-card w-72">
              <TaskCardContent task={activeTask} />
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskDialog open={dialogOpen} onOpenChange={handleDialogClose} task={editTask} />

      <TaskDetail
        task={selectedTask}
        open={detailOpen}
        onOpenChange={handleDetailClose}
        onEdit={handleEdit}
        onDelete={handleDetailDelete}
        onStatusChange={handleStatusChange}
      />

      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm((p) => ({ ...p, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个任务吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm({ open: false })}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteConfirm.id) return;
                await deleteTask(deleteConfirm.id);
                toast.success('任务已删除');
                if (deleteConfirm.fromDetail) setDetailOpen(false);
                setDeleteConfirm({ open: false });
                refetchAll();
              }}
            >
              删除
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
