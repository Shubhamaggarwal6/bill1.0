import { useApp } from '@/contexts/AppContext';
import LoginPage from './LoginPage';
import AdminDashboard from './AdminDashboard';
import UserDashboard from './UserDashboard';
import EmployeeDashboard from './EmployeeDashboard';
import { getSubscriptionStatus } from '@/lib/subscription';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

const Index = () => {
  const { currentUser, users, setCurrentUser } = useApp();

  if (!currentUser) return <LoginPage />;

  // Expired check for user/employee
  if (currentUser.role !== 'admin') {
    let subEnd = currentUser.subscriptionEnd;
    if (currentUser.role === 'employee' && currentUser.parentUserId) {
      const parent = users.find(u => u.id === currentUser.parentUserId);
      if (parent) subEnd = parent.subscriptionEnd;
    }
    const sub = getSubscriptionStatus(subEnd);
    if (sub.status === 'expired') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="glass-card p-8 text-center max-w-md animate-fade-in">
            <AlertTriangle className="w-12 h-12 text-critical mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Subscription Khatam!</h2>
            <p className="text-muted-foreground mb-4">Aapki subscription khatam ho gayi hai. Admin se sampark karein renewal ke liye.</p>
            <Button onClick={() => setCurrentUser(null)}>Login pe wapas jaayein</Button>
          </div>
        </div>
      );
    }
  }

  switch (currentUser.role) {
    case 'admin': return <AdminDashboard />;
    case 'user': return <UserDashboard />;
    case 'employee': return <EmployeeDashboard />;
    default: return <LoginPage />;
  }
};

export default Index;
