██╗      ██████╗  ██████╗ ██╗███████╗████████╗██╗ ██████╗ █████╗
██║     ██╔════╝ ██╔════╝ ██║██╔════╝╚══██╔══╝██║██╔════╝██╔══██╗
██║     ██║  ███╗██║  ███╗██║███████╗   ██║   ██║██║     ███████║
██║     ██║   ██║██║   ██║██║╚════██║   ██║   ██║██║     ██╔══██║
███████╗╚██████╔╝╚██████╔╝██║███████║   ██║   ██║╚██████╗██║  ██║
╚══════╝ ╚═════╝  ╚═════╝ ╚═╝╚══════╝   ╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝

Gestionale per associazioni di volontariato — turni, presenze, mezzi e volontari.

---

## Tech Stack

| Frontend | Backend |
|---|---|
| React 19 + Vite 8 | Supabase (PostgreSQL, Auth, RLS) |
| TypeScript 6 | Row Level Security |
| Tailwind CSS 4 | PostgreSQL 15+ |
| React Router 7 | |
| TanStack Query 5 | |
| Lucide React | |
| date-fns 4 | |

## Moduli

- **Anagrafiche** — Gestione volontari e personale (CRUD, ruoli, ricerca)
- **Veicoli** — Gestione mezzi (ambulanze, auto, furgoni)
- **Turni** — Creazione turni con veicolo, attrezzatura (borsoni, DAE, rollup, desk, gazebo), assegnazione volontari
- **Presenze** — Check-in/out geolocalizzato collegato ai turni del giorno
- **Dashboard** — Panoramica con statistiche, prossimi turni, attività recenti

## Flusso di lavoro

1. **Registrazione** → creazione automatica profilo
2. **Crea organizzazione** → diventi admin
3. **Aggiungi volontari** in Anagrafiche
4. **Aggiungi veicoli** in Veicoli
5. **Crea turni** assegnando veicolo, attrezzatura e volontari
6. **I volontari fanno check-in/out** sui turni assegnati

## Setup

```bash
npm install
npm run dev
```

Variabili d'ambiente (`.env`):

```
VITE_SUPABASE_URL=https://tuo-progetto.supabase.co
VITE_SUPABASE_ANON_KEY=tua-chave-anon
```

## Database

Le migration si trovano in `supabase/migrations/`:

| File | Cosa fa |
|---|---|
| `00001_initial_schema.sql` | Schema iniziale (tabelle, RLS, indici) |
| `00002_auth_trigger.sql` | Trigger per auto-creazione profilo |
| `00003_fix_all_rls.sql` | Fix RLS, helper functions, RPC `create_organization` |
| `00004_add_equipment_to_shifts.sql` | Aggiunge attrezzatura ai turni (gazebo) |
