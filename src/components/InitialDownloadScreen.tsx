import { useState, useEffect } from 'react';
import { initialDownload } from '@/lib/syncEngine';
import { Check, Loader2, FileText } from 'lucide-react';

const TABLE_LABELS: Record<string, string> = {
  tenants: 'Firm Settings',
  users: 'Users',
  customers: 'Customers',
  products: 'Products',
  invoices: 'Invoices',
  invoice_items: 'Invoice Items',
  payments: 'Payments',
  purchases: 'Purchases',
};

interface Props {
  tenantId: string;
  onComplete: () => void;
}

export default function InitialDownloadScreen({ tenantId, onComplete }: Props) {
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);

  useEffect(() => {
    initialDownload(tenantId, (table, isDone) => {
      setProgress(prev => ({ ...prev, [table]: isDone }));
    }).then(() => {
      setDone(true);
      localStorage.setItem('bs_initial_download_done', 'true');
      setTimeout(onComplete, 1000);
    });
  }, [tenantId, onComplete]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {done ? '✅ Data Ready!' : '📥 Downloading Data...'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {done ? 'App ab offline bhi chalega' : 'Pehli baar data download ho raha hai...'}
          </p>
        </div>

        <div className="glass-card p-4 space-y-2">
          {Object.entries(TABLE_LABELS).map(([key, label]) => {
            const isDone = progress[key] === true;
            const isInProgress = progress[key] === false;
            return (
              <div key={key} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-foreground">{label}</span>
                {isDone ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : isInProgress ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
