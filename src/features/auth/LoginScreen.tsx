import { useEffect, useState, type FormEvent } from 'react';
import type { DemoAccount, GoogleIdentity, SignupInput } from '@/types';
import { t } from '@/content';
import { isDemoMode } from '@/config/env';
import { isApiError } from '@/services';
import { login, loadDemoAccounts, signInWithGoogle, signup } from '@/store/auth';
import { useUiStore } from '@/store/useUiStore';
import { Avatar, Badge, BrandMark, Button, Icon, Input, SegmentedControl } from '@/ui';
import { GoogleButton } from './GoogleButton';

/**
 * Écran d'accès : connexion, création d'un compte (inscription) et, en mode démo,
 * comptes prêts à l'emploi pour tester les rôles et les organisations.
 *
 * Principes (docs/AUTH_DECISIONS.md) :
 * - **2 champs** à l'inscription : e-mail + mot de passe. Le nom du commerce, le
 *   nom de la personne, la ville et le téléphone sont collectés **après**
 *   l'ouverture de l'espace (RG-A04) — rien à remplir pour commencer à vendre ;
 * - Google d'abord : un tap, aucun mot de passe à retenir, 0 FCFA de coût ;
 * - erreurs par champ, mot de passe affichable, `autoComplete` renseigné ;
 * - la connexion par téléphone (OTP) arrive avec D2, en conversation WhatsApp.
 */
type Mode = 'login' | 'signup';
type FieldKey = 'email' | 'password';
type FieldErrors = Partial<Record<FieldKey, string>>;

/** Longueur minimale (D4) : la longueur remplace la complexité imposée. */
const MIN_PASSWORD = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Profil volontairement vide : complété par l'onboarding (RG-A04). */
const EMPTY_PROFILE: Pick<SignupInput, 'firstName' | 'lastName' | 'phone' | 'organizationName' | 'activity' | 'city'> = {
  firstName: '',
  lastName: '',
  phone: '',
  organizationName: '',
  activity: '',
  city: '',
};

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

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!EMAIL_PATTERN.test(email.trim())) next.email = t.auth.errors.emailInvalid;
    if (password.length === 0) next.password = t.auth.errors.required;
    else if (mode === 'signup' && password.length < MIN_PASSWORD) next.password = t.auth.errors.passwordShort;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    if (mode === 'login') {
      void run(() => login({ email: email.trim(), password }));
      return;
    }
    // Aucun nom, aucun commerce demandé : l'espace naît sous « Mon commerce » et
    // se complète à l'onboarding (RG-A04).
    void run(() => signup({ ...EMPTY_PROFILE, email: email.trim(), password }));
  };

  const handleGoogle = () => {
    void run(() => signInWithGoogle(DEMO_GOOGLE_IDENTITY), DEMO_GOOGLE_IDENTITY.firstName);
  };

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
              <GoogleButton className="mt-6" loading={pending} onClick={handleGoogle} />
              <p className="text-xs text-slate-500 mt-2 text-center">{t.auth.googleHint}</p>
              <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-400" aria-hidden="true">
                <span className="h-px flex-1 bg-line" />
                {t.auth.orSeparator}
                <span className="h-px flex-1 bg-line" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className={isDemoMode ? 'flex flex-col gap-4' : 'mt-6 flex flex-col gap-4'} noValidate>
            <Input
              label={t.auth.email}
              name="auth-email"
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
              name="auth-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              icon="lock"
              value={password}
              error={errors.password}
              hint={mode === 'signup' ? t.auth.passwordHint : undefined}
              action={passwordToggle}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrors((previous) => ({ ...previous, password: undefined }));
              }}
            />
            <Button
              type="submit"
              variant={mode === 'login' ? 'primary' : 'accent'}
              size="lg"
              fullWidth
              loading={pending}
              icon={mode === 'login' ? undefined : 'rocket_launch'}
              iconRight={mode === 'login' ? 'arrow_forward' : undefined}
            >
              {mode === 'login' ? t.auth.submit : t.auth.signupSubmit}
            </Button>
            {mode === 'signup' && (
              <p className="text-xs text-slate-500 text-center -mt-1">{t.auth.signupLaterHint}</p>
            )}
          </form>

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
