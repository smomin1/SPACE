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

## 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env .env.local
```

Open `.env.local` and set both values:

```env
# Your PostgreSQL connection string
DATABASE_URL="postgresql://<user>@<host>:<port>/<database>"

# Secret used to sign session tokens — generate with: openssl rand -base64 32
AUTH_SECRET="your-secret-here"
```

**Local PostgreSQL example:**

```env
DATABASE_URL="postgresql://postgres@localhost:5432/space_eval"
AUTH_SECRET="TFKnHvZlUMXDy7ESUHpNvBJ2OvMqiFQxCJ9H63A0/cU="
```

> The database does not need to exist yet. The next step creates all tables automatically.

---

## 4. Run Database Migrations

```bash
DATABASE_URL="postgresql://<user>@<host>:<port>/<database>" npx prisma migrate deploy
```

This creates the database schema and applies all migrations.

---

## 5. Seed Sample Data (Optional)

To pre-populate the database with sample requirements and test accounts:

```bash
DATABASE_URL="postgresql://<user>@<host>:<port>/<database>" npx prisma db seed
```

Skip this step if you prefer to start with an empty database.

---

## 6. Start the Development Server

```bash
npm run dev
```

The app will be running at **http://localhost:3000**

---

## 7. Create the Super Admin Account

The application cannot be used until a Super Admin account exists. This is a one-time setup step.

1. Open **http://localhost:3000** in your browser
2. You will be redirected automatically to **http://localhost:3000/setup**
3. Enter a full name, email address, and a password (8 characters minimum)
4. Click **Create Super Admin Account**
5. You will be taken to the login page

> Once created, the `/setup` page is permanently locked and redirects to login. There can only ever be one Super Admin.

---

## 8. Log In and Get Started

Sign in with the Super Admin credentials you just created.

Use the sidebar to configure the application:

- **Requirements** — Define the criteria platforms will be evaluated against
- **Contexts** — Create evaluation contexts such as K-12 or Higher Education
- **Platforms** — Register platforms and assign evaluators to them
- **Users** — Create accounts for other team members

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
   - `DATABASE_URL` — your production PostgreSQL connection string
   - `AUTH_SECRET` — a securely generated secret (`openssl rand -base64 32`)
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
  /ui                   Base UI components (shadcn/ui, do not modify)
  /shared               Shared layout (Sidebar, Footer)
  /admin                Admin section components
  /export               PDF and XLSX export components

/lib
  auth.ts               NextAuth configuration
  permissions.ts        Role permission matrix (single source of truth)
  scoring.ts            Weighted score calculation functions

/prisma
  schema.prisma         Database schema
  migrations/           Migration history (do not edit manually)
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
