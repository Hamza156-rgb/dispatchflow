# DispatchFlow 🚛

**Production-ready SaaS for truck dispatchers** — manage clients, generate invoices, track payments, and analyze revenue.

---

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Query, React Hook Form |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL 16, Prisma ORM |
| Auth | JWT + bcrypt |
| PDF | PDFKit |
| Email | Nodemailer |
| Infra | Docker, Docker Compose |

---

## Quick Start (Docker)

```bash
git clone https://github.com/yourorg/dispatchflow
cd dispatchflow

# Copy env
cp .env.example backend/.env
cp .env.example frontend/.env

# Edit .env files with your values, then:
cd docker
docker compose up -d

# Run migrations + seed
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run db:seed
```

App will be at: http://localhost:5173

---

## Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- pnpm or npm

### Backend

```bash
cd backend
npm install
cp ../.env.example .env          # Edit DATABASE_URL, JWT_SECRET, SMTP_*

npx prisma generate
npx prisma migrate dev --name init
npm run db:seed                  # Loads demo data
npm run dev                      # Starts on :5000
```

### Frontend

```bash
cd frontend
npm install
cp ../.env.example .env          # Set VITE_API_URL=http://localhost:5000/api
npm run dev                      # Starts on :5173
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/dispatchflow` |
| `JWT_SECRET` | Secret for signing JWTs (32+ chars) | `change-me-in-production-32chars` |
| `PORT` | API server port | `5000` |
| `FRONTEND_URL` | CORS origin | `http://localhost:5173` |
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username/email | `you@gmail.com` |
| `SMTP_PASS` | SMTP password or app password | `your-app-password` |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL |

---

## API Reference

### Auth

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | `{fullName, email, password, companyName}` | Register new user |
| POST | `/api/auth/login` | `{email, password}` | Login, returns JWT |
| GET | `/api/auth/me` | — | Get current user (auth required) |
| POST | `/api/auth/forgot-password` | `{email}` | Send password reset |

### Clients

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/clients` | List clients (search, pagination, sort) |
| GET | `/api/clients/:id` | Get client + invoice history |
| POST | `/api/clients` | Create client |
| PUT | `/api/clients/:id` | Update client |
| DELETE | `/api/clients/:id` | Delete client |

### Invoices

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | List invoices (filter by status, client, search) |
| GET | `/api/invoices/:id` | Get invoice with items + payments |
| POST | `/api/invoices` | Create invoice (auto-calculates totals) |
| PUT | `/api/invoices/:id` | Update invoice |
| DELETE | `/api/invoices/:id` | Delete invoice |
| GET | `/api/invoices/:id/pdf` | Download PDF |
| POST | `/api/invoices/:id/send` | Send invoice via email |

### Payments

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/payments` | `{invoiceId, amount, paymentDate, paymentMethod}` | Record payment, auto-updates invoice status |

### Reports

| Method | Endpoint | Query | Description |
|--------|----------|-------|-------------|
| GET | `/api/reports` | `?year=2025` | Revenue + status breakdown |
| GET | `/api/reports/dashboard` | — | Dashboard stats |

All routes except `/api/auth/register` and `/api/auth/login` require:
```
Authorization: Bearer <jwt_token>
```

---

## Database Schema

```
User ──< Client ──< Invoice ──< InvoiceItem
                          └──< Payment
```

Run `npx prisma studio` for a visual database browser.

### Migrations

```bash
# Create a new migration
npx prisma migrate dev --name add_feature

# Deploy migrations in production
npx prisma migrate deploy

# Reset database (dev only!)
npx prisma migrate reset
```

---

## Project Structure

```
dispatchflow/
├── frontend/
│   └── src/
│       ├── components/          # Reusable UI
│       │   ├── ui/              # Buttons, inputs, modals
│       │   ├── layout/          # Sidebar, TopBar
│       │   ├── dashboard/       # Dashboard widgets
│       │   ├── clients/         # Client components
│       │   └── invoices/        # Invoice components
│       ├── pages/               # Route pages
│       ├── hooks/               # Custom React hooks
│       ├── lib/                 # Axios instance, helpers
│       ├── types/               # TypeScript types
│       └── store/               # Zustand state
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # DB schema
│   │   └── migrations/          # SQL migrations
│   └── src/
│       ├── controllers/         # Route handlers
│       ├── middleware/          # Auth, error handling
│       ├── routes/              # Express routers
│       ├── services/            # Business logic
│       └── utils/               # Logger, helpers
│
├── docker/
│   └── docker-compose.yml
└── docs/
    └── api.md
```

---

## Features

- **Authentication** — JWT-based, bcrypt password hashing, forgot password flow
- **Client Management** — CRUD with search, pagination, invoice history view
- **Invoice Management** — Full lifecycle: Draft → Sent → Paid, automatic overdue detection
- **PDF Generation** — Professional branded PDF invoices via PDFKit
- **Email** — Send invoices with Nodemailer + PDF attachment
- **Payment Tracking** — Record payments by method, auto-mark paid when fully settled
- **Reports** — Monthly revenue, top clients, status breakdown, CSV export
- **Dark Mode** — Full dark theme support
- **Responsive** — Mobile-friendly sidebar and layouts

---

## Deployment

### Production Environment

Set `NODE_ENV=production` and use strong values for `JWT_SECRET`.

### Using Docker Compose in Production

```bash
# Build production images
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d
```

### Database Backups

```bash
# Backup
docker compose exec postgres pg_dump -U dispatchflow dispatchflow > backup.sql

# Restore
cat backup.sql | docker compose exec -T postgres psql -U dispatchflow dispatchflow
```

---

## Seed Data

```bash
npm run db:seed
```

Creates demo account: `demo@dispatchflow.app` / `Demo1234!` with 6 clients, 12 invoices, and 6 months of revenue data.

---

## License

MIT
