// app/venda/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

type Product = {
  id: number;
  name: string;
  category: string;
  image_url?: string | null;
  image_alt?: string | null;
};

type Variant = {
  variant_id: number;
  product_id: number;
  variant: string;
  price: number | string;   // pode vir string do banco
  quantity: number | string;
};

type CartItem = {
  variant_id: number;
  name: string;
  size: string;
  price: number;
  qty: number;
  product_id: number;
};

const SELLERS = ['Deh', 'Keu', 'Igor', 'Ricardo'] as const;
const money = (x: any) => Number(x || 0).toFixed(2);

export default function VendaPage() {
  const [seller, setSeller] = useState<(typeof SELLERS)[number]>('Deh');
  const [buyer, setBuyer] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [variantsByProduct, setVariantsByProduct] = useState<Record<number, Variant[]>>({});
  const [openProduct, setOpenProduct] = useState<Product | null>(null);
  const [pickVariant, setPickVariant] = useState<number | ''>('');
  const [pickQty, setPickQty] = useState('1');
  const [adding, setAdding] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  const total = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);

  async function loadProducts() {
    const r = await fetch('/api/products', { cache: 'no-store' });
    const data: Product[] = await r.json();
    setProducts(data);
  }
  async function loadVariants(productId: number) {
    const r = await fetch(`/api/variants?product_id=${productId}`, { cache: 'no-store' });
    const data: Variant[] = await r.json();
    setVariantsByProduct((prev) => ({ ...prev, [productId]: data }));
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function getVariantForOpenProduct(variantId: number) {
    if (!openProduct) return undefined;
    const list = variantsByProduct[openProduct.id] || [];
    return list.find(x => Number(x.variant_id) === Number(variantId));
  }

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Venda</h1>

      {/* Barra de ações */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Vendedor:
          <select value={seller} onChange={(e) => setSeller(e.target.value as any)}
            style={{ padding: 8, borderRadius: 8, border: '1px solid #333', background: '#0b0b0b', color: 'white' }}>
            {SELLERS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <input
          value={buyer} onChange={(e) => setBuyer(e.target.value)}
          placeholder="Vendido para (opcional)"
          style={{ padding: 8, borderRadius: 8, border: '1px solid #333', background: '#0b0b0b', color: 'white', minWidth: 220 }}
        />
        <div style={{ marginLeft: 'auto', fontWeight: 700 }}>Total: R$ {money(total)}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        {/* GRID de produtos */}
        <ul
          style={{
            listStyle: 'none', padding: 0, margin: 0,
            display: 'grid', gap: 12,
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          }}
        >
          {products.map((p) => (
            <li key={p.id} style={{ background: '#111', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
              <button
                onClick={async () => {
                  setOpenProduct(p);
                  setPickVariant(''); setPickQty('1');
                  await loadVariants(p.id);
                }}
                style={{ width: '100%', border: 'none', background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image_url || 'https://via.placeholder.com/400x260?text=Sem+imagem'}
                  alt={p.image_alt || p.name}
                  style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
                />
                <div style={{ padding: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{p.category}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>

        {/* Carrinho */}
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 12 }}>
          <h3 style={{ margin: 0, marginBottom: 8, fontSize: 16 }}>Itens da venda</h3>
          {cart.length === 0 && <p style={{ opacity: 0.8 }}>Nenhum item adicionado.</p>}
          {cart.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 4px', borderBottom: '1px solid #222' }}>Produto</th>
                  <th style={{ textAlign: 'center', padding: '6px 4px', borderBottom: '1px solid #222' }}>Tam.</th>
                  <th style={{ textAlign: 'right', padding: '6px 4px', borderBottom: '1px solid #222' }}>Qtd</th>
                  <th style={{ textAlign: 'right', padding: '6px 4px', borderBottom: '1px solid #222' }}>Preço</th>
                  <th style={{ textAlign: 'right', padding: '6px 4px', borderBottom: '1px solid #222' }}>Subtotal</th>
                  <th style={{ padding: '6px 4px', borderBottom: '1px solid #222' }} />
                </tr>
              </thead>
              <tbody>
                {cart.map((i, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '6px 4px', borderBottom: '1px solid #1a1a1a' }}>{i.name}</td>
                    <td style={{ padding: '6px 4px', borderBottom: '1px solid #1a1a1a', textAlign: 'center' }}>{i.size}</td>
                    <td style={{ padding: '6px 4px', borderBottom: '1px solid #1a1a1a', textAlign: 'right' }}>{i.qty}</td>
                    <td style={{ padding: '6px 4px', borderBottom: '1px solid #1a1a1a', textAlign: 'right' }}>R$ {money(i.price)}</td>
                    <td style={{ padding: '6px 4px', borderBottom: '1px solid #1a1a1a', textAlign: 'right' }}>R$ {money(i.price * i.qty)}</td>
                    <td style={{ padding: '6px 4px', borderBottom: '1px solid #1a1a1a', textAlign: 'right' }}>
                      <button
                        onClick={() => setCart(c => c.filter((_, j) => j !== idx))}
                        style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
            <strong>Total:</strong>
            <strong>R$ {money(total)}</strong>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              onClick={async () => {
                if (cart.length === 0) return alert('Adicione itens primeiro.');
                const payload = {
                  seller,
                  buyer: buyer || undefined,
                  items: cart.map(i => ({ variant_id: i.variant_id, quantity: i.qty })),
                };
                const r = await fetch('/api/sales', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                });
                if (!r.ok) {
                  let msg = '';
                  try {
                    const j = await r.json();
                    msg = j?.error || JSON.stringify(j);
                  } catch {
                    msg = await r.text();
                  }
                  alert('Erro ao concluir venda: ' + (msg || '(sem mensagem)'));
                  return;
                }
                setCart([]);
                setBuyer('');
                if (openProduct) await loadVariants(openProduct.id); // baixa estoque visível se o modal ainda estiver aberto
                alert('Venda concluída!');
              }}
              style={{ background: '#e11d48', color: 'white', border: 'none', borderRadius: 10, padding: '10px 14px', cursor: 'pointer' }}
            >
              Concluir venda
            </button>
            <button
              onClick={() => setCart([])}
              style={{ background: '#222', color: '#eaeaea', border: '1px solid #333', borderRadius: 10, padding: '10px 14px', cursor: 'pointer' }}
            >
              Limpar carrinho
            </button>
          </div>
        </div>
      </div>

      {/* Modal de seleção de tamanho/quantidade */}
      {openProduct && (
        <div
          onClick={() => setOpenProduct(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#111', color: '#eaeaea', width: '100%', maxWidth: 520, borderRadius: 12, border: '1px solid #222', padding: 16 }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>{openProduct.name}</h3>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              <span>Tamanho (mostra apenas com estoque &gt; 0)</span>
              <select
                value={pickVariant}
                onChange={(e) => setPickVariant(Number(e.target.value))}
                style={{ padding: 10, borderRadius: 10, border: '1px solid #333', background: '#0b0b0b', color: 'white' }}
              >
                <option value="">Selecione</option>
                {(variantsByProduct[openProduct.id] || [])
                  .filter(v => Number(v.quantity) > 0)
                  .map(v => (
                    <option key={Number(v.variant_id)} value={Number(v.variant_id)}>
                      {v.variant} — R$ {money(v.price)} • estoque {Number(v.quantity)}
                    </option>
                  ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span>Quantidade</span>
              <input
                value={pickQty}
                onChange={(e) => setPickQty(e.target.value)}
                inputMode="numeric"
                style={{ padding: 10, borderRadius: 10, border: '1px solid #333', background: '#0b0b0b', color: 'white' }}
              />
            </label>

            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setOpenProduct(null)}
                style={{ background: '#222', color: '#eaeaea', border: '1px solid #333', borderRadius: 10, padding: '10px 14px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                disabled={adding}
                onClick={() => {
                  const vId = Number(pickVariant);
                  const qty = Math.max(1, parseInt(pickQty || '1', 10));
                  const v = getVariantForOpenProduct(vId);

                  if (!v) {
                    alert('Selecione um tamanho válido.');
                    return;
                  }
                  const estq = Number(v.quantity);
                  if (!Number.isFinite(estq) || qty > estq) {
                    alert('Selecione uma quantidade menor ou igual ao estoque.');
                    return;
                  }

                  setAdding(true);
                  setCart(c => [
                    ...c,
                    {
                      variant_id: vId,
                      name: openProduct.name,
                      size: v.variant,
                      price: Number(v.price),
                      qty,
                      product_id: openProduct.id,
                    },
                  ]);
                  setOpenProduct(null);
                  setAdding(false);
                }}
                style={{ background: '#e11d48', color: 'white', border: 'none', borderRadius: 10, padding: '10px 14px', cursor: 'pointer' }}
              >
                Adicionar ao carrinho
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
