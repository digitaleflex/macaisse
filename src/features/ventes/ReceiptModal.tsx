import { Modal } from '@/ui';
import { useUiStore } from '@/store/useUiStore';
import { APP_LOGO } from '@/data/seed';
import { formatFCFA } from '@/domain/money';
import { formatTime, parseDate, toIsoDate } from '@/domain/dates';

/**
 * Reçu (ticket de caisse numérique) d'une vente validée. L'en-tête sombre est
 * fourni par la primitive `<Modal headerVariant="dark">`.
 *
 * Modale GLOBALE pilotée par `useUiStore.receipt` (montée une seule fois dans
 * `App.tsx`) : les vues ne détiennent plus d'état de reçu local. `receipt`
 * pouvant porter un snapshot de lignes vide (vente rechargée depuis l'historique,
 * qui ne conserve pas le détail), la modale retombe alors sur `itemsCount`.
 *
 * Toutes les valeurs propres à la transaction (date, heure, code-barres,
 * montants, nombre d'articles) sont DÉRIVÉES de la `SaleTransaction` reçue —
 * aucun littéral de date/document n'est inventé.
 *
 * L'impression et le partage WhatsApp sont des actions SIMULÉES (aucun matériel
 * ni passerelle n'existe dans cette SPA) : les boutons restent présents mais
 * affichent un toast honnête — aucun succès n'est feint. L'identité du commerce,
 * le caissier et la TVA ne sont pas modélisés par l'application : ils sont
 * signalés comme valeurs de démonstration dans le ticket (voir pied de page).
 */

const BARCODE_WIDTHS = [3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 3, 1, 4, 2, 1, 3, 2];

