import { useEffect, useState, type FormEvent } from 'react';
import type { DemoAccount, GoogleIdentity, SignupInput } from '@/types';
import { t } from '@/content';
import { isDemoMode } from '@/config/env';
import { isApiError } from '@/services';
import { login, loadDemoAccounts, signInWithGoogle, signup } from '@/store/auth';
import { useUiStore } from '@/store/useUiStore';
import { Avatar, Badge, BrandMark, Button, Icon, Input, SegmentedControl } from '@/ui';

/**
 * Écran d'accès : connexion, création d'un commerce (inscription) et, en mode
 * démo, comptes prêts à l'emploi pour tester les rôles et les organisations.
 *
 * Principes (docs/AUTH_DECISIONS.md, décision D3/D4) :
 * - Google d'abord : un tap, aucun mot de passe à retenir, 0 FCFA côté coût ;
 * - formulaire court : 5 champs, téléphone/ville/activité différés à l'espace ;
 * - erreurs par champ, mot de passe affichable, `autoComplete` renseigné ;
 * - la connexion par téléphone (OTP) arrive avec D2, en conversation WhatsApp.
 */
type Mode = 'login' | 'signup';
type FieldKey = 'firstName' | 'lastName' | 'email' | 'password' | 'organizationName';
type FieldErrors = Partial<Record<FieldKey, string>>;

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

/** Longueur minimale serveur (D4) : la longueur remplace la complexité imposée. */
const MIN_PASSWORD = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Identité Google simulée (démo uniquement) : elle rejoue ce que renverrait le
 * sélecteur de compte Google. En production, le bouton ouvre le consentement
 * Google et le serveur échange le code PKCE — aucune identité ne transite par le
 * client (décision D3, `docs/AUTH_DECISIONS.md`).
 */
const DEMO_GOOGLE_IDENTITY: GoogleIdentity = {
  email: 'awa.ndiaye@gmail.com',
  firstName: 'Awa',
  lastName: 'Ndiaye',
};

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
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);

  useEffect(() => {
    let alive = true;
    loadDemoAccounts()
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

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setErrors({});
    setShowPassword(false);
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: FieldErrors = {};
    if (!EMAIL_PATTERN.test(email.trim())) next.email = t.auth.errors.emailInvalid;
    if (password.length === 0) next.password = t.auth.errors.required;
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    void run(() => login({ email: email.trim(), password }));
  };

  const handleSignup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: FieldErrors = {};
    if (form.firstName.trim().length === 0) next.firstName = t.auth.errors.required;
    if (form.lastName.trim().length === 0) next.lastName = t.auth.errors.required;
    if (!EMAIL_PATTERN.test(form.email.trim())) next.email = t.auth.errors.emailInvalid;
    if (form.password.length < MIN_PASSWORD) next.password = t.auth.errors.passwordShort;
    if (form.organizationName.trim().length === 0) next.organizationName = t.auth.errors.required;
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    // Téléphone, ville et activité sont collectés après l'ouverture de l'espace
    // (RG-A04) : les envoyer vides évite un formulaire de 8 champs.
    void run(
      () => signup({ ...form, phone: '', activity: '', city: '', email: form.email.trim() }),
      form.firstName
    );
  };

  const handleGoogle = () => {
    void run(() => signInWithGoogle(DEMO_GOOGLE_IDENTITY), DEMO_GOOGLE_IDENTITY.firstName);
  };

  const field = (key: FieldKey) => ({
    value: form[key],
    error: errors[key],
    onChange: (event: { target: { value: string } }) => {
      const value = event.target.value;
      setForm((previous) => ({ ...previous, [key]: value }));
      setErrors((previous) => (previous[key] === undefined ? previous : { ...previous, [key]: undefined }));
    },
  });

  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword((visible) => !visible)}
      aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
      className="size-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-ink-900 hover:bg-slate-100 cursor-pointer"
    >
      <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
    </button>
  );

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
            onChange={switchMode}
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

          {isDemoMode && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                fullWidth
                icon="account_circle"
                className="mt-6"
                loading={pending}
                onClick={handleGoogle}
              >
                {t.auth.google}
              </Button>
              <p className="text-xs text-slate-500 mt-2 text-center">{t.auth.googleHint}</p>
              <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-400" aria-hidden="true">
                <span className="h-px flex-1 bg-line" />
                {t.auth.orSeparator}
                <span className="h-px flex-1 bg-line" />
              </div>
            </>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className={isDemoMode ? 'flex flex-col gap-4' : 'mt-6 flex flex-col gap-4'} noValidate>
              <Input
                label={t.auth.email}
                name="login-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                autoFocus
                required
                icon="mail"
                value={email}
                error={errors.email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrors((previous) => ({ ...previous, email: undefined }));
                }}
                placeholder={t.auth.emailPlaceholder}
              />
              <Input
                label={t.auth.password}
                name="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                icon="lock"
                value={password}
                error={errors.password}
                action={passwordToggle}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrors((previous) => ({ ...previous, password: undefined }));
                }}
              />
              <Button type="submit" variant="primary" size="lg" fullWidth loading={pending} iconRight="arrow_forward">
                {t.auth.submit}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className={isDemoMode ? 'flex flex-col gap-4' : 'mt-6 flex flex-col gap-4'} noValidate>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t.auth.sectionAccount}</div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input label={t.auth.firstName} name="signup-first" autoComplete="given-name" required {...field('firstName')} />
                <Input label={t.auth.lastName} name="signup-last" autoComplete="family-name" required {...field('lastName')} />
              </div>
              <Input
                label={t.auth.email}
                name="signup-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                icon="mail"
                required
                placeholder={t.auth.emailPlaceholder}
                {...field('email')}
              />
              <Input
                label={t.auth.password}
                name="signup-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                icon="lock"
                action={passwordToggle}
                hint={t.auth.passwordHint}
                placeholder={t.auth.passwordPlaceholder}
                {...field('password')}
              />
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 pt-2">{t.auth.sectionBusiness}</div>
              <Input
                label={t.auth.orgName}
                name="signup-org"
                autoComplete="organization"
                icon="storefront"
                required
                placeholder={t.auth.orgNamePlaceholder}
                {...field('organizationName')}
              />
              <p className="text-xs text-slate-500 -mt-1">{t.auth.signupLaterHint}</p>
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
