import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { FileText, Check } from 'lucide-react';

const languages: { id: Language; flag: string; label: string; sample: string }[] = [
  { id: 'en', flag: '🇬🇧', label: 'English', sample: 'Welcome to BillSaathi' },
  { id: 'hi', flag: '🇮🇳', label: 'हिन्दी', sample: 'बिलसाथी में आपका स्वागत है' },
  { id: 'hinglish', flag: '🇮🇳', label: 'Hinglish', sample: 'Aapka Swagat Hai BillSaathi Mein' },
  { id: 'gu', flag: '🇮🇳', label: 'ગુજરાતી', sample: 'BillSaathi માં આપનું સ્વાગત છે' },
];

export default function LanguageSelection() {
  const { setLanguage } = useLanguage();
  const [selected, setSelected] = useState<Language | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg">
            <FileText className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">BillSaathi</h1>
          <p className="text-muted-foreground mt-1">GST Billing ka Smart Saathi</p>
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-foreground text-center mb-2">Choose Your Language / भाषा चुनें</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">You can change this anytime from Settings</p>

        {/* Language Cards */}
        <div className="space-y-3">
          {languages.map(lang => (
            <button
              key={lang.id}
              onClick={() => setSelected(lang.id)}
              className={`w-full glass-card p-5 flex items-center gap-4 transition-all duration-200 cursor-pointer border-2 ${
                selected === lang.id
                  ? 'border-primary bg-primary/5 shadow-md scale-[1.02]'
                  : 'border-transparent hover:border-primary/30 hover:bg-muted/50'
              }`}
            >
              <span className="text-4xl">{lang.flag}</span>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground text-lg">{lang.label}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{lang.sample}</p>
              </div>
              {selected === lang.id && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Confirm Button */}
        {selected && (
          <Button
            onClick={() => setLanguage(selected)}
            className="w-full mt-6 h-12 text-base font-semibold animate-fade-in"
          >
            {selected === 'hi' ? 'पक्का करें ✅' : selected === 'gu' ? 'પાક્કું કરો ✅' : selected === 'en' ? 'Confirm ✅' : 'Pakka Karein ✅'}
          </Button>
        )}
      </div>
    </div>
  );
}
