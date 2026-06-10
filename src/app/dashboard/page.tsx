'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { KeyRound, CheckSquare, Clock, Shield } from 'lucide-react';
import { getDashboardStats } from '@/actions/dashboard';

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  });

  const statCards = [
    {
      title: '凭证总数',
      value: stats?.credentialCount ?? 0,
      icon: KeyRound,
      color: 'text-blue-500',
    },
    {
      title: '待办任务',
      value: stats?.todoCount ?? 0,
      icon: Clock,
      color: 'text-amber-500',
    },
    {
      title: '进行中',
      value: stats?.inProgressCount ?? 0,
      icon: CheckSquare,
      color: 'text-purple-500',
    },
    {
      title: '已完成',
      value: stats?.doneCount ?? 0,
      icon: Shield,
      color: 'text-green-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">仪表板</h1>
        <p className="text-muted-foreground">欢迎使用 DevDesk，你的开发运维工作台。</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-12" />
                </CardContent>
              </Card>
            ))
          : statCards.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Recent Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">最近修改的凭证</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : stats?.recentCredentials && stats.recentCredentials.length > 0 ? (
            <div className="space-y-3">
              {stats.recentCredentials.map((cred) => (
                <div
                  key={cred.id}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{cred.title}</p>
                    <p className="text-xs text-muted-foreground">{cred.username || '无用户名'}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(cred.updatedAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">暂无凭证数据</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
