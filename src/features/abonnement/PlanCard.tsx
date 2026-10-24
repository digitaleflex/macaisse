import type { BillingCycle, Subscription } from '@/types';
import { t } from '@/content';
import { parseDate } from '@/domain/dates';
import { formatFCFA } from '@/domain/money';
import { Badge, Icon } from '@/ui';

export interface PlanCardProps {
  subscription: Subscription;
  cycle: BillingCycle;
}

/** Carte du forfait actif — contenu issu de la session (`services/`). */
export function PlanCard({ subscription, cycle }: PlanCardProps) {
  const { plan } = subscription;
  const price = cycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  const renewal = parseDate(subscription.renewalDate);
  const renewalLabel = renewal ? renewal.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : subscription.renewalDate;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-ink-900 text-white p-5 bg-grid-ink">
      <div className="absolute -right-12 -top-12 size-44 rounded-full bg-zest-400/20 blur-3xl pointer-events-none" />
      <div className="relative flex items-center justify-between">
        <Badge tone="zest">{t.subscription.activePlan}</Badge>
        {subscription.autoRenew && (
          <span className="flex items-center gap-1.5 text-xs text-zest-400 font-semibold">
            <span className="size-2 rounded-full bg-zest-400 animate-pulse" />
            {t.subscription.autoRenew}
          </span>
        )}
      </div>
      <div className="relative mt-4">
        <h3 className="font-display font-extrabold text-2xl">{plan.name}</h3>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="font-num font-extrabold text-3xl text-zest-400">{formatFCFA(price)}</span>
          <span className="text-sm text-slate-400">{cycle === 'monthly' ? t.subscription.perMonth : t.subscription.perYear}</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">{t.subscription.nextBilling(renewalLabel, subscription.paymentMethod)}</p>
      </div>
      <ul className="relative mt-4 pt-4 border-t border-white/10 grid sm:grid-cols-2 gap-2 text-sm text-slate-300">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-2">
            <Icon name="check_circle" size={17} filled className="text-zest-400" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
