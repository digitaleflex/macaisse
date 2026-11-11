import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BillingCycle, PaymentIntent, SubscriptionPlan, TenderMethod } from '@/types';
import { t } from '@/content';
import { ONLINE_PAYMENT_METHODS } from '@/config/reference';
import { PAYMENT_POLL_INTERVAL_MS, isFinalStatus, planPrice, validatePaymentRequest } from '@/domain/billing';
import { parseDate } from '@/domain/dates';
import { createId } from '@/domain/ids';
import { formatFCFA } from '@/domain/money';
import { api, errorText, getActiveOrganization } from '@/services';
import { useCurrentSession, useSessionStore } from '@/store/useSessionStore';
import { useUiStore } from '@/store/useUiStore';
import { Badge, Button, FormError, Icon, Input, Modal, SegmentedControl, Spinner, cn } from '@/ui';
import { PaymentMethodGroup } from '../shared/PaymentMethodGroup';

/** Échecs réseau consécutifs tolérés avant d'avertir (le suivi continue). */
const NETWORK_WARNING_AFTER = 3;

const MOBILE_MONEY = ONLINE_PAYMENT_METHODS.filter((option) => option.kind === 'mobile_money');
const CARDS = ONLINE_PAYMENT_METHODS.filter((option) => option.kind === 'card');

type Phase = 'form' | 'processing' | 'done';

export interface SubscriptionPaymentModalProps {
  open: boolean;
  onClose: () => void;
  /** Cycle présélectionné (celui affiché dans l'écran d'abonnement). */
  initialCycle: BillingCycle;
}

function formatLongDate(iso: string): string {
  return (
    parseDate(iso)?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) ?? iso
  );
}

/**
 * Paiement de l'abonnement de la plateforme (propriétaire). L'écran ne calcule
 * aucun prix : il affiche celui du forfait, le serveur recalcule le montant et
 * choisit l'agrégateur (FedaPay ou KKiaPay). Le résultat n'est jamais cru sur
 * parole : on interroge la tentative jusqu'à un statut final.
 */
