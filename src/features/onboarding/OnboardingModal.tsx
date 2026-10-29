import { useState } from 'react';
import { t } from '@/content';
import { describeError } from '@/services';
import { completeOnboarding, needsOnboarding } from '@/store/onboarding';
import { useSessionStore } from '@/store/useSessionStore';
import { useUiStore } from '@/store/useUiStore';
import { Button, Icon, Input, Modal } from '@/ui';

/**
 * Mise en route (RG-A04) : **2 étapes courtes**, jamais bloquantes.
 *
 * Le commerce naît sous « Mon commerce » et le compte est utilisable tout de
 * suite ; ces deux étapes servent à ce que le premier ticket porte le bon nom et
 * les bonnes coordonnées. « Plus tard » ferme la modale pour la session en cours
 * sans rien perdre — l'accueil garde la checklist de démarrage.
 */
export function OnboardingModal() {
  const session = useSessionStore((state) => state.session);
  const showToast = useUiStore((state) => state.showToast);
  const [dismissed, setDismissed] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const business = session?.business;
  const [name, setName] = useState(() => (business && business.name !== t.auth.googleDefaultOrg ? business.name : ''));
  const [city, setCity] = useState(business?.city ?? '');
  const [phone, setPhone] = useState(business?.phone || session?.user.phone || '');
  const [activity, setActivity] = useState(business?.activity ?? '');

  if (dismissed || !session || session.role === 'cashier' || !needsOnboarding(session.business)) return null;

  const next = () => {
    if (name.trim().length < 2) {
      setError(t.auth.errors.required);
      return;
    }
    setError(null);
    setStep(2);
  };

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      await completeOnboarding({ name: name.trim(), city: city.trim(), phone: phone.trim(), activity: activity.trim() });
      showToast(t.onboarding.done, 'success');
    } catch (caught) {
      setError(describeError(caught).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => setDismissed(true)}
      title={t.onboarding.title}
      icon="rocket_launch"
      size="md"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <span>{t.onboarding.step(step, 2)}</span>
          <span className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
            <span className="block h-full bg-ink-900 transition-all" style={{ width: step === 1 ? '50%' : '100%' }} />
          </span>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 text-sm text-rose-700">
            <Icon name="error" size={18} />
            {error}
          </div>
        )}

        {step === 1 ? (
          <>
            <div>
              <h2 className="font-display font-bold text-lg text-ink-900">{t.onboarding.step1Title}</h2>
              <p className="text-sm text-slate-500 mt-1">{t.onboarding.step1Text}</p>
            </div>
            <Input
              label={t.onboarding.name}
              name="onboarding-name"
              value={name}
              autoFocus
              required
              icon="storefront"
              placeholder={t.auth.orgNamePlaceholder}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
            />
            <Button type="button" size="lg" fullWidth iconRight="arrow_forward" onClick={next}>
              {t.onboarding.next}
            </Button>
          </>
        ) : (
          <>
            <div>
              <h2 className="font-display font-bold text-lg text-ink-900">{t.onboarding.step2Title}</h2>
              <p className="text-sm text-slate-500 mt-1">{t.onboarding.step2Text}</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label={t.onboarding.city} name="onboarding-city" value={city} onChange={(e) => setCity(e.target.value)} />
              <Input
                label={t.onboarding.phone}
                name="onboarding-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t.auth.phonePlaceholder}
              />
            </div>
            <Input
              label={t.onboarding.activity}
              name="onboarding-activity"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder={t.auth.activityPlaceholder}
            />
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="lg" icon="arrow_back" onClick={() => setStep(1)}>
                {t.onboarding.back}
              </Button>
              <Button type="button" size="lg" fullWidth loading={pending} icon="check" onClick={() => void submit()}>
                {t.onboarding.finish}
              </Button>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-xs font-semibold text-slate-500 hover:text-ink-900 cursor-pointer"
        >
          {t.onboarding.later}
        </button>
      </div>
    </Modal>
  );
}
