import { useState, useEffect } from 'react';
import { FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MobileInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setTimeout(() => setInstalled(false), 3000);
    });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (installed) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-40 bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] rounded-xl p-4 text-center text-sm font-medium shadow-lg animate-fade-in">
        ✅ BillSaathi install ho gaya! Home screen pe dekho.
      </div>
    );
  }

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 bg-primary text-primary-foreground rounded-xl p-4 shadow-lg animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">BillSaathi Install Karein</p>
          <p className="text-xs opacity-80">Home screen par add karein — offline bhi chalega</p>
        </div>
        <button onClick={() => setDismissed(true)} className="shrink-0 opacity-70">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <Button variant="secondary" size="sm" className="flex-1 text-xs h-9" onClick={() => setDismissed(true)}>
          Baad Mein
        </Button>
        <Button size="sm" className="flex-1 text-xs h-9 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground" onClick={handleInstall}>
          Install
        </Button>
      </div>
    </div>
  );
}
