import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { getSubscriptionStatus, MASTER_KEY } from '@/lib/subscription';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileText, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { users, setCurrentUser, setUsers } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetMethod, setResetMethod] = useState<'master' | 'old' | null>(null);
  const [resetUsername, setResetUsername] = useState('');
  const [masterKey, setMasterKey] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  const handleLogin = () => {
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) { setError('Galat username ya password!'); return; }
    if (!user.active) { setError('Aapka account inactive hai. Admin se sampark karein.'); return; }

    // Check parent user subscription for employees
    let subEnd = user.subscriptionEnd;
    if (user.role === 'employee' && user.parentUserId) {
      const parent = users.find(u => u.id === user.parentUserId);
      if (parent) {
        subEnd = parent.subscriptionEnd;
        if (!parent.active) { setError('Aapke business owner ka account inactive hai.'); return; }
      }
    }

    const sub = getSubscriptionStatus(subEnd);
    if (sub.status === 'expired' && user.role !== 'admin') {
      setError('Aapki subscription khatam ho gayi! Admin se sampark karein.');
      return;
    }
    setCurrentUser(user);
  };

  const handleReset = () => {
    const user = users.find(u => u.username === resetUsername);
    if (!user) { setResetMsg('User nahi mila!'); return; }
    if (newPassword !== confirmPassword) { setResetMsg('Passwords match nahi karte!'); return; }
    if (newPassword.length < 4) { setResetMsg('Password kam se kam 4 characters ka hona chahiye!'); return; }

    if (resetMethod === 'master') {
      if (masterKey !== MASTER_KEY) { setResetMsg('Galat Master Key!'); return; }
    } else {
      if (oldPassword !== user.password) { setResetMsg('Purana password galat hai!'); return; }
    }

    setUsers(prev => prev.map(u => u.username === resetUsername ? { ...u, password: newPassword } : u));
    setResetMsg('Password badal diya gaya! Ab login karein.');
    setTimeout(() => { setShowReset(false); setResetMsg(''); }, 2000);
  };

  if (showReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="glass-card w-full max-w-md p-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Password Reset</h1>
          </div>

          <Input placeholder="Username" value={resetUsername} onChange={e => setResetUsername(e.target.value)} className="mb-3" />

          {!resetMethod && (
            <div className="flex gap-2 mb-4">
              <Button onClick={() => setResetMethod('master')} variant="outline" className="flex-1">Master Key se</Button>
              <Button onClick={() => setResetMethod('old')} variant="outline" className="flex-1">Purane Password se</Button>
            </div>
          )}

          {resetMethod === 'master' && (
            <Input placeholder="Master Key daalein" value={masterKey} onChange={e => setMasterKey(e.target.value)} className="mb-3" type="password" />
          )}
          {resetMethod === 'old' && (
            <Input placeholder="Purana Password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="mb-3" type="password" />
          )}

          {resetMethod && (
            <>
              <Input placeholder="Naya Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mb-3" type="password" />
              <Input placeholder="Naya Password Confirm" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mb-3" type="password" />
              <Button onClick={handleReset} className="w-full mb-3">Password Badlein</Button>
            </>
          )}

          {resetMsg && <p className="text-sm text-center mb-3" style={{ color: resetMsg.includes('badal') ? 'hsl(var(--success))' : 'hsl(var(--critical))' }}>{resetMsg}</p>}
          <Button variant="ghost" onClick={() => { setShowReset(false); setResetMethod(null); }} className="w-full">← Login pe wapas jaayein</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="glass-card w-full max-w-md p-8 animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">BillSaathi</h1>
          <p className="text-muted-foreground mt-1">GST Billing ka Smart Saathi</p>
        </div>

        <div className="space-y-4">
          <Input placeholder="Username" value={username} onChange={e => { setUsername(e.target.value); setError(''); }} />
          <div className="relative">
            <Input
              placeholder="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && <p className="text-sm text-critical">{error}</p>}

          <Button onClick={handleLogin} className="w-full">Login Karein</Button>

          <button onClick={() => setShowReset(true)} className="w-full text-sm text-muted-foreground hover:text-primary transition-colors">
            Password bhool gaye?
          </button>
        </div>

        <div className="mt-6 pt-4 border-t text-xs text-muted-foreground text-center space-y-1">
          <p>Demo Logins:</p>
          <p>Admin: admin / admin123</p>
          <p>User: rajesh / rajesh123 (5 din bache)</p>
          <p>User: sunita / sunita123 (200 din)</p>
          <p>Employee: mohan / mohan123</p>
        </div>
      </div>
    </div>
  );
}
