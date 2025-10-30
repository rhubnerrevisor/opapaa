import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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
          SUM(CASE WHEN reason ILIKE 'entrada:%' THEN amount_cents ELSE -amount_cents END) / 100.0,
          0
        ) AS total
        FROM cash_outs
      )
      SELECT (vendido.total + ajustes.total) AS saldo
      FROM vendido, ajustes;
    `;

    const res = NextResponse.json({ saldo: Number(r?.saldo ?? 0) });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.headers.set('CDN-Cache-Control', 'no-store');
    res.headers.set('Vercel-CDN-Cache-Control', 'no-store');
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
