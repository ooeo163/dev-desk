'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, Search, KeyRound, User, Check, Key } from 'lucide-react';
import { toast } from 'sonner';
import { getCredentials, getCredentialById } from '@/actions/credentials';
import { CredentialDialog } from '@/components/vault/credential-dialog';
import { CredentialDetail } from '@/components/vault/credential-detail';
import { useClipboard } from '@/hooks/use-clipboard';
import { useVaultStore } from '@/store/vault';

export default function CredentialsPage() {
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editCred, setEditCred] = useState<{
    id: string;
    title: string;
    username: string | null;
    tags: string[];
    password?: string | null;
    apiKey?: string | null;
    totpSecret?: string | null;
    notes?: string | null;
  } | null>(null);

  const { data: credentials = [], refetch } = useQuery({
    queryKey: ['credentials'],
    queryFn: getCredentials,
  });

  const { copy } = useClipboard();
  const [copyFeedback, setCopyFeedback] = useState<Record<string, true>>({});
  const getDekBase64 = useVaultStore((s) => s.getDekBase64);

  function triggerCopyFeedback(key: string) {
    setCopyFeedback((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopyFeedback((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 1500);
  }

  async function handleCopyField(id: string, fieldKey: string, field: string, label: string) {
    const dekBase64 = getDekBase64();
    if (!dekBase64) { toast.error('工作台未解锁'); return; }
    try {
      const result = await getCredentialById(id, dekBase64, [field]);
      if (result?.[field as keyof typeof result]) {
        copy(result[field as keyof typeof result] as string);
        triggerCopyFeedback(fieldKey);
        toast.success(`${label} 已复制`);
      } else {
        toast.error(`该凭证没有${label}`);
      }
    } catch {
      toast.error('解密失败');
    }
  }

  // Filter credentials
  const filtered = credentials.filter((cred) => {
    const matchSearch =
      !search ||
      cred.title.toLowerCase().includes(search.toLowerCase()) ||
      (cred.username ?? '').toLowerCase().includes(search.toLowerCase());
    const matchTag = !selectedTag || cred.tags.includes(selectedTag);
    return matchSearch && matchTag;
  });

  // Collect all unique tags
  const allTags = Array.from(new Set(credentials.flatMap((c) => c.tags)));

  function handleCreate() {
    setEditCred(null);
    setDialogOpen(true);
  }

  function handleEdit(cred: {
    id: string; title: string; username: string | null; tags: string[];
    password?: string | null; apiKey?: string | null; totpSecret?: string | null; notes?: string | null;
  }) {
    setEditCred(cred);
    setDetailOpen(false);
    setDialogOpen(true);
  }

  function handleDialogClose(open: boolean) {
    if (!open) {
      setDialogOpen(false);
      setEditCred(null);
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
          <h1 className="text-2xl font-bold tracking-tight">凭证管理</h1>
          <p className="text-muted-foreground">安全存储和管理你的凭证信息</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> 新建凭证
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="搜索凭证..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <Badge
              variant={selectedTag === null ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedTag(null)}
            >
              全部
            </Badge>
            {allTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTag === tag ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Credentials List */}
      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <KeyRound className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            {search || selectedTag ? '没有找到匹配的凭证' : '还没有凭证，点击"新建凭证"开始'}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((cred) => (
            <Card
              key={cred.id}
              className="cursor-pointer p-4 transition-colors hover:bg-muted/50"
              onClick={() => {
                setSelectedId(cred.id);
                setDetailOpen(true);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <KeyRound className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{cred.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {cred.username && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" /> {cred.username}
                        </span>
                      )}
                      <span>
                        {new Date(cred.updatedAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {cred.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {cred.username && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="复制用户名"
                      onClick={(e) => {
                        e.stopPropagation();
                        copy(cred.username!);
                        triggerCopyFeedback(`copy-username-${cred.id}`);
                        toast.success('用户名已复制');
                      }}
                    >
                      {copyFeedback[`copy-username-${cred.id}`] ? <Check className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    </Button>
                  )}
                  {cred.hasPassword && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="复制密码"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyField(cred.id, `copy-password-${cred.id}`, 'password', '密码');
                      }}
                    >
                      {copyFeedback[`copy-password-${cred.id}`] ? <Check className="h-3 w-3" /> : <KeyRound className="h-3 w-3" />}
                    </Button>
                  )}
                  {cred.hasApiKey && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="复制 API Key"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyField(cred.id, `copy-apikey-${cred.id}`, 'apiKey', 'API Key');
                      }}
                    >
                      {copyFeedback[`copy-apikey-${cred.id}`] ? <Check className="h-3 w-3" /> : <Key className="h-3 w-3" />}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <CredentialDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        credential={editCred}
        existingTags={allTags}
      />

      {/* Detail Dialog */}
      <CredentialDetail
        credentialId={selectedId}
        open={detailOpen}
        onOpenChange={handleDetailClose}
        onEdit={handleEdit}
      />
    </div>
  );
}
