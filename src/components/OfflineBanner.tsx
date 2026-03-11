import { useState, useEffect } from 'react';
import { CloudOff } from 'lucide-react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 text-center text-xs py-1.5 font-medium flex items-center justify-center gap-1.5" style={{ paddingTop: 'max(6px, env(safe-area-inset-top))' }}>
      <CloudOff className="w-3 h-3" />
      📡 Offline — Kaam jaari hai, sync hoga jab internet aayega
    </div>
  );
}
