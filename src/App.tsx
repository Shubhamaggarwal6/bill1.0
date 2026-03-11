import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProvider } from "@/contexts/AppContext";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import MobileInstallBanner from "@/components/MobileInstallBanner";
import OfflineBanner from "@/components/OfflineBanner";
import LanguageSelection from "@/components/LanguageSelection";
import Index from "./pages/Index";

const queryClient = new QueryClient();

function AppInner() {
  const { hasChosen } = useLanguage();
  if (!hasChosen) return <LanguageSelection />;
  return (
    <AppProvider>
      <MobileInstallBanner />
      <Index />
    </AppProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <OfflineBanner />
        <AppInner />
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
