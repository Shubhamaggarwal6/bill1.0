import { getSubscriptionStatus, formatDate } from '@/lib/subscription';

interface Props {
  endDate: string;
  compact?: boolean;
}

export default function SubscriptionBadge({ endDate, compact }: Props) {
  const sub = getSubscriptionStatus(endDate);
  const badgeClass = sub.status === 'active' ? 'badge-success'
    : sub.status === 'warning' ? 'badge-warning'
    : sub.status === 'critical' ? 'badge-critical'
    : 'badge-expired';

  if (compact) {
    return <span className={badgeClass}>{sub.label}</span>;
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Subscription</p>
          <p className="text-sm font-medium text-foreground">{formatDate(endDate)} tak</p>
        </div>
        <span className={badgeClass}>{sub.label}</span>
      </div>
    </div>
  );
}
