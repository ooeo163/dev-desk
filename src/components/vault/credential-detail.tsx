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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Eye, EyeOff, Copy, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getCredentialById, deleteCredential } from '@/actions/credentials';
import { getTags } from '@/actions/tags';
import { useVaultStore } from '@/store/vault';
import { useClipboard } from '@/hooks/use-clipboard';

interface CredentialData {
  id: string;
  title: string;
  username: string | null;
  tags: string[];
  password?: string | null;
  apiKey?: string | null;
  totpSecret?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CredentialDetailProps {
  credentialId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (cred: {
    id: string; title: string; username: string | null; tags: string[];
    password?: string | null; apiKey?: string | null; totpSecret?: string | null; notes?: string | null;
  }) => void;
}

export function CredentialDetail({ credentialId, open, onOpenChange, onEdit }: CredentialDetailProps) {
  const getDekBase64 = useVaultStore((s) => s.getDekBase64);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CredentialData | null>(null);
  const [showFields, setShowFields] = useState<Record<string, boolean>>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tagMap, setTagMap] = useState<Map<string, string>>(new Map());
  const { copy } = useClipboard();

  useEffect(() => {
    if (open && credentialId) {
      setData(null);
      setShowFields({});
      setLoading(true);
      const dekBase64 = getDekBase64();
      if (!dekBase64) {
        toast.error('工作台未解锁');
        setLoading(false);
        return;
      }
      getCredentialById(credentialId, dekBase64, ['password', 'apiKey', 'totpSecret', 'notes'])
        .then((result) => { if (result) setData(result as unknown as CredentialData); })
        .catch(() => toast.error('解密失败'))
        .finally(() => setLoading(false));
      getTags()
        .then((tags) => {
          const map = new Map(tags.map((t) => [t.id, t.name]));
          setTagMap(map);
        })
        .catch(() => {});
    }
  }, [open, credentialId]);

  function toggleField(field: string) {
    setShowFields((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  function handleCopy(text: string, label: string) {
    copy(text);
    toast.success(`${label} 已复制`);
  }

  function handleDelete() {
    if (!credentialId || !data) return;
    setDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!credentialId || !data) return;
    await deleteCredential(credentialId);
    toast.success('凭证已删除');
    setDeleteConfirmOpen(false);
    onOpenChange(false);
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{data?.title ?? '凭证详情'}</DialogTitle>
          <DialogDescription>{data?.username ?? ''}</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {data && !loading && (
          <div className="space-y-4">
            {data.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {data.tags.map((tagId) => (
                  <Badge key={tagId} variant="secondary">{tagMap.get(tagId) || tagId}</Badge>
                ))}
              </div>
            )}

            <Separator />

            <SensitiveField
              fieldKey="password" label="密码" value={data.password ?? null}
              shown={!!showFields.password} onToggle={() => toggleField('password')}
              onCopy={handleCopy}
            />
            <SensitiveField
              fieldKey="apiKey" label="API Key" value={data.apiKey ?? null}
              shown={!!showFields.apiKey} onToggle={() => toggleField('apiKey')}
              onCopy={handleCopy}
            />
            <SensitiveField
              fieldKey="totpSecret" label="TOTP Secret" value={data.totpSecret ?? null}
              shown={!!showFields.totpSecret} onToggle={() => toggleField('totpSecret')}
              onCopy={handleCopy}
            />

            {data.notes && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">备注</p>
                <div className="rounded-md border border-border p-3 text-sm whitespace-pre-wrap">
                  {data.notes}
                </div>
              </div>
            )}

            <Separator />

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit({
                  id: data.id, title: data.title, username: data.username, tags: data.tags,
                  password: data.password, apiKey: data.apiKey, totpSecret: data.totpSecret, notes: data.notes,
                })}
              >
                <Pencil className="mr-1 h-3 w-3" /> 编辑
              </Button>
              <Button variant="destructive" size="sm" className="ml-auto" onClick={handleDelete}>
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

    <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除这条凭证吗？关联的任务将取消关联。此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
            取消
          </Button>
          <Button variant="destructive" onClick={confirmDelete}>
            删除
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

function SensitiveField({
  fieldKey, label, value, shown, onToggle, onCopy,
}: {
  fieldKey: string; label: string; value: string | null;
  shown: boolean; onToggle: () => void;
  onCopy: (text: string, label: string) => void;
}) {
  if (!value) return null;

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-lg border border-border bg-muted px-2 py-1 text-sm font-mono">
          {shown ? value : '••••••••'}
        </code>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggle} aria-label={shown ? `隐藏${label}` : `显示${label}`}>
          {shown ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onCopy(value, label)} aria-label={`复制${label}`}>
          <Copy className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
