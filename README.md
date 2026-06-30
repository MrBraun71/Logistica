# LOGISTICA — CRI Molfetta

Gestionale turni per Croce Rossa Italiana Comitato di Molfetta.

**Live:** [https://mrbraun71.github.io/Logistica/](https://mrbraun71.github.io/Logistica/)

---

## Tech Stack

| Frontend | Backend |
|---|---|
| React 19 + Vite 8 | Supabase (PostgreSQL, Auth, RLS) |
| TypeScript 6 | Row Level Security |
| Tailwind CSS 4 | PostgreSQL 15+ |
| React Router 7 | |
| Material Symbols (Google Fonts CDN) | |
| date-fns 4 | |

## Design System — CRI Molfetta Unified

- **Palette:** Primario `#a30019` (rosso CRI), secondario `#445aa6` (blu), sfondo `#f6f9ff`
- **Font:** Manrope (interfaccia), Inter (label tecniche e dati)
- **Radius:** sm `0.25rem`, default `0.5rem`, md `0.75rem`, lg `1rem`, xl `1.5rem`
- **Ombre:** soft `rgba(29,53,128,0.08)`
- **Componenti:** glass-header con backdrop-blur, sidebar 260px, bottom nav mobile con rounded-t-xl, FAB mobile

## Moduli

- **Dashboard** — Panoramica con statistiche turni (programmati, chiusi, completati, cancellati), elenco turni recenti
- **Turni** — Creazione/modifica turni con tipi (Ordinario, Straordinario, Rappresentanza, Evento, Sanitario), mezzi multipli, attrezzatura, notifiche automatiche
- **Veicoli** — Gestione mezzi (Ambulanza, Auto, Furgone, Moto) con attivazione/disattivazione, icone per tipo
- **Inventario** — Gestione attrezzatura con categorie (Sanitario, Logistica, Comunicazione, Altro)
- **Contatti** — Sede legale, email, telefono del Comitato
- **Supporto** — Contatto tecnico

## Funzionalità principali

- Autenticazione Supabase con registrazione e login
- Due ruoli: **admin** (CRUD completo) e **user** (crea turni + notifica admin)
- Mezzi multipli per turno (junction table `shift_vehicles`)
- Notifiche con polling 15s e badge conteggio (campanella admin)
- FAB mobile contestuale (apre form nuovo elemento in ogni sezione)
- Barra di ricerca in ogni pagina
- Design responsive mobile-first

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

## Deploy su GitHub Pages

Deploy automatico via GitHub Actions su push su `main`.

**Abilitazione (una volta sola):**
1. Vai su **Settings > Pages** del repository
2. In "Build and deployment" seleziona **GitHub Actions**
3. Imposta i secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Database

Migration in `supabase/migrations/` da eseguire in ordine sul SQL Editor di Supabase:

| File | Cosa fa |
|---|---|
| `00001_initial_schema.sql` | Schema iniziale (tabelle, RLS, indici) |
| `00002_auth_trigger.sql` | Trigger per auto-creazione profilo |
| `00003_fix_all_rls.sql` | Fix RLS, helper functions, RPC create_organization |
| `00004_add_equipment_to_shifts.sql` | Aggiunge attrezzatura ai turni |
| `00005_fix_shifts_rls.sql` | Fix RLS turni per non-admin |
| `00006_equipment_notifications.sql` | Colonne inventario + tabella notifiche |
| `00007_shift_vehicles.sql` | Junction table shift_vehicles |
| `00008_shift_types.sql` | Nuovi tipi turno (ordinario, straordinario, rappresentanza, evento, sanitario) |
