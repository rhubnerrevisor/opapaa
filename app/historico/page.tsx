// app/historico/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

type Sale = {
  id: number;
  seller: string;
  buyer: string | null;
  total: number | string;
  created_at: string; // ISO
};

const SELLERS = ['Deh', 'Keu', 'Igor', 'Ricardo'] as const;
const money = (x: any) => Number(x || 0).toFixed(2);

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function HistoricoPage() {
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [seller, setSeller] = useState<string>(''); // vazio = todos
  const [data, setData] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalPeriodo = useMemo(
    () => data.reduce((s, r) => s + Number(r.total), 0),
    [data]
  );

  async function load() {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (seller) params.set('seller', seller);

      const r = await fetch(`/api/sales?${params.toString()}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(await r.text());
      const j: Sale[] = await r.json();
      setData(j);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Histórico de vendas</h1>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          Data de:
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{ padding: 8, borderRadius: 8, border: '1px solid #333', background: '#0b0b0b', color: 'white' }}
          />
        </label>

        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          até:
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{ padding: 8, borderRadius: 8, border: '1px solid #333', background: '#0b0b0b', color: 'white' }}
          />
        </label>

        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          Vendedor:
          <select
            value={seller}
            onChange={(e) => setSeller(e.target.value)}
            style={{ padding: 8, borderRadius: 8, border: '1px solid #333', background: '#0b0b0b', color: 'white' }}
          >
            <option value="">Todos</option>
            {SELLERS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <button
          onClick={load}
          style={{ background: '#e11d48', color: 'white', border: 'none', borderRadius: 10, padding: '10px 14px', cursor: 'pointer' }}
        >
          Exibir
        </button>
      </div>

      {/* Resumo */}
      <div style={{ marginBottom: 10 }}>
        <strong>Registros:</strong> {data.length} • <strong>Total do período:</strong> R$ {money(totalPeriodo)}
      </div>

      {/* Tabela */}
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #222' }}>#</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #222' }}>Data</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #222' }}>Vendedor</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #222' }}>Vendido para</th>
              <th style={{ textAlign: 'right', padding: '10px 8px', borderBottom: '1px solid #222' }}>Total (R$)</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} style={{ padding: 12, textAlign: 'center' }}>Carregando...</td>
              </tr>
            )}
            {error && !loading && (
              <tr>
                <td colSpan={5} style={{ padding: 12, color: '#f87171' }}>{error}</td>
              </tr>
            )}
            {!loading && !error && data.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 12, opacity: 0.8 }}>Nenhuma venda no período.</td>
              </tr>
            )}
            {!loading && !error && data.map((r) => (
              <tr key={r.id}>
                <td style={{ padding: '8px', borderBottom: '1px solid #1a1a1a' }}>#{r.id}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #1a1a1a' }}>
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #1a1a1a' }}>{r.seller}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #1a1a1a' }}>{r.buyer || '-'}</td>
                <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #1a1a1a' }}>
                  {money(r.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
