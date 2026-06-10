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
import { Eye, EyeOff, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { createCredential, updateCredential } from '@/actions/credentials';
import { useVaultStore } from '@/store/vault';

interface CredentialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential?: {
    id: string;
    title: string;
    username: string | null;
    tags: string[];
    password?: string | null;
    apiKey?: string | null;
    totpSecret?: string | null;
    notes?: string | null;
  } | null;
  existingTags?: string[];
}

export function CredentialDialog({ open, onOpenChange, credential, existingTags }: CredentialDialogProps) {
  const isEdit = !!credential;
  const getDekBase64 = useVaultStore((s) => s.getDekBase64);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showTotpSecret, setShowTotpSecret] = useState(false);
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [notes, setNotes] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setTitle(credential?.title ?? '');
      setUsername(credential?.username ?? '');
      setTags(credential?.tags ?? []);
      setPassword(credential?.password ?? '');
      setApiKey(credential?.apiKey ?? '');
      setTotpSecret(credential?.totpSecret ?? '');
      setNotes(credential?.notes ?? '');
      setTagInput('');
      setShowPassword(false);
      setShowApiKey(false);
      setShowTotpSecret(false);
      setLoading(false);
    }
  }, [open, credential]);

  const matchTags = existingTags
    ? existingTags.filter(
        (t) => t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t)
      ).slice(0, 5)
    : [];

  function addTag(tag?: string) {
    const value = tag ?? tagInput.trim();
    if (value && !tags.includes(value) && tags.length < 10) {
      setTags([...tags, value]);
      setTagInput('');
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const dekBase64 = getDekBase64();
    if (!dekBase64) {
      toast.error('工作台未解锁');
      setLoading(false);
      return;
    }

    const input = isEdit
      ? { title, username: username || null, password: password || null, apiKey: apiKey || null, totpSecret: totpSecret || null, notes: notes || null, tags: tags.length > 0 ? tags : null }
      : { title, username: username || undefined, password: password || undefined, apiKey: apiKey || undefined, totpSecret: totpSecret || undefined, notes: notes || undefined, tags: tags.length > 0 ? tags : undefined };

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
    setPassword('');
    setApiKey('');
    setTotpSecret('');
    setNotes('');
    setTags([]);
    setTagInput('');
    setShowPassword(false);
    setShowApiKey(false);
    setShowTotpSecret(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑凭证' : '新建凭证'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '修改凭证信息，留空的敏感字段将不会更新' : '填写凭证信息，敏感字段将自动加密存储'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" name="username" autoComplete="username" className="hidden" />
          <input type="password" name="password" autoComplete="new-password" className="hidden" />

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
            <Label>标签</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="输入标签后按回车"
                  autoComplete="off"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  className="w-full"
                />
                {tagInput && matchTags.length > 0 && (
                  <div className="absolute left-0 top-full z-50 mt-1 w-full max-h-32 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
                    {matchTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="flex w-full items-center px-3 py-1.5 text-sm hover:bg-muted"
                        onClick={() => addTag(tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => addTag()}>
                添加
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
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
