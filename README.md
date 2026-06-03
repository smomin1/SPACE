# SPACE

**Software Platform Analysis, Comparison, and Evaluation**

A multi-role web application for structured evaluation of educational technology platforms. Pedagogy and technical teams score platforms independently, reconcile conflicts, and results feed into an analytics dashboard to support procurement decisions.

---

## Requirements

Make sure the following are installed before you begin.

| Tool | Minimum version | Notes |
|---|---|---|
| Node.js | 20 | [nodejs.org](https://nodejs.org) |
| npm | 10 | Bundled with Node.js |
| PostgreSQL | 14 | Must be running locally or accessible remotely |
| Git | any | To clone the repository |

---

## 1. Clone the Repository

```bash
git clone https://github.com/smomin1/Evaluator.git
cd Evaluator
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Install and Configure PostgreSQL

1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer and complete the setup wizard
3. **Important:** Set a password for the `postgres` user when prompted (write it down)
4. Skip Stack Builder at the end (you can click Cancel)

### Verify PostgreSQL is on your PATH (Windows)

If the `psql` command is not recognised in your terminal, add PostgreSQL to your PATH:

```powershell
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"
```

Replace `18` with your installed PostgreSQL version. To make this permanent, add the line above to your PowerShell profile (`notepad $PROFILE`).

### Create the Database

Connect to PostgreSQL and create the project database:

```powershell
psql -U postgres
```

Enter the password you set during installation. Then at the `postgres=#` prompt run:

```sql
CREATE DATABASE space_evaluator;
\q
```

---

## 4. Configure Environment Variables

Prisma reads from `.env` by default, and Next.js also reads `.env.local`. Create **both files** in the project root with the same content:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/space_evaluator"
AUTH_SECRET="super-secret-key-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"
SENDGRID_API_KEY=""
EMAIL_FROM="SPACE <noreply@space-eval.app>"
ANTHROPIC_API_KEY=""
```

Replace `YOUR_PASSWORD` with the PostgreSQL password you set during installation.

**Quick way to create both files (PowerShell):**

```powershell
@"
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/space_evaluator"
AUTH_SECRET="super-secret-key-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"
SENDGRID_API_KEY=""
EMAIL_FROM="SPACE <noreply@space-eval.app>"
ANTHROPIC_API_KEY=""
"@ | Out-File .env.local -Encoding UTF8

Copy-Item .env.local .env
```

> Both `.env` and `.env.local` are needed: `.env` is read by Prisma CLI commands, and `.env.local` is read by Next.js at runtime.

### API Keys

The app works without these keys, but some features will be disabled until they are set.

| Variable | Required? | What it powers | Where to get it |
|---|---|---|---|
| `SENDGRID_API_KEY` | Optional | Outbound email (temp passwords, password resets, access-request approvals). If empty, emails are logged to the server console instead of being sent. | [SendGrid dashboard → API Keys](https://app.sendgrid.com/settings/api_keys) (key starts with `SG.`) |
| `EMAIL_FROM` | Optional | The "From" address on outbound emails. Must match a sender you have verified in SendGrid, otherwise sends will fail. Format: `"Display Name <email@domain.com>"`. | Your verified sender in SendGrid |
| `ANTHROPIC_API_KEY` | Required for tool scanner | The Claude-powered tool scanner at `/api/tool-scanner/evaluate`. Without it, that route will throw. | [console.anthropic.com → API Keys](https://console.anthropic.com/settings/keys) (key starts with `sk-ant-`) |

Restart `npm run dev` after editing `.env.local` so Next.js picks up the new values.

---

## 5. Generate Prisma Client

Before running migrations or seeding, generate the Prisma client based on the schema:

```bash
npx prisma generate
```

This creates the typed database client used by the application code.

---

## 6. Run Database Migrations

```bash
npx prisma migrate deploy
```

This applies all migrations from `prisma/migrations/` and creates the schema in your `space_evaluator` database.

---

## 7. Seed Sample Data (Optional)

To pre-populate the database with sample requirements and test accounts:

```bash
npx prisma db seed
```

This creates the following test accounts:

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@eval.com` | `Admin1234!` |
| Admin | `admin@eval.com` | `Admin1234!` |
| Pedagogy Evaluator | `pedagogy@eval.com` | `Evaluator1234!` |
| Technical Evaluator | `technical@eval.com` | `Evaluator1234!` |
| Viewer | `viewer@eval.com` | `Viewer1234!` |

> **Skip this step** if you want to start with an empty database and create your own Super Admin account via the `/setup` page.

### Resetting the Database

To wipe all data and start fresh:

```bash
npx prisma migrate reset
```

This drops all tables, re-runs migrations, and asks whether to re-seed. Choose `n` to keep the database empty.

---

## 8. Start the Development Server

```bash
npm run dev
```

The app will be running at **http://localhost:3000**

---

## 9. First Login

**If you ran the seed command:**

Open **http://localhost:3000/login** and sign in with one of the seeded accounts (Super Admin recommended for full access).

**If you skipped seeding:**

1. Open **http://localhost:3000** in your browser
2. You will be redirected automatically to **http://localhost:3000/setup**
3. Enter a full name, email address, and a password (8 characters minimum)
4. Click **Create Super Admin Account**
5. You will be taken to the login page

> Once a Super Admin exists, the `/setup` page is permanently locked and redirects to login. There can only ever be one Super Admin.

---

## 10. Get Started

Use the sidebar to configure the application:

- **Requirements** - Define the criteria platforms will be evaluated against
- **Contexts** - Create evaluation contexts such as K-12 or Higher Education
- **Platforms** - Register platforms and assign evaluators to them
- **Users** - Create accounts for other team members

---

## User Roles

| Role | What they can do |
|---|---|
| **Super Admin** | Full access, including creating and managing user accounts |
| **Admin** | Requirements, Contexts, Platforms, Evaluations, Results |
| **Pedagogy Evaluator** | Score pedagogy requirements for assigned platforms |
| **Technical Evaluator** | Score technical requirements for assigned platforms |
| **Viewer** | Read-only access to results and dashboards |

---

## Scripts

```bash
# Start the development server
npm run dev

# Build for production
npm run build

# Start the production server (requires a build first)
npm start

# Run all tests
npm test

# Run linting
npm run lint
```

---

## Database Commands

```bash
# Apply all pending migrations
npx prisma migrate deploy

# Create and apply a new migration (development only)
npx prisma migrate dev

# Seed the database with sample data
npx prisma db seed

# Open the Prisma visual database browser
npx prisma studio
```

---

## Deploying to Production

This application is designed to run on **Vercel** with any PostgreSQL provider (including Vercel Postgres).

1. Push the repository to GitHub
2. Import the project in the [Vercel dashboard](https://vercel.com)
3. Add the following environment variables:
   - `DATABASE_URL` - your production PostgreSQL connection string
   - `AUTH_SECRET` - a securely generated secret (`openssl rand -base64 32`)
   - `NEXTAUTH_URL` - your deployed URL (e.g. `https://your-app.vercel.app`)
   - `SENDGRID_API_KEY` - optional, enables real email delivery (see API Keys above)
   - `EMAIL_FROM` - optional, "From" address for emails (must be a verified SendGrid sender)
   - `ANTHROPIC_API_KEY` - required if you use the tool-scanner feature
4. Vercel will build and deploy automatically on each push
5. Run migrations against the production database once:

```bash
DATABASE_URL="your-production-url" npx prisma migrate deploy
```

6. Visit your deployed URL and complete Super Admin setup at `/setup`

---

## Project Structure

```
/app
  /api                  REST API route handlers
  /setup                First-run Super Admin setup
  /(dashboard)          Authenticated app shell
    /admin              Admin section (requirements, contexts, platforms, users)
    /evaluate           Evaluator scoring workspace
    /results            Results and analytics dashboard

/components
  /ui                   Base UI components (shadcn/ui - do not modify)
  /shared               Shared layout (Sidebar, Footer)
  /admin                Admin section components
  /export               PDF and XLSX export components

/lib
  auth.ts               NextAuth configuration
  permissions.ts        Role permission matrix (single source of truth)
  scoring.ts            Weighted score calculation functions

/prisma
  schema.prisma         Database schema
  migrations/           Migration history - do not edit manually
  seed.ts               Sample data seed script
```

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma v7 |
| Authentication | NextAuth.js v5 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Charts | Recharts |
| Export | react-pdf, xlsx |