export function ReceiptModal() {
  const receipt = useUiStore((state) => state.receipt);
  const closeReceipt = useUiStore((state) => state.closeReceipt);
  const showToast = useUiStore((state) => state.showToast);

  // Aucun reçu mémorisé ⇒ la modale ne rend rien (équivalent de `!open`).
  if (!receipt) return null;
  const { sale, items: cartItems } = receipt;

  // Valeurs réelles issues de la transaction. `sale.date` peut être une date ISO
  // (« 2026-10-18 ») ou un libellé relatif historique (« Aujourd'hui ») : on
  // formate la date ISO, sinon on affiche la valeur telle que stockée — jamais
  // de constante inventée.
  const parsedDate = parseDate(sale.date);
  const dateLabel = parsedDate !== null ? toIsoDate(parsedDate) : sale.date;
  const timeLabel = sale.time !== '' ? sale.time : parsedDate !== null ? formatTime(parsedDate) : '';
  const barcodeToken = sale.saleNumber.replace('#', '');
  const barcodeYear = parsedDate !== null ? toIsoDate(parsedDate).slice(0, 4) : null;
  const barcodeText =
    barcodeYear !== null ? `*POS-${barcodeToken}-${barcodeYear}*` : `*POS-${barcodeToken}*`;

  const handlePrint = () => {
    showToast(
      `Impression simulée : le ticket ${sale.saleNumber} n'a été envoyé à aucune imprimante (démo).`
    );
  };

  const handleShareWhatsApp = () => {
    showToast(`Partage WhatsApp simulé : le ticket ${sale.saleNumber} n'a pas été envoyé (démo).`);
  };

  return (
    <Modal
      open
      onClose={closeReceipt}
      title="Ticket de Caisse Numérique"
      subtitle={sale.saleNumber}
      icon="receipt"
      headerVariant="dark"
      size="sm"
      footer={
        <div className="grid grid-cols-2 gap-2 w-full">
          <button
            type="button"
            onClick={handlePrint}
            className="h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>Imprimer Ticket</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
            <span>WhatsApp</span>
          </button>
        </div>
      }
    >
      {/* Papier thermique simulé */}
      <div className="bg-white text-slate-900 flex flex-col font-mono text-xs">
        {/* Cachet commerçant */}
        <div className="text-center pb-3 border-b border-dashed border-slate-300 flex flex-col items-center">
          <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center p-1.5 mb-1.5 shadow-sm">
            <img
              src={APP_LOGO}
              alt="Logo"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h2 className="font-display font-bold text-sm tracking-tight text-slate-900">
            BOUTIQUE ÉTOILE
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">Alimentation Générale &amp; Dépôt</p>
          <p className="text-[10px] text-slate-500">Avenue Lamine Guèye, Dakar</p>
          <p className="text-[10px] text-slate-500">Tél: +221 33 821 44 00 • NINEA: 0048912</p>
        </div>

        {/* Métadonnées du ticket */}
        <div className="py-2.5 border-b border-dashed border-slate-300 flex flex-col gap-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-500">Ticket :</span>
            <span className="font-bold text-slate-900 font-num">{sale.saleNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Date &amp; Heure :</span>
            <span className="font-medium text-slate-900">
              {dateLabel}
              {timeLabel !== '' ? ` - ${timeLabel}` : ''}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Caissier :</span>
            <span className="font-medium text-slate-900">Mamadou K. (Caisse #01)</span>
          </div>
          {sale.clientName && (
            <div className="flex justify-between">
              <span className="text-slate-500">Client :</span>
              <span className="font-bold text-slate-900">{sale.clientName}</span>
            </div>
          )}
        </div>

        {/* Lignes d'articles */}
        <div className="py-3 border-b border-dashed border-slate-300 flex flex-col gap-2">
          <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 pb-1 border-b border-dashed border-slate-200">
            <span>Désignation</span>
            <span>Total</span>
          </div>

          {cartItems.length > 0 ? (
            cartItems.map((line) => (
              <div key={line.productId} className="flex justify-between items-start text-xs">
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="font-bold truncate text-slate-900">{line.name}</span>
                  <span className="text-[10px] text-slate-500">
                    {line.quantity} x {formatFCFA(line.price, { withSuffix: false })} F
                  </span>
                </div>
                <span className="font-bold font-num text-right shrink-0">
                  {formatFCFA(line.price * line.quantity, { withSuffix: false })} F
                </span>
              </div>
            ))
          ) : (
            <div className="flex justify-between items-center text-xs">
              <span>Articles divers ({sale.itemsCount} art.)</span>
              <span className="font-bold font-num">
                {formatFCFA(sale.amount, { withSuffix: false })} F
              </span>
            </div>
          )}
        </div>

        {/* Calcul du total */}
        <div className="py-3 border-b border-dashed border-slate-300 flex flex-col gap-1 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Sous-total HT :</span>
            <span className="font-num">{formatFCFA(sale.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">TVA (Régime Forfaitaire) :</span>
            <span className="font-num">0 FCFA</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 mt-1 border-t border-dashed border-slate-200">
            <span>TOTAL NET :</span>
            <span className="font-num text-base font-extrabold">{formatFCFA(sale.amount)}</span>
          </div>
          <div className="flex justify-between text-[11px] pt-1">
            <span className="text-slate-500">Règlement :</span>
            <span className="font-semibold text-emerald-700">{sale.paymentMethod}</span>
          </div>
        </div>

        {/* Code-barres & pied de page */}
        <div className="pt-4 flex flex-col items-center text-center">
          <div className="flex items-center justify-center gap-0.5 h-10 w-44 bg-transparent mb-1">
            {BARCODE_WIDTHS.map((width, index) => (
              <div
                key={index}
                className="h-full bg-slate-900"
                style={{ width: `${width * 1.8}px` }}
              />
            ))}
          </div>
          <span className="text-[10px] tracking-widest text-slate-500 font-num">
            {barcodeText}
          </span>
          <p className="text-[10px] text-slate-500 mt-2 font-sans font-medium">
            Merci pour votre confiance et à très bientôt !
          </p>
          <p className="text-[10px] text-slate-400 mt-1 font-sans">
            Démo : identité du commerce, caissier et TVA ne sont pas configurés par l&apos;application.
          </p>
        </div>
      </div>
    </Modal>
  );
}
