/**
 * PlanCard — carte du forfait actif (AbonnementModal).
 * Présentation pure ; le contenu provient de `plan`.
 */

export interface SubscriptionPlan {
  name: string;
  /** Montant déjà formaté (ex. « 15 000 »). */
  priceLabel: string;
  /** Périodicité affichée (ex. « FCFA / mois »). */
  period: string;
  /** Ligne d'échéance (démonstration). */
  nextBilling: string;
  features: string[];
}

export interface PlanCardProps {
  plan: SubscriptionPlan;
}

export function PlanCard({ plan }: PlanCardProps) {
  return (
    <div className="p-4 rounded-xl bg-slate-900 text-white shadow-md relative overflow-hidden border border-slate-800">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30">
          Plan Actif
        </span>
        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Renouvellement auto
        </span>
      </div>

      <div className="mt-2.5">
        <h3 className="font-display font-bold text-xl text-white">{plan.name}</h3>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="font-display font-bold text-2xl text-emerald-400 font-num">
            {plan.priceLabel}
          </span>
          <span className="text-xs text-slate-300">{plan.period}</span>
        </div>
        <p className="text-xs text-slate-300 mt-1">{plan.nextBilling}</p>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
        {plan.features.map((feature) => (
          <div key={feature} className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-emerald-400">check</span>
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
