import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { INDIAN_STATES, DEFAULT_FIRM_SETTINGS, FirmSettings } from '@/lib/types';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

const langCards: { id: Language; flag: string; label: string; preview: string }[] = [
  { id: 'en', flag: '🇬🇧', label: 'English', preview: 'Invoice Created!' },
  { id: 'hi', flag: '🇮🇳', label: 'हिंदी', preview: 'बिल बन गया!' },
  { id: 'hinglish', flag: '🇮🇳', label: 'Hinglish', preview: 'Invoice Ban Gayi!' },
  { id: 'gu', flag: '🇮🇳', label: 'ગુજરાતી', preview: 'બિલ બની ગયું!' },
];

export default function SettingsPanel() {
  const { currentUser, users, customers, products, invoices, payments, purchases, setUsers } = useApp();
  const { t, language, setLanguage } = useLanguage();
  const [backupProgress, setBackupProgress] = useState<string | null>(null);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [msg, setMsg] = useState('');
  const [firmName, setFirmName] = useState(currentUser?.firmName || '');
  const [gstNumber, setGstNumber] = useState(currentUser?.gstNumber || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');

  const fs = currentUser?.firmSettings || DEFAULT_FIRM_SETTINGS;
  const [settings, setSettings] = useState<FirmSettings>(fs);

  if (!currentUser) return null;

  const updateSetting = (key: keyof FirmSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handlePasswordChange = () => {
    if (oldPw !== currentUser.password) { setMsg(t('wrongOldPassword')); return; }
    if (newPw !== confirmPw) { setMsg(t('passwordsDontMatch')); return; }
    if (newPw.length < 4) { setMsg(t('minPasswordLength')); return; }
    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, password: newPw } : u));
    setMsg('✅ ' + t('passwordChanged'));
    setOldPw(''); setNewPw(''); setConfirmPw('');
  };

  const handleFirmUpdate = () => {
    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, firmName, gstNumber, email, phone, firmSettings: settings } : u));
    setMsg('✅ ' + t('success'));
  };

  const toggleStockVisibility = () => {
    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, showStockToEmployees: !u.showStockToEmployees } : u));
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    toast.success(t('languageChanged'));
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl">
      <h2 className="text-xl font-bold text-foreground">{t('settings')}</h2>

      {/* Language Selector */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">{t('language')} / भाषा / Bhasha</h3>
        <div className="grid grid-cols-2 gap-3">
          {langCards.map(lc => (
            <button
              key={lc.id}
              onClick={() => handleLanguageChange(lc.id)}
              className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                language === lc.id
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border hover:border-primary/30 hover:bg-muted/50'
              }`}
            >
              <span className="text-2xl">{lc.flag}</span>
              <p className="font-semibold text-foreground mt-1">{lc.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{lc.preview}</p>
              {language === lc.id && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Password Change */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">🔐 {t('changePassword')}</h3>
        <div className="space-y-3">
          <Input placeholder={t('oldPassword')} type="password" value={oldPw} onChange={e => { setOldPw(e.target.value); setMsg(''); }} />
          <Input placeholder={t('newPassword')} type="password" value={newPw} onChange={e => { setNewPw(e.target.value); setMsg(''); }} />
          <Input placeholder={t('confirmNewPassword')} type="password" value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setMsg(''); }} />
          <Button onClick={handlePasswordChange} size="sm" className="min-h-[44px]">{t('changePassword')}</Button>
        </div>
      </div>

      {/* Firm Details */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">{t('firmDetails')}</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">{t('firmName')}</label><Input value={firmName} onChange={e => setFirmName(e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground">{t('gstNumber')}</label><Input value={gstNumber} onChange={e => setGstNumber(e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground">Email</label><Input value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground">{t('phone')}</label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
          </div>
          <div><label className="text-xs text-muted-foreground">{t('address')}</label><Input value={settings.address} onChange={e => updateSetting('address', e.target.value)} /></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label className="text-xs text-muted-foreground">{t('city')}</label><Input value={settings.city} onChange={e => updateSetting('city', e.target.value)} /></div>
            <div>
              <label className="text-xs text-muted-foreground">{t('state')}</label>
              <select value={settings.stateCode} onChange={e => {
                const st = INDIAN_STATES.find(s => s.code === e.target.value);
                if (st) { updateSetting('state', st.name); updateSetting('stateCode', st.code); }
              }} className="w-full border rounded-md px-3 py-2 text-sm bg-card text-foreground min-h-[48px] md:min-h-0">
                {INDIAN_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-muted-foreground">{t('pincode')}</label><Input value={settings.pincode} onChange={e => updateSetting('pincode', e.target.value)} /></div>
          </div>
        </div>
      </div>

      {/* Bank Details */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">{t('bankDetails')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className="text-xs text-muted-foreground">{t('bankDetailsLabel')}</label><Input value={settings.bankName} onChange={e => updateSetting('bankName', e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">Account Number</label><Input value={settings.accountNumber} onChange={e => updateSetting('accountNumber', e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">IFSC Code</label><Input value={settings.ifscCode} onChange={e => updateSetting('ifscCode', e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">Branch</label><Input value={settings.branchName} onChange={e => updateSetting('branchName', e.target.value)} /></div>
        </div>
      </div>

      {/* Invoice Settings */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">{t('invoiceSettings')}</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">{t('invoicePrefix')}</label><Input value={settings.invoicePrefix} onChange={e => updateSetting('invoicePrefix', e.target.value)} placeholder="INV" /></div>
            <div>
              <label className="text-xs text-muted-foreground">{t('invoiceCopy')}</label>
              <select value={settings.invoiceCopyLabel} onChange={e => updateSetting('invoiceCopyLabel', e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-card text-foreground min-h-[48px] md:min-h-0">
                <option value="original">{t('originalForRecipient')}</option>
                <option value="duplicate">{t('duplicateForTransporter')}</option>
                <option value="triplicate">{t('triplicateForSupplier')}</option>
                <option value="all">{t('copies3')}</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between min-h-[44px]">
              <span className="text-sm text-foreground">{t('showBankOnInvoice')}</span>
              <Switch checked={settings.showBankDetails} onCheckedChange={v => updateSetting('showBankDetails', v)} />
            </div>
            <div className="flex items-center justify-between min-h-[44px]">
              <span className="text-sm text-foreground">{t('showTermsOnInvoice')}</span>
              <Switch checked={settings.showTerms} onCheckedChange={v => updateSetting('showTerms', v)} />
            </div>
            <div className="flex items-center justify-between min-h-[44px]">
              <span className="text-sm text-foreground">{t('showEwayBill')}</span>
              <Switch checked={settings.showEwayBill} onCheckedChange={v => updateSetting('showEwayBill', v)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t('termsAndConditions')}</label>
            <Textarea rows={4} value={settings.termsAndConditions} onChange={e => updateSetting('termsAndConditions', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Employee Stock Toggle */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between min-h-[44px]">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t('showStockToEmployees')}</h3>
            <p className="text-xs text-muted-foreground">{t('showStockDesc')}</p>
          </div>
          <Switch checked={currentUser.showStockToEmployees} onCheckedChange={toggleStockVisibility} />
        </div>
      </div>

      <Button onClick={handleFirmUpdate} className="w-full min-h-[48px]">{t('saveAllSettings')}</Button>

      {/* Data Backup */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">{t('dataBackup')}</h3>
        <p className="text-xs text-muted-foreground mb-3">{t('backupDesc')}</p>
        <Button className="w-full min-h-[48px]" variant="outline"
          disabled={!!backupProgress}
          onClick={async () => {
            if (!currentUser) return;
            const { downloadFullBackup } = await import('@/lib/exportUtils');
            setBackupProgress(t('loading'));
            await downloadFullBackup(
              currentUser, users, customers.filter(c => c.userId === currentUser.id), products.filter(p => p.userId === currentUser.id),
              invoices.filter(i => i.userId === currentUser.id), payments.filter(p => p.userId === currentUser.id),
              purchases.filter(p => p.userId === currentUser.id),
              (step, total) => setBackupProgress(`${step}/${total}`)
            );
            setBackupProgress('✅ ' + t('success'));
            setTimeout(() => setBackupProgress(null), 3000);
          }}>
          {backupProgress || t('fullBackup')}
        </Button>
      </div>

      {msg && <p className="text-sm" style={{ color: msg.startsWith('✅') ? 'hsl(var(--success))' : 'hsl(var(--critical))' }}>{msg}</p>}

      {/* Sync Status */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">🔄 Sync Status</h3>
        <SyncStatusSection />
      </div>
    </div>
  );
}

function SyncStatusSection() {
  const [info, setInfo] = useState<any>(null);

  useState(() => {
    import('@/lib/syncEngine').then(mod => {
      mod.getSyncInfo().then(setInfo);
      mod.onSyncChange(setInfo);
    });
  });

  if (!info) return <p className="text-xs text-muted-foreground">Loading...</p>;

  const statusText: Record<string, string> = {
    synced: '🟢 All synced',
    syncing: '🔄 Syncing...',
    pending: `🟡 ${info.pendingCount} items pending`,
    offline: '🔴 Offline',
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-foreground">{statusText[info.state] || info.state}</p>
      {info.lastSyncedAt && (
        <p className="text-xs text-muted-foreground">Last sync: {new Date(info.lastSyncedAt).toLocaleString('en-IN')}</p>
      )}
      {Object.keys(info.pendingByTable).length > 0 && (
        <div className="space-y-1 pt-1">
          {Object.entries(info.pendingByTable).map(([table, count]) => (
            <div key={table} className="flex items-center justify-between text-xs">
              <span className="capitalize text-foreground">{table.replace(/_/g, ' ')}</span>
              <span className="text-muted-foreground">{count as number}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
