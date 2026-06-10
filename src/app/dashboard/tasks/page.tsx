'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { toast } from 'sonner';
import { getTasks, updateTaskStatus, deleteTask } from '@/actions/tasks';
import { TaskDialog } from '@/components/vault/task-dialog';
import { TaskDetail } from '@/components/vault/task-detail';
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
        'space-y-2 min-h-[80px] rounded-lg transition-colors p-1 -m-1',
        isOver && 'bg-primary/5 ring-1 ring-primary/20'
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
        'transition-opacity',
        isDragging && 'opacity-40'
      )}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
    >
      <Card
        className="cursor-pointer p-3 transition-colors hover:bg-muted/50"
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
    <div className="flex items-start justify-between">
      <div className="flex-1 space-y-1">
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
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description.replace(/<[^>]+>/g, '')}
          </p>
        )}
      </div>
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const { data: tasks = [], refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => getTasks(),
  });

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const action = searchParams.get('action');
    const detail = searchParams.get('detail');
    if (action === 'create') {
      setEditTask(null);
      setDialogOpen(true);
      router.replace('/dashboard/tasks');
    } else if (detail) {
      const task = tasks.find((t) => t.id === detail);
      if (task) {
        setSelectedTask(task);
        setDetailOpen(true);
        router.replace('/dashboard/tasks');
      }
    }
  }, [searchParams, tasks, router]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) ?? null : null;

  const grouped = {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    done: tasks.filter((t) => t.status === 'done'),
  };

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
      const targetTask = tasks.find((t) => t.id === overId);
      if (!targetTask) return;
      targetStatus = targetTask.status ?? 'todo';
    }

    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== targetStatus) {
      await handleStatusChange(taskId, targetStatus);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    const result = await updateTaskStatus(id, status);
    if (result.success) {
      toast.success('状态已更新');
      setSelectedTask((prev) => prev && prev.id === id ? { ...prev, status: status as TaskStatus } : prev);
      refetch();
    } else {
      toast.error(result.error || '更新失败');
    }
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
      refetch();
    }
  }

  function handleDetailClose(open: boolean) {
    if (!open) {
      setDetailOpen(false);
      refetch();
    }
  }

  function handleDetailDelete(id: string) {
    setDeleteConfirm({ open: true, id, fromDetail: true });
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">任务管理</h1>
            <p className="text-muted-foreground">拖拽卡片可快速切换状态</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> 新建任务
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {statusOrder.map((statusKey) => {
            const config = statusConfig[statusKey];
            const items = grouped[statusKey];

            return (
              <div key={statusKey} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${config.color}`} />
                  <h2 className="text-sm font-semibold">{config.label}</h2>
                  <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                </div>

                <DroppableColumn statusKey={statusKey}>
                  {items.length === 0 ? (
                    <Card className="flex items-center justify-center py-8">
                      <p className="text-sm text-muted-foreground">暂无任务</p>
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
              </div>
            );
          })}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <Card className="p-3 shadow-xl border-primary/20 bg-card w-[calc(100vw/3-2rem)]">
            <TaskCardContent task={activeTask} />
          </Card>
        ) : null}
      </DragOverlay>

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
                refetch();
              }}
            >
              删除
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndContext>
  );
}
