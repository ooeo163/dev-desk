'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { useVaultStore } from '@/store/vault';
import { saveAutoLockTimeout } from '@/actions/settings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sun, Moon, Monitor, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const THEME_OPTIONS = [
  { value: 'light', label: '亮色', icon: Sun },
  { value: 'dark', label: '暗色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
] as const;

const AUTO_LOCK_OPTIONS = [
  { value: '60000', label: '1 分钟' },
  { value: '300000', label: '5 分钟' },
  { value: '600000', label: '10 分钟' },
  { value: '1800000', label: '30 分钟' },
  { value: '0', label: '永不' },
] as const;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const autoLockTimeoutMs = useVaultStore((s) => s.autoLockTimeoutMs);
  const setAutoLockTimeout = useVaultStore((s) => s.setAutoLockTimeout);
  const [saving, setSaving] = useState(false);

  async function handleAutoLockChange(value: string | null) {
    if (!value) return;
    setSaving(true);
    const ms = Number(value);
    setAutoLockTimeout(ms);
    const result = await saveAutoLockTimeout(value);
    setSaving(false);

    if (result.success) {
      toast.success('自动锁定时间已更新');
    } else {
      toast.error('保存失败，请重试');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">设置</h1>
        <p className="text-muted-foreground">管理工作台的外观与安全选项。</p>
      </div>

      <Tabs defaultValue="appearance">
        <TabsList variant="line">
          <TabsTrigger value="appearance">外观</TabsTrigger>
          <TabsTrigger value="security">安全</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>主题</CardTitle>
              <CardDescription>选择工作台的显示主题。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {THEME_OPTIONS.map((opt) => {
                  const isActive = theme === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setTheme(opt.value)}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors',
                        isActive
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-accent'
                      )}
                    >
                      <opt.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                      <span className={cn('text-sm font-medium', isActive && 'text-primary')}>
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>自动锁定</CardTitle>
              <CardDescription>
                工作台将在空闲指定时间后自动锁定，保护数据安全。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">空闲超时</span>
                <Select
                  value={String(autoLockTimeoutMs)}
                  onValueChange={handleAutoLockChange}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTO_LOCK_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {saving && (
                  <span className="text-xs text-muted-foreground">保存中...</span>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
