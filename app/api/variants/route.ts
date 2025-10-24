// app/api/variants/route.ts
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/variants?product_id=1  -> lista tamanhos do produto
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const productId = Number(searchParams.get('product_id'));
  if (!productId) {
    return NextResponse.json({ error: 'product_id é obrigatório' }, { status: 400 });
  }

  const rows = await sql/*sql*/`
    select
      pv.id as variant_id,
      pv.product_id,
      pv.variant,
      pv.price,
      coalesce(i.quantity, 0) as quantity
    from product_variants pv
    left join inventory i on i.variant_id = pv.id
    where pv.product_id = ${productId}
    order by pv.variant
  `;
  return NextResponse.json(rows);
}

// POST /api/variants
// body: { product_id: number, variant: 'PP'|'P'|'M'|'G'|'GG'|'EG'|'U', price: number, quantity: number }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const { product_id, variant, price, quantity } = body;

  if (!product_id || !variant || price == null || quantity == null) {
    return NextResponse.json(
      { error: 'product_id, variant, price e quantity são obrigatórios' },
      { status: 400 }
    );
  }

  // Cria/atualiza a variação e faz upsert do estoque em um único statement (CTE)
  const rows = await sql/*sql*/`
    with v as (
      insert into product_variants (product_id, variant, price)
      values (${product_id}, ${variant}, ${price})
      on conflict (product_id, variant) do update set price = excluded.price
      returning id, product_id, variant, price
    ),
    inv as (
      insert into inventory (variant_id, quantity)
      values ((select id from v), ${quantity})
      on conflict (variant_id) do update set quantity = excluded.quantity
      returning quantity
    )
    select v.id as variant_id, v.product_id, v.variant, v.price, (select quantity from inv) as quantity
    from v
  `;

  return NextResponse.json(rows[0], { status: 201 });
}

// PUT /api/variants  -> atualiza preço/estoque de uma variação
// body: { variant_id: number, price?: number, quantity?: number }
export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const { variant_id, price = null, quantity = null } = body;

  if (!variant_id) {
    return NextResponse.json({ error: 'variant_id é obrigatório' }, { status: 400 });
  }

  const rows = await sql/*sql*/`
    with up_pv as (
      update product_variants
      set price = coalesce(${price}, price)
      where id = ${variant_id}
      returning id as variant_id, product_id, variant, price
    ),
    up_inv as (
      insert into inventory (variant_id, quantity)
      values (${variant_id}, coalesce(${quantity}, 0))
      on conflict (variant_id) do update set quantity = coalesce(${quantity}, inventory.quantity)
      returning quantity
    )
    select up_pv.variant_id, up_pv.product_id, up_pv.variant, up_pv.price, up_inv.quantity
    from up_pv, up_inv
  `;

  return NextResponse.json(rows[0]);
}

// DELETE /api/variants?variant_id=123  ou body { variant_id: 123 }
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get('variant_id');
  let variant_id = fromQuery ? Number(fromQuery) : undefined;

  if (!variant_id) {
    try {
      const b = await req.json();
      if (b?.variant_id) variant_id = Number(b.variant_id);
    } catch {
      /* ignore json parse error */
    }
  }

  if (!variant_id || Number.isNaN(variant_id)) {
    return NextResponse.json({ error: 'variant_id é obrigatório' }, { status: 400 });
  }

  // Apaga estoque e depois a variante
  await sql/*sql*/`delete from inventory where variant_id = ${variant_id};`;
  await sql/*sql*/`delete from product_variants where id = ${variant_id};`;

  return NextResponse.json({ ok: true });
}
