# NORA Gastos

Aplicacion web mobile-first para control de gastos e ingresos personales y compartidos entre miembros de un `household`, construida con `Next.js App Router`, `TypeScript`, `Tailwind CSS` y `Supabase`.

## Stack

- Next.js App Router
- React + TypeScript estricto
- Tailwind CSS
- Supabase Auth, Database y Realtime
- React Hook Form + Zod
- Recharts
- ESLint
- PWA instalable con `manifest` y `service worker`

## Variables de entorno

Usa estas variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_URL=http://localhost:3000
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

### Que hace cada variable

- `NEXT_PUBLIC_SUPABASE_URL`: URL publica de tu proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: clave publica anon para cliente y SSR.
- `SUPABASE_SERVICE_ROLE_KEY`: clave privada solo servidor. Se usa para:
  - crear invitaciones pendientes
  - enviar email de invitacion con `auth.admin.inviteUserByEmail`
  - aceptar automaticamente invitaciones pendientes al iniciar sesion
- `APP_URL`: URL base de tu app. En local suele ser `http://localhost:3000`. En hosting sera tu dominio real.
- `OPENAI_API_KEY`: clave privada para generar temas visuales con IA desde servidor.
- `OPENAI_MODEL`: modelo usado para devolver una paleta estructurada. Por defecto `gpt-4.1-mini`.
- `OPENAI_THEME_GENERATION_ENABLED`: activa el generador de temas con IA. Por defecto debe ir en `false`.

## Instalacion

```bash
npm install
npm run dev
```

La aplicacion quedara disponible en `http://localhost:3000`.

## Rutas principales

- `/login`
- `/register`
- `/accept-invite`
- `/onboarding`
- `/`
- `/add`
- `/transactions`
- `/dashboard`
- `/notifications`
- `/categories`
- `/accounts`
- `/settings`

## Tablas y objetos SQL asumidos

La app trabaja suponiendo que ya existen y funcionan:

- `profiles`
- `households`
- `household_members`
- `accounts`
- `categories`
- `transactions`
- `transaction_splits`
- `settlements`
- `notifications`
- `transaction_audit_log`
- `household_invitations`
- `account_members`
- `household_budget_goals`
- `user_theme_preferences`
- `is_household_member`
- `set_updated_at`
- `log_transaction_changes`
- `validate_transaction_splits`
- `v_transaction_balance`
- `v_monthly_summary`
- `v_category_monthly_expenses`

## SQL adicional esperado para invitaciones

```sql
create table if not exists public.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  invited_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'accepted', 'revoked', 'expired')),
  token uuid not null default gen_random_uuid(),
  send_email boolean not null default false,
  accepted_by_user_id uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_household_invitations_token on public.household_invitations(token);
create index if not exists idx_household_invitations_email_status on public.household_invitations(email, status);

alter table public.household_invitations enable row level security;
```

Si quieres gestionar invitaciones tambien sin `service_role`, deberas anadir policies RLS para lectura y escritura. En esta implementacion las operaciones delicadas se hacen desde servidor con `SUPABASE_SERVICE_ROLE_KEY`.

## SQL adicional esperado para cuentas con varias personas

La app ya soporta cuentas con varias personas vinculadas y saldo inicial editable, pero para eso necesitas esta tabla nueva:

```sql
create table if not exists public.account_members (
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);

alter table public.account_members enable row level security;

drop policy if exists "account_members_select_household" on public.account_members;
create policy "account_members_select_household"
on public.account_members
for select
using (
  exists (
    select 1
    from public.accounts a
    where a.id = account_id
      and public.is_household_member(a.household_id)
  )
);

drop policy if exists "account_members_insert_household" on public.account_members;
create policy "account_members_insert_household"
on public.account_members
for insert
with check (
  exists (
    select 1
    from public.accounts a
    where a.id = account_id
      and public.is_household_member(a.household_id)
  )
);

drop policy if exists "account_members_delete_household" on public.account_members;
create policy "account_members_delete_household"
on public.account_members
for delete
using (
  exists (
    select 1
    from public.accounts a
    where a.id = account_id
      and public.is_household_member(a.household_id)
  )
);
```

### Como funciona el saldo de cuenta

- No se ha anadido una columna `balance` a `accounts`.
- El saldo inicial se guarda como una transaccion `adjustment` con metadata `system = 'opening_balance'`.
- El saldo actual se calcula desde movimientos:
  - `income` suma
  - `adjustment` suma
  - `expense` resta
  - `transfer` queda neutra en esta primera version

## Flujo de invitaciones implementado

1. En onboarding o ajustes introduces un email.
2. Si ese email ya existe en `profiles`, la app anade directamente a la persona al hogar.
3. Si aun no existe:
  - se crea una invitacion pendiente en `household_invitations`
  - opcionalmente se envia correo si marcas el checkbox y existe `SUPABASE_SERVICE_ROLE_KEY`
4. Cuando esa persona se registra o inicia sesion con ese mismo email:
  - NORA Gastos detecta la invitacion pendiente
  - crea el `household_members` correspondiente
  - marca la invitacion como `accepted`

## Hosting

