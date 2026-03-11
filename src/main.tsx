import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker with background sync
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      // Register background sync if supported
      if ('sync' in reg) {
        await (reg as any).sync.register('sync-billsaathi').catch(() => {});
      }
    } catch {}
  });

  // Listen for background sync messages
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'BACKGROUND_SYNC') {
      import('./lib/syncEngine').then(({ syncNow }) => syncNow());
    }
  });
}
