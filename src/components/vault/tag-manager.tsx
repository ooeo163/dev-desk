'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Pencil, Trash2, Check, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getTagsWithCount, createTag, updateTag, deleteTag } from '@/actions/tags';

interface TagManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTagsChange?: () => void;
}

interface TagWithCount {
  id: string;
  name: string;
  createdAt: Date;
  count: number;
}

export function TagManager({ open, onOpenChange, onTagsChange }: TagManagerProps) {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadTags();
    }
  }, [open]);

  async function loadTags() {
    setLoading(true);
    try {
      const data = await getTagsWithCount();
      setTags(data);
    } catch {
      toast.error('加载标签失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newTagName.trim()) return;
    setSaving(true);
    try {
      const result = await createTag({ name: newTagName.trim() });
      if (result.success) {
        toast.success('标签已创建');
        setNewTagName('');
        await loadTags();
        onTagsChange?.();
      } else {
        toast.error(result.error || '创建失败');
      }
    } catch {
      toast.error('创建失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!editingName.trim()) return;
    setSaving(true);
    try {
      const result = await updateTag(id, { name: editingName.trim() });
      if (result.success) {
        toast.success('标签已更新');
        setEditingId(null);
        setEditingName('');
        await loadTags();
        onTagsChange?.();
      } else {
        toast.error(result.error || '更新失败');
      }
    } catch {
      toast.error('更新失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`确定要删除标签"${name}"吗？`)) return;
    setSaving(true);
    try {
      const result = await deleteTag(id);
      if (result.success) {
        toast.success('标签已删除');
        await loadTags();
        onTagsChange?.();
      } else {
        toast.error(result.error || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    } finally {
      setSaving(false);
    }
  }

  function startEditing(tag: TagWithCount) {
    setEditingId(tag.id);
    setEditingName(tag.name);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingName('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>标签管理</DialogTitle>
          <DialogDescription>
            创建、编辑或删除凭证标签
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new tag */}
          <div className="flex gap-2">
            <Input
              placeholder="输入新标签名称"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              disabled={saving}
            />
            <Button
              onClick={handleCreate}
              disabled={!newTagName.trim() || saving}
              size="sm"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span className="ml-1">添加</span>
            </Button>
          </div>

          {/* Tags list */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无标签
            </div>
          ) : (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  {editingId === tag.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleUpdate(tag.id);
                          }
                          if (e.key === 'Escape') {
                            cancelEditing();
                          }
                        }}
                        className="h-8"
                        autoFocus
                        disabled={saving}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleUpdate(tag.id)}
                        disabled={!editingName.trim() || saving}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={cancelEditing}
                        disabled={saving}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{tag.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {tag.count > 0 ? `${tag.count} 个凭证` : '未使用'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => startEditing(tag)}
                          disabled={saving}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(tag.id, tag.name)}
                          disabled={saving || tag.count > 0}
                          title={tag.count > 0 ? '该标签正在使用中' : '删除标签'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
