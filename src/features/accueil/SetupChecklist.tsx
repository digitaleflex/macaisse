import { t } from '@/content';
import { useProductsStore } from '@/store/useProductsStore';
import { useSalesStore } from '@/store/useSalesStore';
import { useUiStore } from '@/store/useUiStore';
import { Card, Icon } from '@/ui';

/**
 * Checklist de démarrage (RG-A04) — remplace l'atterrissage « espace vide ».
 *
 * Aucune étape ne bloque : elle pointe vers l'action réelle (créer un article,
 * encaisser, inviter un vendeur) et disparaît quand tout est fait. Les deux
 * premières sont mesurables (catalogue, ventes) ; la troisième est un conseil.
 */
export function SetupChecklist() {
  const products = useProductsStore((state) => state.products);
  const sales = useSalesStore((state) => state.sales);
  const setTab = useUiStore((state) => state.setTab);
  const openModal = useUiStore((state) => state.openModal);

  const hasProduct = products.length > 0;
  const hasSale = sales.length > 0;
  if (hasProduct && hasSale) return null;

  const items = [
    {
      key: 'product',
      done: hasProduct,
      icon: 'inventory_2',
      label: t.setup.product,
      hint: t.setup.productHint,
      action: () => setTab('stock'),
    },
    {
      key: 'sale',
      done: hasSale,
      icon: 'point_of_sale',
      label: t.setup.sale,
      hint: t.setup.saleHint,
      action: () => setTab('ventes'),
    },
    {
      key: 'team',
      done: false,
      icon: 'group_add',
      label: t.setup.team,
      hint: t.setup.teamHint,
      action: () => openModal('equipe'),
    },
  ];

  return (
    <Card className="mb-5">
      <div className="flex items-start gap-3 mb-3">
        <span className="size-9 rounded-xl bg-zest-400 text-ink-950 flex items-center justify-center shrink-0">
          <Icon name="rocket_launch" size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display font-bold text-[15px] text-ink-900">{t.setup.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t.setup.subtitle}</p>
        </div>
      </div>

      <ul className="grid sm:grid-cols-3 gap-2">
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={item.action}
              className={`w-full h-full text-left p-3 rounded-2xl border transition-colors cursor-pointer ${
                item.done
                  ? 'border-brand-200 bg-brand-50/60'
                  : 'border-line hover:border-ink-900 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon
                  name={item.done ? 'check_circle' : item.icon}
                  size={18}
                  className={item.done ? 'text-brand-700' : 'text-slate-500'}
                />
                <span className={`text-sm font-semibold ${item.done ? 'text-brand-700' : 'text-ink-900'}`}>
                  {item.label}
                </span>
              </span>
              <span className="block text-xs text-slate-500 mt-1">
                {item.done ? t.setup.done : item.hint}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
