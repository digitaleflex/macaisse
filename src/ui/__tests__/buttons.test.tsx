/**
 * Garde-fous de composants — P3.3.
 *
 * On verrouille ce qui a été décidé pendant la refonte : CTA `brand` conforme AA,
 * recette `disabled` partagée, `IconButton` toujours nommé, `ghost-dark` réservé
 * aux surfaces sombres, `danger-soft` d'icône transparent au repos, et séparation
 * `zest` (sombre) / `zest-soft` (clair).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '../Badge';
import { Button, IconButton } from '../Button';

describe('Button', () => {
  it('rend le CTA brand sur brand-700 (blanc conforme AA)', () => {
    render(<Button variant="brand">Valider</Button>);
    const button = screen.getByRole('button', { name: 'Valider' });
    expect(button.className).toContain('bg-brand-700');
    expect(button.className).toContain('text-white');
  });

  it('est désactivé pendant le chargement', () => {
    render(<Button loading>Enregistrer</Button>);
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('applique la recette disabled partagée', () => {
    render(<Button disabled>Fermer</Button>);
    const { className } = screen.getByRole('button');
    expect(className).toContain('disabled:opacity-50');
    expect(className).toContain('disabled:cursor-not-allowed');
  });
});

describe('IconButton', () => {
  it('expose un nom accessible depuis label', () => {
    render(<IconButton icon="delete" label="Supprimer la dépense" />);
    const button = screen.getByRole('button', { name: 'Supprimer la dépense' });
    expect(button.getAttribute('title')).toBe('Supprimer la dépense');
  });

  it('utilise ghost-dark sur les surfaces sombres', () => {
    render(<IconButton icon="logout" label="Déconnexion" variant="ghost-dark" />);
    expect(screen.getByRole('button').className).toContain('text-slate-400');
  });

  it('garde danger-soft transparent au repos (liste dense)', () => {
    render(<IconButton icon="delete" label="Retirer" variant="danger-soft" />);
    const { className } = screen.getByRole('button');
    expect(className).toContain('text-rose-700');
    // Aucun fond au repos : `hover:bg-rose-50` est autorisé, un `bg-rose-50` nu ne l'est pas.
    expect(className).not.toMatch(/(^|\s)bg-rose-50(\s|$)/);
  });

  it('partage la recette disabled de Button', () => {
    render(<IconButton icon="close" label="Fermer" disabled />);
    expect(screen.getByRole('button').className).toContain('disabled:opacity-50');
  });
});

describe('Badge', () => {
  it('réserve zest aux surfaces sombres', () => {
    render(<Badge tone="zest">Pro</Badge>);
    expect(screen.getByText('Pro').className).toContain('text-zest-300');
  });

  it('utilise ink-900 pour zest-soft sur surface claire', () => {
    render(<Badge tone="zest-soft">Nouveau</Badge>);
    const { className } = screen.getByText('Nouveau');
    expect(className).toContain('text-ink-900');
    expect(className).not.toContain('text-zest-300');
  });
});
