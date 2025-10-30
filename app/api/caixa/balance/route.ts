import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_CONNECTION_STRING!);

export async function GET() {
  try {
    const [r] = await sql/*sql*/`
      WITH vendido AS (
        SELECT COALESCE(SUM(si.quantity * COALESCE(si.unit_price, si.price)), 0) AS total
        FROM sale_items si
      ),
      ajustes AS (
        SELECT COALESCE(
          SUM(
            CASE
              WHEN reason ILIKE 'entrada:%' THEN amount_cents
              ELSE -amount_cents
            END
          ) / 100.0, 0
        ) AS total
        FROM cash_outs
      )
      SELECT (vendido.total + ajustes.total) AS saldo
      FROM vendido, ajustes;
    `;
    return NextResponse.json({ saldo: Number(r?.saldo ?? 0) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
