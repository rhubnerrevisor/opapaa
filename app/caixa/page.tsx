'use client';
import { useEffect, useState } from 'react';

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

type Linha = {
  id: number;
  kind: 'entrada' | 'saida';
  amount: number;        // já com sinal (+ entrada, - saída)
  reason: string;
  created_at: string;
};

export default function CaixaPage() {
  const [saldo, setSaldo] = useState<number | null>(null);
  const [valor, setValor] = useState('');
  const [motivo, setMotivo] = useState('');
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('saida');
  const [hist, setHist] = useState<Linha[]>([]);
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [carregandoHist, setCarregandoHist] = useState(false);

  async function carregarSaldo() {
    try {
      const r = await fetch('/api/caixa/balance', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Erro ao buscar saldo');
      setSaldo(Number(j.saldo ?? 0));
    } catch (e: any) {
      setErro(e.message);
    }
  }

  async function carregarHist() {
    try {
      setCarregandoHist(true);
      const r = await fetch('/api/caixa/saidas?limit=100', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Erro ao buscar histórico');
      setHist(j);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setCarregandoHist(false);
    }
  }

  useEffect(() => { carregarSaldo(); }, []);

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const v = Number(String(valor).replace(',', '.'));
    if (!v || v <= 0 || !motivo.trim()) {
      setErro('Informe um valor (> 0), um motivo e o tipo.');
      return;
    }
    setSalvando(true);
    try {
      const r = await fetch('/api/caixa/saidas', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ amount: v, reason: motivo, kind: tipo })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Erro ao registrar');
      setValor(''); setMotivo('');
      await carregarSaldo();
      if (mostrar) await carregarHist();
    } catch (e:any) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="page-wrap">
      <h1 className="title">Controle de Caixa</h1>

      <div style={{ marginBottom: 8 }}>
        <strong>Valor em caixa: </strong>
        {saldo === null ? '...' : formatBRL(saldo)}
      </div>

      {erro && <div className="text-error" style={{ marginBottom: 8 }}>{erro}</div>}

      <div className="panel" style={{ marginBottom: 12 }}>
        <h2 className="panel-title">Ajuste de caixa</h2>
        <form onSubmit={registrar} className="form-grid">
          <div className="grid-sizes">
            <label className="field">
              <span>Tipo</span>
              <select value={tipo} onChange={e => setTipo(e.target.value as any)} className="input">
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </label>

            <label className="field">
              <span>Valor (R$)</span>
              <input
                className="input"
                inputMode="decimal"
                placeholder="Ex: 100,00"
                value={valor}
                onChange={e => setValor(e.target.value)}
              />
            </label>

            <label className="field">
              <span>Motivo</span>
              <input
                className="input"
                placeholder="Ex: Cachê do show"
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
              />
            </label>

            <div className="field" style={{ alignSelf:'end' }}>
              <button type="submit" disabled={salvando} className="btn-primary">
                {salvando ? 'Salvando…' : 'Registrar'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="mb-12">
        <button
          className="btn-secondary"
          onClick={async () => {
            const nx = !mostrar;
            setMostrar(nx);
            if (nx && hist.length === 0) await carregarHist();
          }}
        >
          {mostrar ? 'Esconder histórico' : 'Exibir histórico'}
        </button>
      </div>

      {mostrar && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="th-left">Data</th>
                <th className="th-left">Tipo</th>
                <th className="th-left">Motivo</th>
                <th className="th-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {carregandoHist ? (
                <tr><td className="td" colSpan={4}>Carregando…</td></tr>
              ) : hist.length === 0 ? (
                <tr><td className="td" colSpan={4}>Sem ajustes.</td></tr>
              ) : hist.map(l => (
                <tr key={l.id}>
                  <td className="td">{new Date(l.created_at).toLocaleString('pt-BR')}</td>
                  <td className="td">{l.kind === 'entrada' ? 'Entrada' : 'Saída'}</td>
                  <td className="td">{l.reason.replace(/^entrada:\s*/i, '')}</td>
                  <td className="td-right">{formatBRL(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* estilos locais (mesmo padrão da página de estoque) */}
      <style jsx>{`
        .page-wrap { padding:16px; }
        .title { font-size:24px; margin-bottom:12px; }
        .mb-12 { margin-bottom:12px; }
        .text-error { color:#ff6b6b; }
        .btn-primary { background:#e11d48; color:#fff; border:none; border-radius:10px; padding:10px 14px; cursor:pointer; }
        .btn-primary:disabled { opacity:.6; cursor:not-allowed; }
        .btn-secondary { background:#222; color:#eaeaea; border:1px solid #333; border-radius:8px; padding:8px 10px; cursor:pointer; }
        .form-grid { display:grid; gap:12px; }
        .field { display:flex; flex-direction:column; gap:6px; }
        .input { padding:10px; border-radius:10px; border:1px solid #333; background:#0b0b0b; color:#fff; width:100%; }
        .panel { background:#0b0b0b; border:1px solid #222; border-radius:10px; padding:12px; }
        .panel-title { margin:0 0 8px 0; font-size:14px; }
        .grid-sizes { display:grid; gap:8px; grid-template-columns:1fr; }
        @media (min-width:640px) {
          .grid-sizes { grid-template-columns: auto 1fr 2fr auto; align-items:end; }
        }
        .table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; border:1px solid #222; border-radius:8px; }
        .table { width:100%; min-width:560px; border-collapse:collapse; font-size:13px; }
        .th-left, .th-right { border-bottom:1px solid #222; padding:6px 8px; }
        .th-left { text-align:left; } .th-right { text-align:right; }
        .td, .td-right { border-bottom:1px solid #1a1a1a; padding:6px 8px; }
        .td-right { text-align:right; }
      `}</style>
    </div>
  );
}
