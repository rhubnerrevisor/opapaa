import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_CONNECTION_STRING!);

// POST /api/caixa/saidas  -> { amount: number | string, reason: string, kind?: 'entrada' | 'saida' }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawAmount = String(body?.amount ?? '').replace(',', '.');
    const v = Number(rawAmount);
    const kind: 'entrada' | 'saida' = (String(body?.kind || 'saida').toLowerCase() === 'entrada') ? 'entrada' : 'saida';
    const reason = String(body?.reason ?? '').trim();

    if (!v || v <= 0 || !reason) {
      return NextResponse.json({ error: 'Informe valor (> 0) e motivo.' }, { status: 400 });
    }

    const amountCents = Math.round(v * 100);
    const reasonStored = kind === 'entrada' ? `entrada: ${reason}` : reason;

    const rows = await sql/*sql*/`
      INSERT INTO cash_outs (amount_cents, reason)
      VALUES (${amountCents}, ${reasonStored})
      RETURNING id, amount_cents, reason, created_at
    `;

    const r = rows[0];
    const isEntrada = String(r.reason).toLowerCase().startsWith('entrada:');
    const signedAmount = (Number(r.amount_cents) / 100) * (isEntrada ? 1 : -1);

    return NextResponse.json({
      id: r.id,
      kind: isEntrada ? 'entrada' : 'saida',
      amount: signedAmount,
      amount_cents: Number(r.amount_cents) * (isEntrada ? 1 : -1),
      reason: r.reason,
      created_at: r.created_at
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET /api/caixa/saidas?limit=50
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200);

    const rows = await sql/*sql*/`
      SELECT id, amount_cents, reason, created_at
      FROM cash_outs
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return NextResponse.json(
      rows.map((r: any) => {
        const isEntrada = String(r.reason).toLowerCase().startsWith('entrada:');
        const signedAmount = (Number(r.amount_cents) / 100) * (isEntrada ? 1 : -1);
        return {
          id: r.id,
          kind: isEntrada ? 'entrada' : 'saida',
          amount: signedAmount,
          amount_cents: Number(r.amount_cents) * (isEntrada ? 1 : -1),
          reason: r.reason,
          created_at: r.created_at
        };
      })
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
