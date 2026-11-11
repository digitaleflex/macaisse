import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PaymentPad } from '../PaymentPad';

function renderPad(onValidate = vi.fn(), total = 4500) {
  render(<PaymentPad open total={total} onClose={() => undefined} onValidate={onValidate} />);
  return onValidate;
}

// Le libellé est le dernier enfant du bouton (l'icône, décorative, vient avant).
const radios = () => screen.getAllByRole('radio').map((radio) => radio.lastElementChild?.textContent);

describe('PaymentPad — mobile money en premier', () => {
  it('affiche les opérateurs mobile money avant la carte, les espèces et le crédit', () => {
    renderPad();
    expect(radios()).toEqual([
      'MTN MoMo',
      'Moov Money',
      'Orange Money',
      'Wave',
      'Celtiis Cash',
      'Carte',
      'Espèces',
      'Crédit',
    ]);
    expect(screen.getByText('Mobile Money')).toBeTruthy();
    expect(screen.getByText('Autres moyens')).toBeTruthy();
  });

  it('transmet l’identifiant stable du moyen choisi', () => {
    const onValidate = renderPad();

    fireEvent.click(screen.getByRole('radio', { name: 'Wave' }));
    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/ }));

    expect(onValidate).toHaveBeenCalledWith({ paymentMethod: 'wave', clientName: undefined, creditAmount: undefined });
  });

  it('encaisse en espèces avec le montant exact par défaut', () => {
    const onValidate = renderPad();

    fireEvent.click(screen.getByRole('radio', { name: 'Espèces' }));
    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/ }));

    expect(onValidate).toHaveBeenCalledWith(expect.objectContaining({ paymentMethod: 'cash' }));
  });

  it('exige un client et un montant pour une vente à crédit', () => {
    const onValidate = renderPad();

    fireEvent.click(screen.getByRole('radio', { name: 'Crédit' }));
    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/ }));
    expect(onValidate).not.toHaveBeenCalled();
  });
});
