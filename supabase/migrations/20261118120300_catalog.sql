-- Global read-only catalog of maintenance types and interval suggestions.
-- Spec 003 §5.5–5.6. Suggestions start EMPTY: values are only added with a verifiable source.

create table public.maintenance_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z_]{1,39}$'),
  name_es text not null check (char_length(name_es) between 1 and 80),
  kind public.maintenance_kind not null,
  applies_to public.vehicle_class[] not null check (cardinality(applies_to) >= 1)
);

create table public.interval_suggestions (
  id uuid primary key default gen_random_uuid(),
  maintenance_type_id uuid not null references public.maintenance_types (id),
  vehicle_class public.vehicle_class not null,
  brand text check (brand is null or char_length(brand) between 1 and 50),
  model text check (model is null or char_length(model) between 1 and 50),
  interval_km integer check (interval_km is null or interval_km between 100 and 200000),
  interval_months smallint check (interval_months is null or interval_months between 1 and 120),
  source text not null check (char_length(source) between 5 and 500),
  check (interval_km is not null or interval_months is not null)
);

insert into public.maintenance_types (code, name_es, kind, applies_to) values
  ('oil_change',  'Cambio de aceite',           'mechanical', '{car,motorcycle}'),
  ('oil_filter',  'Filtro de aceite',           'mechanical', '{car,motorcycle}'),
  ('air_filter',  'Filtro de aire',             'mechanical', '{car,motorcycle}'),
  ('spark_plugs', 'Bujías',                     'mechanical', '{car,motorcycle}'),
  ('brake_pads',  'Pastillas de freno',         'mechanical', '{car,motorcycle}'),
  ('brake_fluid', 'Líquido de frenos',          'mechanical', '{car,motorcycle}'),
  ('coolant',     'Refrigerante',               'mechanical', '{car,motorcycle}'),
  ('tires',       'Llantas',                    'mechanical', '{car,motorcycle}'),
  ('chain_kit',   'Kit de arrastre',            'mechanical', '{motorcycle}'),
  ('soat',        'SOAT',                       'legal',      '{car,motorcycle}'),
  ('rtm',         'Revisión técnico-mecánica',  'legal',      '{car,motorcycle}');
