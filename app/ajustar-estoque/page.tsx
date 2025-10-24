// app/ajustar-estoque/page.tsx
'use client';

import { useEffect, useState } from 'react';

type Product = {
  id: number;
  name: string;
  category: string;
  is_active: boolean;
  image_url?: string | null;
  image_alt?: string | null;
};

type Variant = {
  variant_id: number;
  product_id: number;
  variant: string;   // PP, P, M, G, GG, EG, U
  price: number;
  quantity: number;
};

const ALL_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'EG', 'U'] as const;

/* ---------- Modal simples em tela cheia ---------- */
function FullscreenModal({
  open,
  onClose,
  title,
  children,
  maxWidth = 720,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 50,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'stretch',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#111',
          color: '#eaeaea',
          width: '100%',
          height: '100%',
          maxWidth,
          margin: '0 auto',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            background: '#111',
            borderBottom: '1px solid #222',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            zIndex: 1,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="btn-secondary"
          >
            Fechar
          </button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}

export default function AjustarEstoquePage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // MODAL: adicionar produto
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [creating, setCreating] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);

  // MODAL: gerenciar tamanhos de um produto
  const [openProduct, setOpenProduct] = useState<Product | null>(null);
  const [variantsByProduct, setVariantsByProduct] = useState<Record<number, Variant[]>>({});
  const [vSize, setVSize] = useState('');
  const [vPrice, setVPrice] = useState('');
  const [vQty, setVQty] = useState('');
  const [savingVariant, setSavingVariant] = useState(false);
  const [variantMsg, setVariantMsg] = useState<string | null>(null);

  // edição inline por linha
  const [editPrice, setEditPrice] = useState<Record<number, string>>({});
  const [editQty, setEditQty] = useState<Record<number, string>>({});
  const [rowSaving, setRowSaving] = useState<Record<number, boolean>>({});

  async function loadProducts() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/products', { cache: 'no-store' });
      if (!res.ok) throw new Error('Falha ao buscar produtos');
      setItems(await res.json());
    } catch (e: any) {
      setError(e?.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function onSubmitProduct(e: React.FormEvent) {
    e.preventDefault();
    setFormMsg(null);
    if (!name.trim() || !category.trim()) {
      setFormMsg('Preencha nome e categoria.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim(),
          image_url: imageUrl.trim() || null,
          image_alt: imageAlt.trim() || null,
          is_active: isActive,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setName(''); setCategory(''); setImageUrl(''); setImageAlt(''); setIsActive(true);
      setFormMsg('✅ Produto criado!');
      setAddOpen(false);
      await loadProducts();
    } catch (e: any) {
      setFormMsg(`❌ ${e?.message || 'Erro ao criar'}`);
    } finally {
      setCreating(false);
    }
  }

  async function loadVariants(productId: number) {
    const res = await fetch(`/api/variants?product_id=${productId}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Falha ao carregar tamanhos');
    const data: Variant[] = await res.json();
    setVariantsByProduct((prev) => ({ ...prev, [productId]: data }));
  }

  async function addOrUpdateVariant(productId: number) {
    setVariantMsg(null);
    const size = vSize.trim();
    const price = parseFloat(vPrice || '');
    const qty = vQty === '' ? 0 : parseInt(vQty, 10);
    if (!size || Number.isNaN(price) || Number.isNaN(qty)) {
      setVariantMsg('Preencha tamanho, preço e quantidade.');
      return;
    }
    setSavingVariant(true);
    try {
      const res = await fetch('/api/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, variant: size, price, quantity: qty }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadVariants(productId);
      setVariantMsg('✅ Tamanho salvo!');
      setVQty('');
    } catch (e: any) {
      setVariantMsg(`❌ ${e?.message || 'Erro ao salvar tamanho'}`);
    } finally {
      setSavingVariant(false);
    }
  }

  return (
    <div className="page-wrap">
      <h1 className="title">Ajustar estoque</h1>

      {/* Botão abre modal "Adicionar produto" */}
      <div className="mb-12">
        <button onClick={() => setAddOpen(true)} className="btn-primary">
          ➕ Adicionar produto
        </button>
      </div>

      {/* GRID de miniaturas */}
      {loading && <p>Carregando…</p>}
      {error && <p className="text-error">Erro: {error}</p>}
      {!loading && items.length === 0 && <p>Nenhum produto cadastrado.</p>}

      <ul className="grid-cards">
        {items.map((p) => (
          <li key={p.id} className="card">
            <button
              onClick={async () => {
                setOpenProduct(p);
                setVSize(''); setVPrice(''); setVQty(''); setVariantMsg(null);
                setEditPrice({}); setEditQty({}); setRowSaving({});
                await loadVariants(p.id);
              }}
              className="card-button"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image_url || 'https://via.placeholder.com/400x260?text=Sem+imagem'}
                alt={p.image_alt || p.name}
                className="card-img"
              />
              <div className="card-body">
                <div className="card-title">{p.name}</div>
                <div className="card-sub">{p.category}</div>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {/* MODAL: Adicionar produto */}
      <FullscreenModal open={addOpen} onClose={() => setAddOpen(false)} title="Adicionar produto">
        <form onSubmit={onSubmitProduct} className="form-grid">
          <label className="field">
            <span>Nome *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Camiseta preta" className="input" />
          </label>

          <label className="field">
            <span>Categoria *</span>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex.: camiseta, botton, cd, fita…" className="input" />
          </label>

          <label className="field">
            <span>URL da imagem (opcional)</span>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://seusite.com/imagens/camiseta.png" className="input" />
          </label>

          <label className="field">
            <span>Texto alternativo (opcional)</span>
            <input value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} placeholder="Camiseta preta" className="input" />
          </label>

          <label className="checkbox">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Produto ativo
          </label>

          <div className="row-actions">
            <button type="submit" disabled={creating} className="btn-primary">
              {creating ? 'Salvando…' : 'Salvar produto'}
            </button>
            <button type="button" onClick={() => setAddOpen(false)} className="btn-secondary">
              Cancelar
            </button>
          </div>

          {formMsg && <p style={{ marginTop: 6 }}>{formMsg}</p>}
        </form>
      </FullscreenModal>

      {/* MODAL: Gerenciar tamanhos do produto */}
      <FullscreenModal
        open={!!openProduct}
        onClose={() => setOpenProduct(null)}
        title={openProduct ? `Gerenciar tamanhos — ${openProduct.name}` : ''}
      >
        {!openProduct ? null : (
          <div className="modal-grid">
            {/* Topo responsivo (imagem + infos) */}
            <div className="product-header">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={openProduct.image_url || 'https://via.placeholder.com/400x260?text=Sem+imagem'}
                alt={openProduct.image_alt || openProduct.name}
                className="product-img"
              />
              <div>
                <div className="product-name">{openProduct.name}</div>
                <div className="product-sub">{openProduct.category}</div>
                <div className="product-status">Status: {openProduct.is_active ? 'Ativo' : 'Inativo'}</div>

                <div className="mt-8">
                  <button
                    onClick={async () => {
                      if (!confirm(`Excluir produto "${openProduct.name}" e todos os seus tamanhos?`)) return;
                      try {
                        await fetch(`/api/products?id=${openProduct.id}`, { method: 'DELETE' })
                          .then(r => { if (!r.ok) throw new Error('Falha ao excluir'); });
                        setOpenProduct(null);
                        await loadProducts();
                      } catch {
                        alert('Erro ao excluir produto.');
                      }
                    }}
                    className="btn-danger"
                  >
                    Excluir produto
                  </button>
                </div>
              </div>
            </div>

            {/* Tamanhos existentes - editáveis */}
            <div>
              <h3 className="section-title">Tamanhos existentes</h3>
              {(variantsByProduct[openProduct.id] ?? []).length === 0 && (
                <p className="muted">Nenhum tamanho cadastrado.</p>
              )}
              {(variantsByProduct[openProduct.id] ?? []).length > 0 && (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="th-left">Tam.</th>
                        <th className="th-right">Preço</th>
                        <th className="th-right">Qtde</th>
                        <th className="th-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(variantsByProduct[openProduct.id] ?? []).map((v) => (
                        <tr key={v.variant_id}>
                          <td className="td">{v.variant}</td>

                          <td className="td-right">
                            <input
                              value={editPrice[v.variant_id] ?? String(Number(v.price).toFixed(2))}
                              onChange={(e) => setEditPrice((s) => ({ ...s, [v.variant_id]: e.target.value }))}
                              inputMode="decimal"
                              className="input input-sm text-right"
                            />
                          </td>

                          <td className="td-right">
                            <input
                              value={editQty[v.variant_id] ?? String(v.quantity)}
                              onChange={(e) => setEditQty((s) => ({ ...s, [v.variant_id]: e.target.value }))}
                              inputMode="numeric"
                              className="input input-sm text-right"
                            />
                          </td>

                          <td className="td">
                            <div className="row-end">
                              <button
                                onClick={async () => {
                                  setRowSaving((s) => ({ ...s, [v.variant_id]: true }));
                                  try {
                                    const price = parseFloat(editPrice[v.variant_id] ?? String(v.price));
                                    const qty = parseInt(editQty[v.variant_id] ?? String(v.quantity), 10);
                                    await fetch('/api/variants', {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ variant_id: v.variant_id, price, quantity: qty }),
                                    }).then(r => { if (!r.ok) throw new Error('Falha ao salvar'); });
                                    await loadVariants(openProduct.id);
                                  } catch (e) {
                                    alert('Erro ao salvar alterações.');
                                  } finally {
                                    setRowSaving((s) => ({ ...s, [v.variant_id]: false }));
                                  }
                                }}
                                disabled={rowSaving[v.variant_id]}
                                className="btn-primary"  // 🔴 agora é vermelho, padrão do app
                              >
                                {rowSaving[v.variant_id] ? 'Salvando…' : 'Salvar'}
                              </button>

                              <button
                                onClick={async () => {
                                  if (!confirm(`Excluir tamanho ${v.variant}?`)) return;
                                  try {
                                    await fetch(`/api/variants?variant_id=${v.variant_id}`, {
                                      method: 'DELETE',
                                    }).then(r => { if (!r.ok) throw new Error('Falha ao excluir'); });
                                    await loadVariants(openProduct.id);
                                  } catch {
                                    alert('Erro ao excluir tamanho.');
                                  }
                                }}
                                className="btn-danger"
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Form adicionar/atualizar */}
            <div className="panel">
              <h4 className="panel-title">Adicionar/Atualizar tamanho</h4>

              <div className="grid-sizes">
                <label className="field">
                  <span>Tamanho</span>
                  <select
                    value={vSize}
                    onChange={(e) => setVSize(e.target.value)}
                    className="input"
                  >
                    <option value="" disabled>Selecione</option>
                    {ALL_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>

                <label className="field">
                  <span>Preço (R$)</span>
                  <input
                    value={vPrice}
                    onChange={(e) => setVPrice(e.target.value)}
                    placeholder="80.00"
                    inputMode="decimal"
                    className="input"
                  />
                </label>

                <label className="field">
                  <span>Quantidade</span>
                  <input
                    value={vQty}
                    onChange={(e) => setVQty(e.target.value)}
                    placeholder="0"
                    inputMode="numeric"
                    className="input"
                  />
                </label>
              </div>

              <button
                onClick={() => openProduct && addOrUpdateVariant(openProduct.id)}
                disabled={savingVariant}
                type="button"
                className="btn-primary btn-full"
              >
                {savingVariant ? 'Salvando…' : 'Salvar tamanho'}
              </button>

              {variantMsg && <p style={{ marginTop: 8 }}>{variantMsg}</p>}
            </div>
          </div>
        )}
      </FullscreenModal>

      {/* estilos locais (mobile-first) */}
      <style jsx>{`
        .page-wrap { padding: 16px; }
        .title { font-size: 24px; margin-bottom: 12px; }
        .mb-12 { margin-bottom: 12px; }
        .text-error { color: #ff6b6b; }

        /* Botões */
        .btn-primary { background:#e11d48; color:#fff; border:none; border-radius:10px; padding:10px 14px; cursor:pointer; }
        .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
        .btn-secondary { background:#222; color:#eaeaea; border:1px solid #333; border-radius:8px; padding:8px 10px; cursor:pointer; }
        .btn-danger { background:#991b1b; color:#fff; border:none; border-radius:8px; padding:8px 10px; cursor:pointer; }
        .btn-full { width: 100%; }

        /* Cards */
        .grid-cards {
          list-style:none; padding:0; margin:0;
          display:grid; gap:12px;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        }
        .card { background:#111; border:1px solid #222; border-radius:12px; overflow:hidden; }
        .card-button { width:100%; border:none; background:transparent; padding:0; text-align:left; cursor:pointer; }
        .card-img { width:100%; height:120px; object-fit:cover; display:block; }
        .card-body { padding:10px; }
        .card-title { font-weight:700; font-size:14px; line-height:1.2; }
        .card-sub { font-size:12px; opacity:.7; }

        /* Form padrão */
        .form-grid { display:grid; gap:12px; }
        .field { display:flex; flex-direction:column; gap:6px; }
        .input { padding:10px; border-radius:10px; border:1px solid #333; background:#0b0b0b; color:#fff; width:100%; }
        .input-sm { padding:6px; border-radius:8px; border:1px solid #333; background:#0b0b0b; color:#fff; }
        .text-right { text-align:right; }
        .checkbox { display:flex; align-items:center; gap:8px; }

        /* Modal conteúdo */
        .modal-grid { display:grid; gap:16px; }
        .product-header { display:grid; grid-template-columns: 1fr; gap:12px; }
        .product-img { width:100%; height:160px; object-fit:cover; border-radius:8px; }
        .product-name { font-weight:700; }
        .product-sub { font-size:12px; opacity:.7; }
        .product-status { font-size:12px; margin-top:4px; }
        .mt-8 { margin-top:8px; }

        /* Tabela responsiva */
        .table-wrap { overflow-x:auto; -webkit-overflow-scrolling: touch; border:1px solid #222; border-radius:8px; }
        .table { width:100%; min-width: 520px; border-collapse: collapse; font-size:13px; }
        .th-left, .th-right, .th-center { border-bottom:1px solid #222; padding:6px 8px; }
        .th-left { text-align:left; } .th-right { text-align:right; } .th-center { text-align:center; }
        .td, .td-right { border-bottom:1px solid #1a1a1a; padding:6px 8px; }
        .td-right { text-align:right; }
        .row-end { display:flex; gap:6px; justify-content:flex-end; }

        /* Painel (form de tamanho) */
        .panel { background:#0b0b0b; border:1px solid #222; border-radius:10px; padding:12px; }
        .panel-title { margin:0 0 8px 0; font-size:14px; }
        .section-title { margin:8px 0; font-size:14px; opacity:.85; }
        .muted { opacity:.8; }

        /* Grid dos 3 campos: mobile = 1 coluna; ≥640px = 3 colunas */
        .grid-sizes { display:grid; gap:8px; grid-template-columns: 1fr; }
        @media (min-width: 640px) {
          .grid-sizes { grid-template-columns: 1fr 1fr 1fr; }
          .product-header { grid-template-columns: 120px 1fr; }
          .product-img { height:100px; }
        }
      `}</style>
    </div>
  );
}
