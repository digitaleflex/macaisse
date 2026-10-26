import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from '@/services/http/ApiError';
import { useStepUpStore, withStepUp } from '../stepUp';

/**
 * D9 — une action sensible refusée en `STEP_UP_REQUIRED` doit être rejouée
 * **une seule fois** après confirmation, sans jamais déconnecter.
 */
describe('withStepUp', () => {
  beforeEach(() => {
    useStepUpStore.setState({ open: false });
  });

  it('rejoue l’action après confirmation', async () => {
    let calls = 0;
    const action = async (): Promise<string> => {
      calls += 1;
      if (calls === 1) throw new ApiError('Confirmez votre identité.', 401, 'STEP_UP_REQUIRED');
      return 'ok';
    };

    const pending = withStepUp(action);
    await Promise.resolve();
    expect(useStepUpStore.getState().open).toBe(true);

    useStepUpStore.getState().resolve(true);
    await expect(pending).resolves.toBe('ok');
    expect(calls).toBe(2);
  });

  it('ne rejoue pas quand l’utilisateur annule', async () => {
    let calls = 0;
    const action = async (): Promise<string> => {
      calls += 1;
      throw new ApiError('Confirmez votre identité.', 401, 'STEP_UP_REQUIRED');
    };

    const pending = withStepUp(action);
    await Promise.resolve();
    useStepUpStore.getState().resolve(false);

    await expect(pending).rejects.toMatchObject({ code: 'STEP_UP_REQUIRED' });
    expect(calls).toBe(1);
  });

  it('propage les autres erreurs sans ouvrir de modale', async () => {
    const action = async (): Promise<void> => {
      throw new ApiError('Interdit', 403, 'FORBIDDEN');
    };

    await expect(withStepUp(action)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(useStepUpStore.getState().open).toBe(false);
  });
});
