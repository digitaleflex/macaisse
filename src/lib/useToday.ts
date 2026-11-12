import { useEffect, useState } from 'react';
import { toIsoDate } from '@/domain/dates';

/** Fréquence de vérification du changement de jour. */
export const TODAY_CHECK_INTERVAL_MS = 60_000;

/**
 * « Maintenant » pour les écrans qui découpent par jour, mois ou période.
 *
 * Une caisse reste souvent ouverte toute la nuit : une date figée au chargement
 * laisserait « Aujourd'hui » sur la veille. La valeur change au passage de minuit
 * (vérifié chaque minute) et au retour de l'application au premier plan ; **dans la
 * même journée l'objet reste identique**, donc les calculs mémorisés ne se relancent pas.
 */
export function useToday(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () =>
      setNow((previous) => {
        const next = new Date();
        return toIsoDate(next) === toIsoDate(previous) ? previous : next;
      });
    const timer = setInterval(refresh, TODAY_CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  return now;
}
