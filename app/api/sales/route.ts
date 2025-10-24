// app/api/sales/route.ts
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_CONNECTION_STRING!);

// GET /api/sales?from=YYYY-MM-DD&to=YYYY-MM-DD&seller=Deh (parâmetros opcionais)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const seller = url.searchParams.get('seller'); // novo

  let rows;
  if (from && to && seller) {
    rows = await sql/*sql*/`
      select s.id, s.seller, s.buyer, s.total, s.created_at
      from sales s
      where s.created_at >= ${from}::date
        and s.created_at < (${to}::date + interval '1 day')
        and s.seller = ${seller}
      order by s.created_at desc, s.id desc
    `;
  } else if (from && to) {
    rows = await sql/*sql*/`
      select s.id, s.seller, s.buyer, s.total, s.created_at
      from sales s
      where s.created_at >= ${from}::date
        and s.created_at < (${to}::date + interval '1 day')
      order by s.created_at desc, s.id desc
    `;
  } else if (seller) {
    rows = await sql/*sql*/`
      select s.id, s.seller, s.buyer, s.total, s.created_at
      from sales s
      where s.seller = ${seller}
      order by s.created_at desc, s.id desc
    `;
  } else {
    rows = await sql/*sql*/`
      select s.id, s.seller, s.buyer, s.total, s.created_at
      from sales s
      order by s.created_at desc, s.id desc
      limit 200
    `;
  }

  return NextResponse.json(rows);
}


/** POST /api/sales */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.seller || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'seller e items são obrigatórios' }, { status: 400 });
    }

    const seller: string = String(body.seller);
    const buyer: string | null = body.buyer ? String(body.buyer) : null;

    const items: Array<{ variant_id: number; quantity: number }> = body.items.map((it: any) => ({
      variant_id: Number(it?.variant_id),
      quantity: Number(it?.quantity),
    }));
    if (items.some(i => !Number.isFinite(i.variant_id) || !Number.isFinite(i.quantity) || i.quantity <= 0)) {
      return NextResponse.json({ error: 'Itens inválidos (variant_id/quantity)' }, { status: 400 });
    }

    const variantIds = items.map(i => i.variant_id);

    // Preço atual de cada variante
    const priceRows = await sql/*sql*/`
      select id as variant_id, price
      from product_variants
      where id = any(${variantIds})
    `;
    if (priceRows.length !== variantIds.length) {
      return NextResponse.json({ error: 'Alguma variante não existe' }, { status: 400 });
    }
    const priceMap = new Map<number, number>();
    for (const r of priceRows) priceMap.set(Number(r.variant_id), Number(r.price));

    // Tenta transação (Neon suporta .begin)
    const result = await (sql as any).begin?.(async (tx: any) => {
      // Debita estoque
      for (const it of items) {
        const q = Math.max(1, Number(it.quantity));
        const upd = await tx/*sql*/`
          update inventory
          set quantity = quantity - ${q}
          where variant_id = ${it.variant_id} and quantity >= ${q}
          returning quantity
        `;
        if (upd.length === 0) throw new Error(`Estoque insuficiente para a variante ${it.variant_id}`);
      }

      // Total
      let total = 0;
      for (const it of items) total += (priceMap.get(it.variant_id) || 0) * Number(it.quantity);

      // Cria venda
      const saleRow = await tx/*sql*/`
        insert into sales (seller, buyer, total)
        values (${seller}, ${buyer}, ${total})
        returning id, seller, buyer, total, created_at
      `;
      const sale = saleRow[0];

      // Itens (coluna unit_price)
      for (const it of items) {
        await tx/*sql*/`
          insert into sale_items (sale_id, variant_id, quantity, unit_price)
          values (${sale.id}, ${it.variant_id}, ${it.quantity}, ${priceMap.get(it.variant_id)})
        `;
      }

      return sale;
    });

    // Fallback sem transação
    if (!result) {
      for (const it of items) {
        const q = Math.max(1, Number(it.quantity));
        const upd = await sql/*sql*/`
          update inventory
          set quantity = quantity - ${q}
          where variant_id = ${it.variant_id} and quantity >= ${q}
          returning quantity
        `;
        if (upd.length === 0) {
          return NextResponse.json({ error: `Estoque insuficiente para a variante ${it.variant_id}` }, { status: 409 });
        }
      }

      let total = 0;
      for (const it of items) total += (priceMap.get(it.variant_id) || 0) * Number(it.quantity);

      const saleRow = await sql/*sql*/`
        insert into sales (seller, buyer, total)
        values (${seller}, ${buyer}, ${total})
        returning id, seller, buyer, total, created_at
      `;
      const sale = saleRow[0];

      for (const it of items) {
        await sql/*sql*/`
          insert into sale_items (sale_id, variant_id, quantity, unit_price)
          values (${sale.id}, ${it.variant_id}, ${it.quantity}, ${priceMap.get(it.variant_id)})
        `;
      }

      return NextResponse.json({ sale_id: sale.id, total: sale.total, created_at: sale.created_at }, { status: 201 });
    }

    return NextResponse.json(
      { sale_id: result.id, total: result.total, created_at: result.created_at },
      { status: 201 }
    );
  } catch (err: any) {
    const msg = typeof err?.message === 'string' ? err.message : 'Erro interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
