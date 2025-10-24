import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_CONNECTION_STRING!);

export async function GET() {
  const r = await sql`select 1 as ok`;
  return NextResponse.json({ db: r[0]?.ok === 1 ? 'ok' : 'fail' });
}