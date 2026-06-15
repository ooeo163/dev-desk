'use client';

import { useState, useEffect, useMemo } from 'react';
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
import {
  resolveCredentialType,
  resolveTagType,
  getAllTypeConfigs,
  DEFAULT_TYPE,
  type CredentialTypeConfig,
} from '@/lib/credential-types';
import { cn } from '@/lib/utils';

interface Tag {
  id: string;
  name: string;
  createdAt: Date;
}

interface TypeStat {
  config: CredentialTypeConfig;
  count: number;
  tagIds: string[];
}

export default function CredentialsPage() {
  const [search, setSearch] = useState('');
  const [selectedTypeKey, setSelectedTypeKey] = useState<string | null>(null);
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

  // Tag id → name mapping
  const tagMap = new Map(tags.map((t) => [t.id, t.name]));
  function getTagName(id: string): string {
    return tagMap.get(id) || id;
  }

  // ── Statistics computation ──────────────────────────────────────────
  const { typeStats, otherCount } = useMemo(() => {
    const allTypeConfigs = getAllTypeConfigs();
    const usedTagIds = new Set(credentials.flatMap((c) => c.tags));
    const usedTagsList = tags.filter((t) => usedTagIds.has(t.id));

    const matchedCredIds = new Set<string>();
    const stats: TypeStat[] = allTypeConfigs.map((config) => {
      const matchingTagIds = usedTagsList
        .filter((t) => resolveTagType(t.name)?.key === config.key)
        .map((t) => t.id);
      const matchingCredIds = new Set(
        credentials
          .filter((c) => c.tags.some((tid) => matchingTagIds.includes(tid)))
          .map((c) => c.id)
      );
      matchingCredIds.forEach((id) => matchedCredIds.add(id));
      return { config, count: matchingCredIds.size, tagIds: matchingTagIds };
    });

    const other = credentials.filter((c) => !matchedCredIds.has(c.id)).length;
    return { typeStats: stats.filter((s) => s.count > 0), otherCount: other };
  }, [credentials, tags]);

  // ── Secondary tag filter (tags within selected type) ────────────────
  const typeSubTags = useMemo(() => {
    if (!selectedTypeKey || selectedTypeKey === 'all') return [];
    const stat = typeStats.find((s) => s.config.key === selectedTypeKey);
    if (!stat) return [];
    return stat.tagIds
      .map((id) => tags.find((t) => t.id === id))
      .filter(Boolean) as Tag[];
  }, [selectedTypeKey, typeStats, tags]);

  // ── Filter credentials ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    return credentials.filter((cred) => {
      const matchSearch =
        !search ||
        cred.title.toLowerCase().includes(search.toLowerCase()) ||
        (cred.username ?? '').toLowerCase().includes(search.toLowerCase());

      let matchType = true;
      if (selectedTypeKey && selectedTypeKey !== 'all') {
        if (selectedTypeKey === 'other') {
          const tagNames = cred.tags.map((id) => tagMap.get(id) ?? '');
          matchType = !tagNames.some((name) => resolveTagType(name) !== null);
        } else {
          const stat = typeStats.find((s) => s.config.key === selectedTypeKey);
          matchType = stat ? cred.tags.some((tid) => stat.tagIds.includes(tid)) : false;
        }
      }

      const matchTag = !selectedTagId || cred.tags.includes(selectedTagId);

      return matchSearch && matchType && matchTag;
    });
  }, [credentials, search, selectedTypeKey, selectedTagId, typeStats, tagMap]);

  // ── Handlers ───────────────────────────────────────────────────────
  function handleTypeClick(typeKey: string | null) {
    setSelectedTypeKey(typeKey);
    setSelectedTagId(null); // reset sub-filter when switching type
  }

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
      {/* Header */}
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

      {/* Search */}
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

        {/* Type Filter Tabs */}
        {typeStats.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            {/* All tab */}
            <button
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors shrink-0',
                (!selectedTypeKey || selectedTypeKey === 'all')
                  ? 'bg-background shadow-sm text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
              onClick={() => handleTypeClick(null)}
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">全部</span>
              <span className="text-xs bg-muted rounded-full px-1.5 py-0.5">{credentials.length}</span>
            </button>

            {/* Type tabs */}
            {typeStats.map((stat) => (
              <button
                key={stat.config.key}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors shrink-0',
                  selectedTypeKey === stat.config.key
                    ? 'bg-background shadow-sm text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
                onClick={() => handleTypeClick(stat.config.key)}
              >
                <stat.config.icon className={cn('h-3.5 w-3.5', stat.config.color)} />
                <span className="hidden sm:inline">{stat.config.label}</span>
                <span className="text-xs bg-muted rounded-full px-1.5 py-0.5">{stat.count}</span>
              </button>
            ))}

            {/* Other tab */}
            {otherCount > 0 && (
              <button
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors shrink-0',
                  selectedTypeKey === 'other'
                    ? 'bg-background shadow-sm text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
                onClick={() => handleTypeClick('other')}
              >
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">其他</span>
                <span className="text-xs bg-muted rounded-full px-1.5 py-0.5">{otherCount}</span>
              </button>
            )}
          </div>
        )}

        {/* Secondary tag filter (within selected type) */}
        {typeSubTags.length > 1 && (
          <div className="flex flex-wrap gap-1">
            <Badge
              variant={selectedTagId === null ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedTagId(null)}
            >
              全部
            </Badge>
            {typeSubTags.map((tag) => (
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
          {search || selectedTypeKey || selectedTagId ? (
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
          {filtered.map((cred) => {
            const tagNames = cred.tags.map((id) => tagMap.get(id) ?? '');
            const typeConfig = resolveCredentialType(tagNames);

            return (
              <Card
                key={cred.id}
                className="cursor-pointer px-3 py-2.5 transition-all hover:bg-muted/50 hover:shadow-sm"
                onClick={() => {
                  setSelectedId(cred.id);
                  setDetailOpen(true);
                }}
              >
                <div className="flex items-center gap-1 mb-1.5">
                  {cred.tags.map((tagId) => {
                    const tagName = getTagName(tagId);
                    const tagType = resolveTagType(tagName);
                    const isTypeTag = tagType && tagType.key === typeConfig.key;

                    return isTypeTag ? (
                      <Badge
                        key={tagId}
                        variant="secondary"
                        className={cn('text-xs', typeConfig.bg, typeConfig.color, 'border-0')}
                      >
                        <tagType.icon className="h-3 w-3 mr-0.5" />
                        {tagName}
                      </Badge>
                    ) : (
                      <Badge key={tagId} variant="secondary" className="text-xs">
                        {tagName}
                      </Badge>
                    );
                  })}
                </div>

                <div className="flex items-start gap-2.5">
                  <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', typeConfig.bg)}>
                    <typeConfig.icon className={cn('h-4 w-4', typeConfig.color)} />
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
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        {new Date(cred.updatedAt).toLocaleDateString('zh-CN')}
                      </span>
                      {(cred.hasPassword || cred.hasApiKey) && (
                        <div className="flex items-center gap-0.5">
                          {cred.hasPassword && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              title="复制密码"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyField(cred.id, `copy-password-${cred.id}`, 'password', '密码');
                              }}
                            >
                              {copyFeedback[`copy-password-${cred.id}`] ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : (
                                <KeyRound className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                          {cred.hasApiKey && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              title="复制 API Key"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyField(cred.id, `copy-apikey-${cred.id}`, 'apiKey', 'API Key');
                              }}
                            >
                              {copyFeedback[`copy-apikey-${cred.id}`] ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : (
                                <Key className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
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
