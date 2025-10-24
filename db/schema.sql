-- ===========================================================
-- TABELAS BÁSICAS
-- ===========================================================

create table if not exists sellers (
  id bigserial primary key,
  name text not null unique
);

create table if not exists products (
  id bigserial primary key,
  name text not null,
  category text not null,
  is_active boolean not null default true,
  image_url text,
  image_alt text
);

create table if not exists product_variants (
  id bigserial primary key,
  product_id bigint not null references products(id) on delete cascade,
  variant text not null,
  price numeric(10,2) not null,
  unique(product_id, variant)
);

create table if not exists inventory (
  id bigserial primary key,
  variant_id bigint not null references product_variants(id) on delete cascade,
  quantity integer not null default 0,
  unique(variant_id)
);

create table if not exists sales (
  id bigserial primary key,
  seller_id bigint not null references sellers(id),
  buyer text,
  total numeric(10,2) not null default 0,
  sold_at timestamptz not null default now()
);

create table if not exists sale_items (
  id bigserial primary key,
  sale_id bigint not null references sales(id) on delete cascade,
  variant_id bigint not null references product_variants(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  line_total numeric(10,2) generated always as (quantity * unit_price) stored
);

-- ===========================================================
-- FUNÇÕES E TRIGGERS
-- ===========================================================

create or replace function recompute_sale_total() returns trigger as $$
begin
  update sales
    set total = coalesce((
      select sum(line_total) from sale_items where sale_id = new.sale_id
    ), 0)
  where id = new.sale_id;
  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_recompute_total_ins on sale_items;
create trigger trg_recompute_total_ins
after insert or update or delete on sale_items
for each row
execute function recompute_sale_total();

create or replace function adjust_inventory() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update inventory set quantity = quantity - new.quantity where variant_id = new.variant_id;
  elsif tg_op = 'DELETE' then
    update inventory set quantity = quantity + old.quantity where variant_id = old.variant_id;
  elsif tg_op = 'UPDATE' then
    if new.variant_id = old.variant_id then
      update inventory set quantity = quantity - (new.quantity - old.quantity) where variant_id = new.variant_id;
    else
      update inventory set quantity = quantity - new.quantity where variant_id = new.variant_id;
      update inventory set quantity = quantity + old.quantity where variant_id = old.variant_id;
    end if;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_adjust_inventory on sale_items;
create trigger trg_adjust_inventory
after insert or update or delete on sale_items
for each row
execute function adjust_inventory();

-- ===========================================================
-- ÍNDICES
-- ===========================================================

create index if not exists idx_sales_sold_at on sales (sold_at desc);
create index if not exists idx_sale_items_sale on sale_items (sale_id);
create index if not exists idx_variants_product on product_variants (product_id);

-- ===========================================================
-- VENDEDORES INICIAIS
-- ===========================================================

insert into sellers (name) values
  ('Deh'),
  ('Keu'),
  ('Igor'),
  ('Ricardo')
on conflict (name) do nothing;

-- VENDAS
create table if not exists sales (
  id serial primary key,
  seller text not null,           -- Deh, Keu, Igor, Ricardo
  buyer text,                     -- opcional
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists sale_items (
  id serial primary key,
  sale_id int not null references sales(id) on delete cascade,
  variant_id int not null references product_variants(id) on delete restrict,
  quantity int not null check (quantity > 0),
  price numeric(12,2) not null
);

create index if not exists sale_items_sale_id_idx on sale_items(sale_id);
create index if not exists sale_items_variant_id_idx on sale_items(variant_id);

-- =======================
-- AJUSTE TABELAS DE VENDAS
-- =======================

-- Cria as tabelas se ainda não existirem
create table if not exists sales (
  id serial primary key,
  seller text not null,
  buyer text,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists sale_items (
  id serial primary key,
  sale_id int not null references sales(id) on delete cascade,
  variant_id int not null references product_variants(id) on delete restrict,
  quantity int not null check (quantity > 0),
  price numeric(12,2) not null
);

-- Garante que as colunas existem (caso a tabela já existisse sem elas)
alter table sales
  add column if not exists seller text,
  add column if not exists buyer text,
  add column if not exists total numeric(12,2) default 0,
  add column if not exists created_at timestamptz default now();

-- Torna seller obrigatório e remove default do total (se você quiser)
do $$
begin
  -- Se houver valores nulos em seller, define algo provisório
  update sales set seller = 'Desconhecido' where seller is null;

  -- Deixa NOT NULL
  alter table sales
    alter column seller set not null,
    alter column total set not null,
    alter column created_at set not null;
exception when others then
  -- ignora caso já estejam assim
  null;
end $$;

-- Índices úteis
create index if not exists sale_items_sale_id_idx on sale_items(sale_id);
create index if not exists sale_items_variant_id_idx on sale_items(variant_id);

-- ========= AJUSTE seller_id EM sales =========
-- Em alguns bancos antigos havia a coluna seller_id NOT NULL.
-- Tornamos opcional (ou ignoramos se não existir).

do $$
begin
  -- Se a coluna existir, remove o NOT NULL
  perform 1
  from information_schema.columns
  where table_name = 'sales' and column_name = 'seller_id';

  if found then
    begin
      alter table sales alter column seller_id drop not null;
    exception when others then
      -- ignora se já estiver sem NOT NULL ou outro motivo
      null;
    end;
  end if;
end $$;

-- ========= AJUSTE sale_items.price =========
-- Garante a coluna price nos itens de venda

alter table sale_items
  add column if not exists price numeric(12,2);

-- Se a coluna acabou de ser criada, preenche com o preço atual da variante
update sale_items si
set price = pv.price::numeric
from product_variants pv
where si.variant_id = pv.id
  and (si.price is null or si.price = 0);

-- Torna NOT NULL e define um valor padrão de segurança
do $$
begin
  update sale_items set price = 0 where price is null;
  alter table sale_items alter column price set not null;
exception when others then
  null;
end $$;

-- ========= AJUSTE sale_items.unit_price =========
-- Garante que a coluna unit_price exista e esteja preenchida

alter table sale_items
  add column if not exists unit_price numeric(12,2);

-- Preenche unit_price a partir do preço atual da variante quando estiver nulo
update sale_items si
set unit_price = pv.price::numeric
from product_variants pv
where si.variant_id = pv.id
  and (si.unit_price is null or si.unit_price = 0);

-- Torna NOT NULL
do $$
begin
  update sale_items set unit_price = 0 where unit_price is null;
  alter table sale_items alter column unit_price set not null;
exception when others then
  null;
end $$;

-- ========= AJUSTE: sale_items.price vs unit_price =========
-- Garantimos as duas colunas e removemos NOT NULL de price,
-- já que passaremos a usar unit_price.

-- Cria colunas se faltarem
alter table sale_items
  add column if not exists unit_price numeric(12,2),
  add column if not exists price numeric(12,2);

-- Preenche unit_price com price (se unit_price estiver vazio)
update sale_items
set unit_price = coalesce(unit_price, price)
where unit_price is null;

-- Mantém price consistente quando estiver nulo
update sale_items
set price = unit_price
where price is null and unit_price is not null;

-- Deixa unit_price obrigatório
do $$
begin
  alter table sale_items alter column unit_price set not null;
exception when others then
  null;
end $$;

-- E remove a obrigatoriedade de price (para não bloquear inserts)
do $$
begin
  alter table sale_items alter column price drop not null;
exception when others then
  null;
end $$;

-- ===== Caixa: saídas de dinheiro =====
CREATE TABLE IF NOT EXISTS cash_outs (
  id BIGSERIAL PRIMARY KEY,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cash_outs_created_at_idx
  ON cash_outs (created_at DESC);
