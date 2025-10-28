import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_CONNECTION_STRING!);

export async function GET() {
  try {
    // total vendido: soma de (quantidade * preço) usando unit_price,
    // caindo para price se unit_price estiver nulo.
    const [totais] = await sql/*sql*/`
      WITH vendido AS (
        SELECT COALESCE(SUM(si.quantity * COALESCE(si.unit_price, si.price)), 0) AS total
        FROM sale_items si
      ),
      saidas AS (
        SELECT COALESCE(SUM(co.amount_cents) / 100.0, 0) AS total
        FROM cash_outs co
      )
      SELECT (vendido.total - saidas.total) AS saldo
      FROM vendido, saidas;
    `;

    const saldo = Number(totais?.saldo ?? 0);
    return NextResponse.json({ saldo });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
