'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  function handleRetry() {
    setRetrying(true);
    reset();
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle>数据加载异常</CardTitle>
          <CardDescription>
            页面渲染时发生错误，请尝试重试
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 pb-8">
          <Button onClick={handleRetry} className="w-full" disabled={retrying}>
            {retrying ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 重试中...</>
            ) : '重试'}
          </Button>
          <Link href="/dashboard" className="w-full">
            <Button variant="outline" className="w-full">
              返回仪表板
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
