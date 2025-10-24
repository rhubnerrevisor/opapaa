import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/products  -> lista produtos
export async function GET() {
  const rows = await sql/*sql*/`
    select id, name, category, is_active, image_url, image_alt
    from products
    order by id desc
  `;
  return NextResponse.json(rows);
}

// POST /api/products  -> cria produto
// body JSON: { name: string, category: string, image_url?: string, image_alt?: string, is_active?: boolean }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { name, category, image_url = null, image_alt = null, is_active = true } = body || {};

  if (!name || !category) {
    return NextResponse.json({ error: 'name e category são obrigatórios' }, { status: 400 });
  }

  const [created] = await sql/*sql*/`
    insert into products (name, category, image_url, image_alt, is_active)
    values (${name}, ${category}, ${image_url}, ${image_alt}, ${is_active})
    returning id, name, category, is_active, image_url, image_alt
  `;
  return NextResponse.json(created, { status: 201 });
}

// PUT /api/products
// body: { id: number, name?, category?, image_url?, image_alt?, is_active? }
export async function PUT(req: Request) {
  const b = await req.json().catch(() => ({} as any));
  const { id } = b;
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

  const rows = await sql/*sql*/`
    update products
    set
      name = coalesce(${b.name}, name),
      category = coalesce(${b.category}, category),
      image_url = coalesce(${b.image_url}, image_url),
      image_alt = coalesce(${b.image_alt}, image_alt),
      is_active = coalesce(${b.is_active}, is_active)
    where id = ${id}
    returning *;
  `;
  return NextResponse.json(rows[0]);
}

// DELETE /api/products?id=123  (ou body { id: 123 })
// remove variantes e estoque antes (ou deixe o FK com ON DELETE CASCADE)
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get('id')) || Number((await req.json().catch(() => ({}))).id);
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

  // em caso de não haver FK com cascade, removemos manualmente:
  await sql/*sql*/`
    delete from inventory
    where variant_id in (select id from product_variants where product_id = ${id});
  `;
  await sql/*sql*/`delete from product_variants where product_id = ${id};`;
  await sql/*sql*/`delete from products where id = ${id};`;

  return NextResponse.json({ ok: true });
}