Esto funciona en hosting siempre que pongas estas variables en el servidor:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL`

En Vercel, Railway, Render o similar, `SUPABASE_SERVICE_ROLE_KEY` debe quedar como secreto de servidor y no exponerse al navegador.

## PWA

La app queda preparada como PWA instalable:

- `public/site.webmanifest`
- `public/sw.js`
- `public/offline.html`

### Qué ofrece esta primera versión

- instalación en móvil y desktop
- iconos y nombre de app configurados
- pantalla offline básica
- cache de recursos estáticos e iconos

### Importante

- para que la instalación funcione correctamente, la app debe servirse por `https`
- en local también puede registrar `service worker` en `localhost`
- el modo offline no sustituye al backend: sin conexión no podrá operar con Supabase, pero sí mostrar la pantalla offline y mantenerse instalable

## Reglas de negocio clave

- Un `settlement` nunca reduce `transactions.amount`.
- El pendiente sale de `splits - settlements`.
- Si un gasto de 60 EUR se reparte 50/50 y luego se registra un Bizum de 20 EUR, el sistema mantiene:
  - gasto original: 60 EUR
  - parte deudora: 30 EUR
  - liquidado: 20 EUR
  - pendiente: 10 EUR

## Puntos delicados

- `profiles` debe existir de verdad para cada usuario autenticado. Si no, tus FKs y RLS bloquearan parte del flujo.
- `SUPABASE_SERVICE_ROLE_KEY` es obligatoria para email opcional y aceptacion automatica de invitaciones pendientes.
- `APP_URL` debe coincidir con tu dominio local o de produccion para que `redirectTo` funcione bien en los correos.
- Si quieres cuentas con varias personas reales, debes crear `account_members` antes de usar esa parte de la UI.

## SQL adicional esperado para objetivos de dashboard

Si quieres guardar objetivos por categoria y editar esos limites desde el dashboard, crea esta tabla:

```sql
create table if not exists public.household_budget_goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  period text not null default 'monthly' check (period in ('monthly')),
  target_percent numeric check (target_percent >= 0 and target_percent <= 100),
  target_amount numeric check (target_amount >= 0),
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, category_id)
);

alter table public.household_budget_goals enable row level security;

drop policy if exists "budget_goals_select_household" on public.household_budget_goals;
create policy "budget_goals_select_household"
on public.household_budget_goals
for select
using (public.is_household_member(household_id));

drop policy if exists "budget_goals_insert_household" on public.household_budget_goals;
create policy "budget_goals_insert_household"
on public.household_budget_goals
for insert
with check (
  public.is_household_member(household_id)
  and created_by = auth.uid()
);

drop policy if exists "budget_goals_update_household" on public.household_budget_goals;
create policy "budget_goals_update_household"
on public.household_budget_goals
for update
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop trigger if exists trg_household_budget_goals_updated_at on public.household_budget_goals;
create trigger trg_household_budget_goals_updated_at
before update on public.household_budget_goals
for each row execute function public.set_updated_at();
```

### Como funciona esta capa

- El dashboard sugiere limites por categoria usando los ingresos del mes y algunas reglas base.
- Si guardas un objetivo, pasa a ser personalizado.
- Los tips financieros se generan automaticamente comparando ingreso, gasto, ahorro y desvio frente a objetivos.

## SQL adicional esperado para temas visuales por usuario

Esta tabla es necesaria porque el tema se guarda por usuario y se aplica desde SSR. Sin ella no hay persistencia real del tema ni generacion estable por IA.

```sql
create table if not exists public.user_theme_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  theme_name text,
  source text not null default 'manual' check (source in ('manual', 'ai')),
  mode text not null default 'light' check (mode in ('light', 'dark')),
  prompt text,
  tokens jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_theme_preferences enable row level security;

drop policy if exists "theme_preferences_select_own" on public.user_theme_preferences;
create policy "theme_preferences_select_own"
on public.user_theme_preferences
for select
using (user_id = auth.uid());

drop policy if exists "theme_preferences_insert_own" on public.user_theme_preferences;
create policy "theme_preferences_insert_own"
on public.user_theme_preferences
for insert
with check (user_id = auth.uid());

drop policy if exists "theme_preferences_update_own" on public.user_theme_preferences;
create policy "theme_preferences_update_own"
on public.user_theme_preferences
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "theme_preferences_delete_own" on public.user_theme_preferences;
create policy "theme_preferences_delete_own"
on public.user_theme_preferences
for delete
using (user_id = auth.uid());

drop trigger if exists trg_user_theme_preferences_updated_at on public.user_theme_preferences;
create trigger trg_user_theme_preferences_updated_at
before update on public.user_theme_preferences
for each row execute function public.set_updated_at();
```

### Como funciona esta capa

- El usuario puede ajustar colores clave desde `Ajustes`.
- El tema se guarda solo para esa persona.
- La app lo aplica en SSR usando variables CSS para evitar parpadeos fuertes.
- La IA solo modifica colores y modo claro/oscuro en esta v1.
- Los prompts quedan guardados para saber de donde salio un tema generado.

## Despliegue en IONOS

Esta app no es estatica. Usa SSR, Server Actions y secretos de servidor como `SUPABASE_SERVICE_ROLE_KEY`, asi que necesita ejecutar `Next.js` en Node.js.

### Recomendacion

- Si en IONOS tienes `Deploy Now` o hosting compartido orientado a web estatica/PHP, no es la opcion correcta para esta app.
- La opcion correcta en IONOS es un `VPS`, `Cloud Server` o servidor con `Node.js` donde puedas ejecutar:

```bash
npm install
npm run build
npm run start
```

### Variables minimas en produccion

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_URL=https://gastos.noraapp.es
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
OPENAI_THEME_GENERATION_ENABLED=false
```

### Notas tecnicas

- `APP_URL` debe ser el dominio final real para que auth, correos e invitaciones redirijan bien.
- `next.config.mjs` esta preparado con `output: "standalone"` para facilitar despliegues en servidor Node.
- `serverActions.allowedOrigins` tambien toma el host de `APP_URL`, asi que en produccion no hace falta dejarlo fijo a `localhost`.
#   g a s t o s - n o r a  
 
