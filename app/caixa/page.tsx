'use client';
import { useEffect, useState } from 'react';

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

type CashOut = {
  id: number;
  amount: number;        // em reais (já convertido na API)
  reason: string;
  created_at: string;    // ISO
};

export default function CaixaPage() {
  const [saldo, setSaldo] = useState<number | null>(null);
  const [valor, setValor] = useState('');
  const [motivo, setMotivo] = useState('');
  const [saidas, setSaidas] = useState<CashOut[]>([]);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [carregandoHist, setCarregandoHist] = useState(false);

  async function carregarSaldo() {
    try {
      setErro(null);
      const res = await fetch('/api/caixa/balance', { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Erro ao buscar saldo');
      setSaldo(Number(j.saldo ?? 0));
    } catch (e: any) {
      setErro(e.message);
    }
  }

  async function carregarHistorico() {
    try {
      setCarregandoHist(true);
      const res = await fetch('/api/caixa/saidas?limit=100', { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Erro ao buscar histórico.');
      setSaidas(j);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setCarregandoHist(false);
    }
  }

  useEffect(() => {
    carregarSaldo();
  }, []);

  async function registrarSaida(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const v = parseFloat((valor || '').replace(',', '.'));
    if (!v || v <= 0 || !motivo.trim()) {
      setErro('Informe um valor (> 0) e um motivo.');
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch('/api/caixa/saidas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: v, reason: motivo.trim() })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Erro ao registrar saída.');

      setValor('');
      setMotivo('');
      await carregarSaldo();
      if (mostrarHistorico) await carregarHistorico();
    } catch (e: any) {
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

      {/* Formulário */}
      <div className="panel" style={{ marginBottom: 12 }}>
        <h2 className="panel-title">Registrar saída</h2>
        <form onSubmit={registrarSaida} className="form-grid">
          <div className="grid-sizes">{/* reaproveitando a grid 1col→3cols */}
            <label className="field">
              <span>Valor (R$)</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 50,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="input"
              />
            </label>

            <label className="field">
              <span>Motivo</span>
              <input
                type="text"
                placeholder="Ex: Troco inicial"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="input"
              />
            </label>

            <div className="field" style={{ alignSelf: 'end' }}>
              <button type="submit" disabled={salvando} className="btn-primary">
                {salvando ? 'Salvando…' : 'Registrar saída'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Histórico */}
      <div className="mb-12">
        <button
          className="btn-secondary"
          onClick={async () => {
            const prox = !mostrarHistorico;
            setMostrarHistorico(prox);
            if (prox && saídasEstáVazia(saidas)) await carregarHistorico();
          }}
        >
          {mostrarHistorico ? 'Esconder histórico' : 'Exibir histórico de saídas'}
        </button>
      </div>

      {mostrarHistorico && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="th-left">Data</th>
                <th className="th-left">Motivo</th>
                <th className="th-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {carregandoHist ? (
                <tr><td className="td" colSpan={3}>Carregando…</td></tr>
              ) : saidas.length === 0 ? (
                <tr><td className="td" colSpan={3}>Nenhuma saída registrada.</td></tr>
              ) : (
                saidas.map((s) => (
                  <tr key={s.id}>
                    <td className="td">{new Date(s.created_at).toLocaleString('pt-BR')}</td>
                    <td className="td">{s.reason}</td>
                    <td className="td-right">{formatBRL(s.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* estilos locais iguais ao Ajustar Estoque (mobile-first) */}
      <style jsx>{`
        .page-wrap { padding: 16px; }
        .title { font-size: 24px; margin-bottom: 12px; }
        .mb-12 { margin-bottom: 12px; }
        .text-error { color: #ff6b6b; }

        /* Botões (cores padrão) */
        .btn-primary { background:#e11d48; color:#fff; border:none; border-radius:10px; padding:10px 14px; cursor:pointer; }
        .btn-primary:disabled { opacity:.6; cursor:not-allowed; }
        .btn-secondary { background:#222; color:#eaeaea; border:1px solid #333; border-radius:8px; padding:8px 10px; cursor:pointer; }

        /* Form padrão */
        .form-grid { display:grid; gap:12px; }
        .field { display:flex; flex-direction:column; gap:6px; }
        .input { padding:10px; border-radius:10px; border:1px solid #333; background:#0b0b0b; color:#fff; width:100%; }

        /* Painel */
        .panel { background:#0b0b0b; border:1px solid #222; border-radius:10px; padding:12px; }
        .panel-title { margin:0 0 8px 0; font-size:14px; }

        /* Grid 1col no mobile; 3cols ≥640px (valor, motivo, botão) */
        .grid-sizes { display:grid; gap:8px; grid-template-columns: 1fr; }
        @media (min-width: 640px) {
          .grid-sizes { grid-template-columns: 1fr 2fr auto; align-items:end; }
        }

        /* Tabela responsiva */
        .table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; border:1px solid #222; border-radius:8px; }
        .table { width:100%; min-width: 480px; border-collapse:collapse; font-size:13px; }
        .th-left, .th-right { border-bottom:1px solid #222; padding:6px 8px; }
        .th-left { text-align:left; } .th-right { text-align:right; }
        .td, .td-right { border-bottom:1px solid #1a1a1a; padding:6px 8px; }
        .td-right { text-align:right; }
      `}</style>
    </div>
  );
}

/** helper para não recarregar histórico toda hora */
function saídasEstáVazia(arr: CashOut[]) {
  return !arr || arr.length === 0;
}
