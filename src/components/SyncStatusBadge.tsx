import { useState, useEffect } from 'react';
import { onSyncChange, getSyncInfo, type SyncInfo } from '@/lib/syncEngine';
import { Cloud, CloudOff, RefreshCw, Loader2, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatDistanceToNow } from 'date-fns';

export default function SyncStatusBadge({ tenantId }: { tenantId?: string }) {
  const [info, setInfo] = useState<SyncInfo | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  useEffect(() => {
    getSyncInfo().then(setInfo);
    return onSyncChange(setInfo);
  }, []);

  if (!info) return null;

  const icon = {
    synced: <Cloud className="w-4 h-4 text-emerald-500" />,
    syncing: <Loader2 className="w-4 h-4 text-primary animate-spin" />,
    pending: <RefreshCw className="w-4 h-4 text-amber-500" />,
    offline: <CloudOff className="w-4 h-4 text-muted-foreground" />,
  }[info.state];

  const statusText = {
    synced: `🟢 ${t('allDataSynced')}`,
    syncing: `🔄 ${t('syncInProgress')}`,
    pending: `🟡 ${info.pendingCount} ${t('changesPendingSync').replace('{count}', String(info.pendingCount))}`,
    offline: `🔴 ${t('offlineWillSync')}`,
  }[info.state];

  const subText = {
    synced: info.lastSyncedAt ? `${t('lastSync')}: ${formatDistanceToNow(new Date(info.lastSyncedAt), { addSuffix: true })}` : '',
    syncing: `${info.pendingCount} changes...`,
    pending: t('offlineWillSync'),
    offline: `${info.pendingCount > 0 ? `${info.pendingCount} changes saved locally` : 'Will sync automatically when online'}`,
  }[info.state];

  return (
    <>
      {/* Badge: icon only, 36px circle */}
      <button
        onClick={() => setPanelOpen(true)}
        className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted/50 transition-colors shrink-0"
        title={statusText}
      >
        {icon}
        {info.pendingCount > 0 && info.state === 'pending' && (
          <span className="absolute -top-0.5 -right-0.5 bg-amber-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {info.pendingCount > 9 ? '9+' : info.pendingCount}
          </span>
        )}
      </button>

      {panelOpen && (
        <>
          <div className="fixed inset-0 bg-foreground/30 z-[9998]" onClick={() => setPanelOpen(false)} />
          <div className={`fixed z-[9999] bg-card border shadow-lg animate-in duration-200 ${
            isMobile
              ? 'bottom-0 left-0 right-0 rounded-t-2xl slide-in-from-bottom-2 max-h-[70vh] overflow-y-auto'
              : 'top-[56px] right-4 w-[300px] rounded-xl slide-in-from-top-2'
          }`}>
            {isMobile && (
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
            )}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-foreground text-sm">🔄 {t('syncStatus')}</h3>
              <button onClick={() => setPanelOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Status line */}
              <div className="flex items-center gap-2">
                {icon}
                <span className="text-sm text-foreground">{statusText}</span>
              </div>

              {/* Sub text */}
              {subText && (
                <p className="text-xs text-muted-foreground">{subText}</p>
              )}

              {/* Pending breakdown */}
              {Object.keys(info.pendingByTable).length > 0 && (
                <div className="space-y-1 pt-1">
                  {Object.entries(info.pendingByTable).map(([table, count]) => (
                    <div key={table} className="flex items-center justify-between text-xs">
                      <span className="capitalize text-foreground">{table.replace(/_/g, ' ')}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