export function SubscriptionPaymentModal({ open, onClose, initialCycle }: SubscriptionPaymentModalProps) {
  const { user, subscription } = useCurrentSession();
  const showToast = useUiStore((state) => state.showToast);

  const [phase, setPhase] = useState<Phase>('form');
  const [plans, setPlans] = useState<SubscriptionPlan[] | null>(null);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [planId, setPlanId] = useState(subscription.plan.id);
  const [cycle, setCycle] = useState<BillingCycle>(initialCycle);
  const [method, setMethod] = useState<TenderMethod | null>(MOBILE_MONEY[0]?.method ?? null);
  const [phone, setPhone] = useState(user.phone);
  const [touched, setTouched] = useState(false);
  const [starting, setStarting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [networkIssue, setNetworkIssue] = useState(false);
  /** Identifiant de la tentative en cours de saisie : rejouer un envoi ne débite pas deux fois. */
  const attemptId = useRef(createId('payment'));

  const plan = useMemo(() => plans?.find((candidate) => candidate.id === planId) ?? null, [plans, planId]);
  const amount = plan ? planPrice(plan, cycle) : 0;
  const selectedOption = ONLINE_PAYMENT_METHODS.find((option) => option.method === method);
  const needsPhone = selectedOption?.kind === 'mobile_money';
  const issue = method ? validatePaymentRequest({ paymentMethod: method, phone }) : 'method_unsupported';
  const phoneError = touched && (issue === 'phone_required' || issue === 'phone_invalid') ? t.billing.errors[issue] : undefined;

  // Charge les forfaits à l'ouverture.
  useEffect(() => {
    if (!open || plans !== null) return;
    const orgId = getActiveOrganization();
    if (orgId === null) return;
    let cancelled = false;
    api.billing
      .plans(orgId)
      .then((list) => {
        if (!cancelled) setPlans(list);
      })
      .catch(() => {
        if (!cancelled) setPlansError(t.billing.plansError);
      });
    return () => {
      cancelled = true;
    };
  }, [open, plans]);

  /** Relit la session pour afficher la nouvelle échéance et la facture. */
  const refreshSession = useCallback(async () => {
    const orgId = getActiveOrganization();
    if (orgId === null) return;
    try {
      useSessionStore.getState().setSession(await api.session.get(orgId));
    } catch {
      // La session sera relue à la prochaine ouverture ; le paiement, lui, est acquis.
    }
  }, []);

  // Suivi d'une tentative en attente : interrogation régulière jusqu'à un statut final.
  const pendingId = phase === 'processing' && intent && !isFinalStatus(intent.status) ? intent.id : null;
  useEffect(() => {
    if (pendingId === null) return;
    const orgId = getActiveOrganization();
    if (orgId === null) return;
    let stopped = false;
    let failures = 0;
    const timer = setInterval(() => {
      api.billing
        .payment(orgId, pendingId)
        .then((next) => {
          if (stopped) return;
          failures = 0;
          setNetworkIssue(false);
          setIntent(next);
          if (isFinalStatus(next.status)) {
            setPhase('done');
            if (next.status === 'succeeded') {
              showToast(t.billing.success.toast, 'success');
              void refreshSession();
            }
          }
        })
        .catch(() => {
          if (stopped) return;
          failures += 1;
          if (failures >= NETWORK_WARNING_AFTER) setNetworkIssue(true);
        });
    }, PAYMENT_POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [pendingId, refreshSession, showToast]);

  const start = async () => {
    setTouched(true);
    setFormError(null);
    const orgId = getActiveOrganization();
    if (issue !== null || method === null || plan === null || orgId === null || starting) return;
    setStarting(true);
    try {
      const created = await api.billing.pay(orgId, {
        id: attemptId.current,
        planId: plan.id,
        cycle,
        paymentMethod: method,
        ...(needsPhone ? { phone } : {}),
      });
      setIntent(created);
      setPhase(isFinalStatus(created.status) ? 'done' : 'processing');
    } catch (error) {
      setFormError(errorText(error));
    } finally {
      setStarting(false);
    }
  };

  const cancel = async () => {
    const orgId = getActiveOrganization();
    if (orgId === null || intent === null) return;
    try {
      setIntent(await api.billing.cancel(orgId, intent.id));
      setPhase('done');
    } catch (error) {
      // Déjà terminé côté serveur (ex. payé entre-temps) : on relit l'état réel.
      try {
        const latest = await api.billing.payment(orgId, intent.id);
        setIntent(latest);
        if (isFinalStatus(latest.status)) setPhase('done');
        if (latest.status === 'succeeded') void refreshSession();
      } catch {
        setFormError(errorText(error));
      }
    }
  };

  const retry = () => {
    attemptId.current = createId('payment');
    setIntent(null);
    setNetworkIssue(false);
    setFormError(null);
    setPhase('form');
  };

  const succeeded = intent?.status === 'succeeded';
  const providerName = intent ? t.billing.provider[intent.provider] : '';
  const busy = phase === 'processing';

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={t.billing.title}
      icon="workspace_premium"
      size="lg"
    >
      {api.mode === 'mock' && (
        <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50 text-xs text-amber-800">
          <Icon name="info" size={18} className="text-amber-600" />
          {t.billing.demoNotice}
        </div>
      )}

      {phase === 'form' && (
        <div className="space-y-5">
          {plans === null ? (
            plansError ? (
              <FormError message={plansError} />
            ) : (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Spinner /> {t.billing.plansLoading}
              </div>
            )
          ) : (
            <>
              <div role="radiogroup" aria-label={t.billing.planLabel} className="grid sm:grid-cols-2 gap-2">
                {plans.map((candidate) => {
                  const active = candidate.id === planId;
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setPlanId(candidate.id)}
                      className={cn(
                        'text-left rounded-2xl border p-4 transition-all cursor-pointer',
                        active ? 'border-ink-900 ring-2 ring-ink-900/10 bg-white' : 'border-line bg-white hover:border-line-strong'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display font-bold text-ink-900">{candidate.name}</span>
                        {candidate.id === subscription.plan.id && <Badge tone="zest-soft">{t.subscription.activePlan}</Badge>}
                      </div>
                      <div className="mt-1 font-num font-extrabold text-xl text-ink-900">
                        {formatFCFA(planPrice(candidate, cycle))}
                        <span className="ml-1 text-xs font-medium text-slate-500">
                          {cycle === 'monthly' ? t.subscription.perMonth : t.subscription.perYear}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <SegmentedControl<BillingCycle>
                label={t.billing.cycleLabel}
                value={cycle}
                onChange={setCycle}
                fullWidth
                options={[
                  { value: 'monthly', label: t.subscription.monthly },
                  { value: 'yearly', label: t.subscription.yearly },
                ]}
              />

              <div role="radiogroup" aria-label={t.billing.methodLabel} className="space-y-3">
                <div className="text-[13px] font-medium text-slate-700">{t.billing.methodLabel}</div>
                <PaymentMethodGroup label={t.billing.mobileMoney} options={MOBILE_MONEY} value={method} onSelect={setMethod} />
                <PaymentMethodGroup label={t.billing.otherMethods} options={CARDS} value={method} onSelect={setMethod} />
              </div>

              {needsPhone && (
                <Input
                  label={t.billing.phoneLabel}
                  name="billing-phone"
                  type="tel"
                  icon="smartphone"
                  value={phone}
                  placeholder={t.billing.phonePlaceholder}
                  hint={t.billing.phoneHint}
                  error={phoneError}
                  onChange={(event) => setPhone(event.target.value)}
                  onBlur={() => setTouched(true)}
                />
              )}

              <p className="text-xs text-slate-500">{t.billing.secureNote}</p>
              {formError && <FormError message={formError} />}

              <Button
                variant="accent"
                size="xl"
                fullWidth
                icon="lock"
                disabled={starting || plan === null}
                onClick={() => void start()}
              >
                {starting ? t.billing.starting : t.billing.pay(formatFCFA(amount))}
              </Button>
            </>
          )}
        </div>
      )}

      {phase === 'processing' && intent && (
        <div className="space-y-4 text-center py-4" role="status" aria-live="polite">
          <div className="mx-auto size-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Spinner />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-ink-900">{t.billing.processing.title}</h3>
            <p className="text-sm text-slate-600 mt-1">
              {intent.checkout.type === 'push'
                ? t.billing.processing.push(phone.trim())
                : t.billing.processing.redirect}
            </p>
            <p className="text-xs text-slate-500 mt-2 font-num">
              {formatFCFA(intent.amount)} · {t.billing.processing.via(providerName)}
            </p>
          </div>
          {intent.checkout.type === 'redirect' && (
            <Button
              variant="secondary"
              icon="open_in_new"
              onClick={() => window.open((intent.checkout as { url: string }).url, '_blank', 'noopener,noreferrer')}
            >
              {t.billing.processing.openPage}
            </Button>
          )}
          <p className="text-xs text-slate-500">{t.billing.processing.waiting}</p>
          {networkIssue && <p className="text-xs text-amber-700">{t.billing.processing.networkIssue}</p>}
          {formError && <FormError message={formError} />}
          <Button variant="ghost" onClick={() => void cancel()}>
            {t.billing.processing.cancel}
          </Button>
        </div>
      )}

      {phase === 'done' && intent && (
        <div className="space-y-4 text-center py-4" role="status" aria-live="polite">
          <div
            className={cn(
              'mx-auto size-14 rounded-2xl flex items-center justify-center',
              succeeded ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            )}
          >
            <Icon name={succeeded ? 'check_circle' : 'error'} size={30} />
          </div>
          {succeeded ? (
            <div>
              <h3 className="font-display font-bold text-lg text-ink-900">{t.billing.success.title}</h3>
              <p className="text-sm text-slate-600 mt-1">
                {t.billing.success.text(formatLongDate(subscription.renewalDate))}
              </p>
            </div>
          ) : (
            <div>
              <h3 className="font-display font-bold text-lg text-ink-900">{t.billing.failure.title}</h3>
              <p className="text-sm text-slate-600 mt-1">
                {intent.status === 'failed'
                  ? (intent.failureReason ?? t.billing.failure.failed)
                  : intent.status === 'expired'
                    ? t.billing.failure.expired
                    : t.billing.failure.cancelled}
              </p>
            </div>
          )}
          <div className="flex justify-center gap-2">
            {!succeeded && (
              <Button variant="primary" onClick={retry}>
                {t.billing.failure.retry}
              </Button>
            )}
            <Button variant={succeeded ? 'primary' : 'secondary'} onClick={onClose}>
              {succeeded ? t.billing.success.close : t.common.close}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
