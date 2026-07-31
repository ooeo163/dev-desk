'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { downloadExcel, generateFilename } from '@/lib/excel-export';

interface ExportButtonProps {
  onExport: () => Promise<Uint8Array>;
  filename: string;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost';
}

export function ExportButton({
  onExport,
  filename,
  label = '导出',
  variant = 'outline',
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const buffer = await onExport();
      downloadExcel(buffer, generateFilename(filename));
      toast.success('导出成功');
    } catch {
      toast.error('导出失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant={variant} onClick={handleClick} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {label}
    </Button>
  );
}
