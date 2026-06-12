'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createCredential, updateCredential } from '@/actions/credentials';
import { getTags } from '@/actions/tags';
import { useVaultStore } from '@/store/vault';
import { cn } from '@/lib/utils';

interface Tag {
  id: string;
  name: string;
  createdAt: Date;
}

interface CredentialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential?: {
    id: string;
    title: string;
    username: string | null;
    address: string | null;
    tags: string[];
    password?: string | null;
    apiKey?: string | null;
    totpSecret?: string | null;
    notes?: string | null;
  } | null;
}

export function CredentialDialog({ open, onOpenChange, credential }: CredentialDialogProps) {
  const isEdit = !!credential;
  const getDekBase64 = useVaultStore((s) => s.getDekBase64);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showTotpSecret, setShowTotpSecret] = useState(false);
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  async function loadTags() {
    try {
      const tags = await getTags();
      setAvailableTags(tags);
    } catch {
      toast.error('加载标签失败');
    }
  }

  useEffect(() => {
    if (open) {
      loadTags();
      setTitle(credential?.title ?? '');
      setUsername(credential?.username ?? '');
      setAddress(credential?.address ?? '');
      setSelectedTagIds(credential?.tags ?? []);
      setPassword(credential?.password ?? '');
      setApiKey(credential?.apiKey ?? '');
      setTotpSecret(credential?.totpSecret ?? '');
      setNotes(credential?.notes ?? '');
      setShowPassword(false);
      setShowApiKey(false);
      setShowTotpSecret(false);
      setLoading(false);
    }
  }, [open, credential]);

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (selectedTagIds.length === 0) {
      toast.error('至少选择一个标签');
      return;
    }

    setLoading(true);

    const dekBase64 = getDekBase64();
    if (!dekBase64) {
      toast.error('工作台未解锁');
      setLoading(false);
      return;
    }

    const input = isEdit
      ? { title, username: username || null, address: address || null, password: password || null, apiKey: apiKey || null, totpSecret: totpSecret || null, notes: notes || null, tags: selectedTagIds }
      : { title, username: username || undefined, address: address || undefined, password: password || undefined, apiKey: apiKey || undefined, totpSecret: totpSecret || undefined, notes: notes || undefined, tags: selectedTagIds };

    try {
      let result;
      if (isEdit) {
        result = await updateCredential(credential.id, input, dekBase64);
      } else {
        result = await createCredential(input, dekBase64);
      }

      if (result.success) {
        toast.success(isEdit ? '凭证已更新' : '凭证已创建');
        onOpenChange(false);
        resetForm();
      } else {
        toast.error(result.error || '操作失败');
      }
    } catch {
      toast.error('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setTitle('');
    setUsername('');
    setAddress('');
    setPassword('');
    setApiKey('');
    setTotpSecret('');
    setNotes('');
    setSelectedTagIds([]);
    setShowPassword(false);
    setShowApiKey(false);
    setShowTotpSecret(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[85vh] flex flex-col sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEdit ? '编辑凭证' : '新建凭证'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '修改凭证信息' : '填写凭证信息，敏感字段将自动加密存储'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <input type="text" name="username" autoComplete="username" className="hidden" />
          <input type="password" name="password" autoComplete="new-password" className="hidden" />

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="space-y-2">
              <Label htmlFor="cred-title">标题 *</Label>
              <Input
                id="cred-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例：GitHub 账号"
                autoComplete="off"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cred-address">地址</Label>
              <Input
                id="cred-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="网址或 IP 地址"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cred-username">用户名</Label>
              <Input
                id="cred-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="用户名或邮箱"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cred-password">密码</Label>
              <div className="flex gap-2">
                <Input
                  id="cred-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="密码"
                  className="flex-1"
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cred-apikey">API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="cred-apikey"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="API 密钥"
                  className="flex-1"
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowApiKey(!showApiKey)}
                  aria-label={showApiKey ? '隐藏 API Key' : '显示 API Key'}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cred-totp">TOTP Secret</Label>
              <div className="flex gap-2">
                <Input
                  id="cred-totp"
                  type={showTotpSecret ? 'text' : 'password'}
                  value={totpSecret}
                  onChange={(e) => setTotpSecret(e.target.value)}
                  placeholder="TOTP 密钥 (Base32)"
                  className="flex-1"
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowTotpSecret(!showTotpSecret)}
                  aria-label={showTotpSecret ? '隐藏 TOTP Secret' : '显示 TOTP Secret'}
                >
                  {showTotpSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cred-notes">备注</Label>
              <Textarea
                id="cred-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="备注内容..."
                rows={3}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label>标签 *</Label>
              {availableTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无标签，请先创建标签</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={selectedTagIds.includes(tag.id) ? 'default' : 'outline'}
                      className="cursor-pointer select-none"
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={loading || !title}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                isEdit ? '保存修改' : '创建凭证'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
