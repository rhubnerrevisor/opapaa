import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_CONNECTION_STRING!);

// POST /api/caixa/saidas  -> { amount: number(em reais), reason: string }
export async function POST(req: Request) {
  try {
    const { amount, reason } = await req.json();

    const v = Number(String(amount).replace(',', '.'));
    if (!v || v <= 0 || !reason || !String(reason).trim()) {
      return NextResponse.json(
        { error: 'Informe valor (> 0) e motivo.' },
        { status: 400 }
      );
    }

    const amountCents = Math.round(v * 100);

    const rows = await sql/*sql*/`
      INSERT INTO cash_outs (amount_cents, reason)
      VALUES (${amountCents}, ${String(reason).trim()})
      RETURNING id, amount_cents, reason, created_at
    `;

    const r = rows[0];
    return NextResponse.json({
      id: r.id,
      amount_cents: Number(r.amount_cents),
      amount: Number(r.amount_cents) / 100,
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
      rows.map((r: any) => ({
        id: r.id,
        amount_cents: Number(r.amount_cents),
        amount: Number(r.amount_cents) / 100,
        reason: r.reason,
        created_at: r.created_at
      }))
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
