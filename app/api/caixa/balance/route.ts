import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_CONNECTION_STRING!);

export async function GET() {
  try {
    const rows = await sql`
      WITH vendido AS (
        SELECT COALESCE(SUM(si.quantity * si.unit_price), 0) AS total
        FROM sale_items si
      ),
      saidas AS (
        SELECT COALESCE(SUM(co.amount_cents) / 100.0, 0) AS total
        FROM cash_outs co
      )
      SELECT (vendido.total - saidas.total) AS saldo
      FROM vendido, saidas;
    `;

    const saldo = Number(rows[0]?.saldo ?? 0);
    return NextResponse.json({ saldo });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
