'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, Search, KeyRound, User, Check, Key, Tags, Copy } from 'lucide-react';
import { EmptyVault, EmptySearch } from '@/components/ui/illustrations';
import { toast } from 'sonner';
import { getCredentials, getCredentialById } from '@/actions/credentials';
import { getTags } from '@/actions/tags';
import { CredentialDialog } from '@/components/vault/credential-dialog';
import { CredentialDetail } from '@/components/vault/credential-detail';
import { TagManager } from '@/components/vault/tag-manager';
import { useClipboard } from '@/hooks/use-clipboard';
import { useVaultStore } from '@/store/vault';

interface Tag {
  id: string;
  name: string;
  createdAt: Date;
}

export default function CredentialsPage() {
  const [search, setSearch] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editCred, setEditCred] = useState<{
    id: string;
    title: string;
    username: string | null;
    address: string | null;
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

  const { data: tags = [], refetch: refetchTags } = useQuery({
    queryKey: ['tags'],
    queryFn: getTags,
  });

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const action = searchParams.get('action');
    const detail = searchParams.get('detail');
    if (action === 'create') {
      setEditCred(null);
      setDialogOpen(true);
      router.replace('/dashboard/credentials');
    } else if (detail) {
      setSelectedId(detail);
      setDetailOpen(true);
      router.replace('/dashboard/credentials');
    }
  }, [searchParams, router]);

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

  // Create tag id to name mapping
  const tagMap = new Map(tags.map((t) => [t.id, t.name]));

  // Get tag name by id
  function getTagName(id: string): string {
    return tagMap.get(id) || id;
  }

  // Filter credentials
  const filtered = credentials.filter((cred) => {
    const matchSearch =
      !search ||
      cred.title.toLowerCase().includes(search.toLowerCase()) ||
      (cred.username ?? '').toLowerCase().includes(search.toLowerCase());
    const matchTag = !selectedTagId || cred.tags.includes(selectedTagId);
    return matchSearch && matchTag;
  });

  // Collect all unique tag ids from credentials
  const allTagIds = Array.from(new Set(credentials.flatMap((c) => c.tags)));

  // Get tags that are actually used by credentials
  const usedTags = allTagIds
    .map((id) => tags.find((t) => t.id === id))
    .filter(Boolean) as Tag[];

  function handleCreate() {
    setEditCred(null);
    setDialogOpen(true);
  }

  function handleEdit(cred: {
    id: string; title: string; username: string | null; address: string | null; tags: string[];
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
      refetchTags();
    }
  }

  function handleDetailClose(open: boolean) {
    if (!open) {
      setDetailOpen(false);
      refetch();
    }
  }

  function handleTagManagerClose(open: boolean) {
    if (!open) {
      setTagManagerOpen(false);
      refetchTags();
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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setTagManagerOpen(true)}>
            <Tags className="mr-2 h-4 w-4" /> 标签管理
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> 新建凭证
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="搜索凭证..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {usedTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <Badge
              variant={selectedTagId === null ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedTagId(null)}
            >
              全部
            </Badge>
            {usedTags.map((tag) => (
              <Badge
                key={tag.id}
                variant={selectedTagId === tag.id ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedTagId(selectedTagId === tag.id ? null : tag.id)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Credentials List */}
      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          {search || selectedTagId ? (
            <>
              <EmptySearch className="mb-4 h-20 w-20 text-muted-foreground/40" />
              <p className="text-muted-foreground">没有找到匹配的凭证</p>
              <p className="text-xs text-muted-foreground/60 mt-1">试试其他关键词或清除筛选</p>
            </>
          ) : (
            <>
              <EmptyVault className="mb-4 h-24 w-24 text-muted-foreground/40" />
              <p className="text-muted-foreground mb-4">还没有凭证，创建你的第一个</p>
              <Button size="sm" onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" /> 新建凭证
              </Button>
            </>
          )}
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
          {filtered.map((cred) => (
            <Card
              key={cred.id}
              className="cursor-pointer p-4 transition-all hover:bg-muted/50 hover:shadow-sm hover:scale-[1.005]"
              onClick={() => {
                setSelectedId(cred.id);
                setDetailOpen(true);
              }}
            >
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1 min-h-[22px]">
                  {cred.tags.map((tagId) => (
                    <Badge key={tagId} variant="secondary" className="text-xs">
                      {getTagName(tagId)}
                    </Badge>
                  ))}
                </div>
                <div className="border-b border-border/50" />
                <div className="flex items-start gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <KeyRound className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{cred.title}</p>
                      {cred.username && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="truncate">{cred.username}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 ml-0.5"
                            title="复制用户名"
                            onClick={(e) => {
                              e.stopPropagation();
                              copy(cred.username!);
                              triggerCopyFeedback(`copy-username-${cred.id}`);
                              toast.success('用户名已复制');
                            }}
                          >
                            {copyFeedback[`copy-username-${cred.id}`] ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      )}
                      {cred.address && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{cred.address}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(cred.updatedAt).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {cred.hasPassword && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        title="复制密码"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyField(cred.id, `copy-password-${cred.id}`, 'password', '密码');
                        }}
                      >
                        {copyFeedback[`copy-password-${cred.id}`] ? <Check className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                      </Button>
                    )}
                    {cred.hasApiKey && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        title="复制 API Key"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyField(cred.id, `copy-apikey-${cred.id}`, 'apiKey', 'API Key');
                        }}
                      >
                        {copyFeedback[`copy-apikey-${cred.id}`] ? <Check className="h-4 w-4" /> : <Key className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
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
      />

      {/* Detail Dialog */}
      <CredentialDetail
        credentialId={selectedId}
        open={detailOpen}
        onOpenChange={handleDetailClose}
        onEdit={handleEdit}
      />

      {/* Tag Manager Dialog */}
      <TagManager
        open={tagManagerOpen}
        onOpenChange={handleTagManagerClose}
      />
    </div>
  );
}
