import { useEffect, useState, type FormEvent } from 'react';
import type { DemoAccount, SignupInput } from '@/types';
import { t } from '@/content';
import { api, isApiError } from '@/services';
import { login, signup } from '@/store/auth';
import { useUiStore } from '@/store/useUiStore';
import { Avatar, Badge, BrandMark, Button, Icon, Input, SegmentedControl } from '@/ui';

/**
 * Écran d'accès : connexion, création d'un commerce (inscription) et, en mode
 * démo, comptes prêts à l'emploi pour tester les rôles et les organisations.
 */
type Mode = 'login' | 'signup';

const EMPTY_SIGNUP: SignupInput = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  organizationName: '',
  activity: '',
  city: '',
};

const MIN_PASSWORD = 8;

function errorText(error: unknown): string {
  return isApiError(error) ? error.message : t.auth.errors.generic;
}

function HeroPanel() {
  return (
    <aside className="hidden lg:flex relative overflow-hidden flex-col justify-between bg-ink-900 text-white p-12 bg-grid-ink">
      <div className="absolute -right-24 -top-24 size-96 rounded-full bg-zest-400/20 blur-3xl pointer-events-none" />
      <div className="absolute -left-24 bottom-0 size-80 rounded-full bg-brand-500/20 blur-3xl pointer-events-none" />
      <div className="relative flex items-center gap-3">
        <BrandMark className="size-11" />
        <div>
          <div className="font-display font-extrabold text-xl leading-none">{t.app.name}</div>
          <div className="text-sm text-slate-400 mt-1">{t.app.tagline}</div>
        </div>
      </div>
      <div className="relative max-w-md">
        <h1 className="font-display font-extrabold text-4xl leading-tight">{t.auth.heroTitle}</h1>
        <p className="text-slate-400 mt-4 leading-relaxed">{t.auth.heroText}</p>
        <ul className="mt-8 space-y-3">
          {t.auth.heroPoints.map((point) => (
            <li key={point} className="flex items-center gap-3 text-slate-200">
              <span className="size-7 rounded-lg bg-zest-400 text-ink-950 flex items-center justify-center">
                <Icon name="check" size={18} />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>
      <div className="relative text-xs text-slate-500">© {new Date().getFullYear()} {t.app.name}</div>
    </aside>
  );
}

export function LoginScreen() {
  const showToast = useUiStore((state) => state.showToast);
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [form, setForm] = useState<SignupInput>(EMPTY_SIGNUP);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);

  useEffect(() => {
    let alive = true;
    api.auth
      .demoAccounts()
      .then((accounts) => {
        if (alive) setDemoAccounts(accounts);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const run = async (task: () => Promise<void>, firstName?: string) => {
    setPending(true);
    setError(null);
    try {
      await task();
      if (firstName) showToast(t.auth.welcome(firstName), 'success');
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setPending(false);
    }
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run(() => login({ email, password }));
  };

  const handleSignup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.password.length < MIN_PASSWORD) {
      setError(t.auth.errors.passwordShort);
      return;
    }
    void run(() => signup(form), form.firstName);
  };

  const field = (key: keyof SignupInput) => ({
    value: form[key],
    onChange: (event: { target: { value: string } }) => setForm((previous) => ({ ...previous, [key]: event.target.value })),
  });

  return (
    <div className="min-h-dvh grid lg:grid-cols-[1fr_minmax(480px,560px)] bg-canvas">
      <HeroPanel />
      <main className="flex flex-col justify-center px-5 sm:px-10 py-10 bg-white lg:shadow-overlay">
        <div className="w-full max-w-md mx-auto">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <BrandMark className="size-10" />
            <div className="font-display font-extrabold text-lg">{t.app.name}</div>
          </div>

          <SegmentedControl
            label={t.auth.tabs.login}
            value={mode}
            onChange={(next) => {
              setMode(next);
              setError(null);
            }}
            fullWidth
            options={[
              { value: 'login', label: t.auth.tabs.login },
              { value: 'signup', label: t.auth.tabs.signup },
            ]}
          />

          <h1 className="font-display font-extrabold text-2xl text-ink-900 mt-8">
            {mode === 'login' ? t.auth.loginTitle : t.auth.signupTitle}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{mode === 'login' ? t.auth.loginSubtitle : t.auth.signupSubtitle}</p>

          {error && (
            <div role="alert" className="mt-5 flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 text-sm text-rose-700">
              <Icon name="error" size={18} />
              {error}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-4">
              <Input
                label={t.auth.email}
                name="login-email"
                type="email"
                autoComplete="email"
                icon="mail"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t.auth.emailPlaceholder}
              />
              <Input
                label={t.auth.password}
                name="login-password"
                type="password"
                autoComplete="current-password"
                icon="lock"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t.auth.passwordPlaceholder}
              />
              <Button type="submit" variant="primary" size="lg" fullWidth loading={pending} iconRight="arrow_forward">
                {t.auth.submit}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="mt-6 flex flex-col gap-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t.auth.sectionAccount}</div>
              <div className="grid grid-cols-2 gap-3">
                <Input label={t.auth.firstName} name="signup-first" required {...field('firstName')} />
                <Input label={t.auth.lastName} name="signup-last" required {...field('lastName')} />
              </div>
              <Input label={t.auth.email} name="signup-email" type="email" icon="mail" required placeholder={t.auth.emailPlaceholder} {...field('email')} />
              <div className="grid sm:grid-cols-2 gap-3">
                <Input label={t.auth.phone} name="signup-phone" type="tel" placeholder={t.auth.phonePlaceholder} {...field('phone')} />
                <Input label={t.auth.password} name="signup-password" type="password" required placeholder={t.auth.passwordPlaceholder} {...field('password')} />
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 pt-2">{t.auth.sectionBusiness}</div>
              <Input label={t.auth.orgName} name="signup-org" icon="storefront" required placeholder={t.auth.orgNamePlaceholder} {...field('organizationName')} />
              <div className="grid grid-cols-2 gap-3">
                <Input label={t.auth.activity} name="signup-activity" placeholder={t.auth.activityPlaceholder} {...field('activity')} />
                <Input label={t.auth.city} name="signup-city" placeholder={t.auth.cityPlaceholder} {...field('city')} />
              </div>
              <Button type="submit" variant="accent" size="lg" fullWidth loading={pending} icon="rocket_launch">
                {t.auth.signupSubmit}
              </Button>
            </form>
          )}

          {mode === 'login' && demoAccounts.length > 0 && (
            <section className="mt-10">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-ink-900">{t.auth.demoTitle}</h2>
                <Badge tone="info" icon="science">
                  {t.app.demoBadge}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">{t.auth.demoHint(demoAccounts[0].password)}</p>
              <ul className="mt-3 flex flex-col gap-2">
                {demoAccounts.map((account) => (
                  <li key={account.email}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void run(() => login({ email: account.email, password: account.password }))}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl border border-line hover:border-ink-900 hover:shadow-raised transition-all text-left cursor-pointer disabled:opacity-50"
                    >
                      <Avatar initials={account.initials} tone="ink" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-ink-900">{account.fullName}</span>
                        <span className="block text-xs text-slate-500 truncate">{account.email}</span>
                        <span className="flex flex-wrap gap-1 mt-1.5">
                          {account.organizations.map((org) => (
                            <Badge key={org.name} tone={org.role === 'owner' ? 'dark' : org.role === 'manager' ? 'success' : 'neutral'}>
                              {org.name} · {t.roles[org.role]}
                            </Badge>
                          ))}
                        </span>
                      </span>
                      <Icon name="login" size={20} className="text-slate-400" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
