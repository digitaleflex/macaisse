import React from 'react';
import { SaleTransaction, CartItem } from '../types';
import { APP_LOGO } from '../data/initialData';

interface ReceiptModalProps {
  sale: SaleTransaction | null;
  cartItems?: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  cartItems,
  isOpen,
  onClose,
  onShowToast,
}) => {
  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    onShowToast(`Ticket ${sale.saleNumber} envoyé à l'imprimante Bluetooth !`);
  };

  const handleShareWhatsApp = () => {
    onShowToast(`Reçu numérique du ticket ${sale.saleNumber} partagé sur WhatsApp !`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200/80 max-h-[92vh]">
        {/* Ticket Header Actions */}
        <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-emerald-400">receipt</span>
            <span className="font-display font-bold text-xs text-white">
              Ticket de Caisse Numérique
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Paper Receipt Simulation */}
        <div className="p-5 flex-1 overflow-y-auto bg-white text-slate-900 flex flex-col font-mono text-xs">
          {/* Merchant Stamp */}
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

          {/* Ticket Meta */}
          <div className="py-2.5 border-b border-dashed border-slate-300 flex flex-col gap-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Ticket :</span>
              <span className="font-bold text-slate-900 font-num">{sale.saleNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date &amp; Heure :</span>
              <span className="font-medium text-slate-900">24/10/2024 - {sale.time}</span>
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

          {/* Items Table */}
          <div className="py-3 border-b border-dashed border-slate-300 flex flex-col gap-2">
            <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 pb-1 border-b border-dashed border-slate-200">
              <span>Désignation</span>
              <span>Total</span>
            </div>

            {cartItems && cartItems.length > 0 ? (
              cartItems.map((it) => (
                <div key={it.product.id} className="flex justify-between items-start text-xs">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="font-bold truncate text-slate-900">{it.product.name}</span>
                    <span className="text-[10px] text-slate-500">
                      {it.quantity} x {it.product.price.toLocaleString('fr-FR')} F
                    </span>
                  </div>
                  <span className="font-bold font-num text-right shrink-0">
                    {(it.product.price * it.quantity).toLocaleString('fr-FR')} F
                  </span>
                </div>
              ))
            ) : (
              <div className="flex justify-between items-center text-xs">
                <span>Articles divers ({sale.itemsCount || 3} art.)</span>
                <span className="font-bold font-num">{sale.amount.toLocaleString('fr-FR')} F</span>
              </div>
            )}
          </div>

          {/* Total Calculation */}
          <div className="py-3 border-b border-dashed border-slate-300 flex flex-col gap-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Sous-total HT :</span>
              <span className="font-num">{sale.amount.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">TVA (Régime Forfaitaire) :</span>
              <span className="font-num">0 FCFA</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 mt-1 border-t border-dashed border-slate-200">
              <span>TOTAL NET :</span>
              <span className="font-num text-base font-extrabold">
                {sale.amount.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
            <div className="flex justify-between text-[11px] pt-1">
              <span className="text-slate-500">Règlement :</span>
              <span className="font-semibold text-emerald-700">{sale.paymentMethod}</span>
            </div>
          </div>

          {/* Barcode & Footer */}
          <div className="pt-4 flex flex-col items-center text-center">
            {/* Simulated Clean Thermal Barcode */}
            <div className="flex items-center justify-center gap-0.5 h-10 w-44 bg-transparent mb-1">
              {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 3, 1, 4, 2, 1, 3, 2].map((w, i) => (
                <div
                  key={i}
                  className="h-full bg-slate-900"
                  style={{ width: `${w * 1.8}px` }}
                />
              ))}
            </div>
            <span className="text-[10px] tracking-widest text-slate-500 font-num">
              *POS-{sale.saleNumber.replace('#', '')}-2024*
            </span>
            <p className="text-[10px] text-slate-500 mt-2 font-sans font-medium">
              Merci pour votre confiance et à très bientôt !
            </p>
          </div>
        </div>

        {/* Action Buttons: Print & WhatsApp */}
        <div className="p-3 bg-slate-50 border-t border-slate-200/80 grid grid-cols-2 gap-2">
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
      </div>
    </div>
  );
};
