'use client';

import { useState } from 'react';
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
import { Loader2, Shield, Download, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { verifyPasswordForExport } from '@/actions/auth';
import { exportCredentials } from '@/actions/credentials';
import { deriveDek } from '@/lib/client-crypto';
import { downloadExcel, generateFilename } from '@/lib/excel-export';

interface ExportPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportPasswordDialog({ open, onOpenChange }: ExportPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleClose() {
    setPassword('');
    setError('');
    setShowPassword(false);
    onOpenChange(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      setError('请输入主密码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const verifyResult = await verifyPasswordForExport(password);
      if (!verifyResult.success || !verifyResult.kdfSalt) {
        setError(verifyResult.error || '验证失败');
        setLoading(false);
        return;
      }

      const dek = await deriveDek(password, verifyResult.kdfSalt);
      const dekBase64 = btoa(String.fromCharCode(...dek));
      const buffer = await exportCredentials(dekBase64);

      downloadExcel(buffer, generateFilename('凭证管理'));
      toast.success('凭证导出成功');
      handleClose();
    } catch {
      setError('导出失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            导出凭证
          </DialogTitle>
          <DialogDescription>
            导出包含敏感信息，请输入主密码验证身份。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="输入主密码..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                autoFocus
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  导出中...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  导出
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
