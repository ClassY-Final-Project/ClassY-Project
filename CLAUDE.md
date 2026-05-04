# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Web (Next.js)
```bash
cd web
npm run dev      # Start dev server on :3000
npm run build    # Production build
npm run lint     # Run ESLint
```

### AI Engine (FastAPI)
```bash
cd ai-engine
uvicorn main:app --reload   # Start AI engine (defaults to :8000)
```

### Database
```bash
cd web
npx prisma generate          # Regenerate Prisma client after schema changes
npx prisma db push           # Push schema changes to database
npx prisma studio            # Open Prisma Studio GUI
```

## Architecture

This is a monorepo with two services:

- **`/web`** — Next.js 16 full-stack app (React 19, TypeScript, Tailwind CSS 4, Prisma ORM)
- **`/ai-engine`** — Python FastAPI service using Google Gemini 2.0 Flash Lite for AI processing

### How the two services interact

The Next.js API routes call the AI engine at `http://localhost:8000` for heavy AI work (PDF → summaries, flashcards, quizzes). The AI engine is not exposed to the browser directly.

### Web app structure (`web/src/`)

```
app/
  api/          # 28+ API route handlers (server-side, use Prisma directly)
  auth/         # Login, register, password reset pages
  dashboard/    # Student dashboard
  instructor/   # Instructor dashboard and profile pages
  courses/      # Course marketplace
  study/        # Study area — notes, flashcards, quizzes
  live/         # Daily.co video room pages
  notes/        # Note detail views
  payment/      # Payment flow
components/     # Shared UI: Navbar, Toast, Skeleton, PageTransition
context/        # AuthContext — JWT token stored in localStorage as `classy_token`
lib/
  auth.ts       # verifyToken() — used in every API route for auth
  prisma.ts     # Prisma client singleton
  apiClient.ts  # Browser-side fetch wrapper (attaches token automatically)
```

### Authentication

JWT-based. Token is stored in `localStorage` as `classy_token`. All API routes call `verifyToken()` from `lib/auth.ts` to authenticate requests. The `AuthContext` provides `user`, `login()`, and `logout()` across the app.

### Database

PostgreSQL hosted on Supabase. Schema is at `web/prisma/schema.prisma`. Core models: `User` (roles: STUDENT / INSTRUCTOR / ADMIN), `Course`, `Enrollment`, `StudyNote`, `Quiz`, `QuizQuestion`, `Flashcard`, `LiveRoom`, `RoomParticipant`, `Subscription`.

### AI flow

1. Student uploads a PDF to `/api/notes` — stored and a `StudyNote` record created with status `PENDING`
2. The Next.js API forwards the PDF to the AI engine
3. AI engine (Gemini) returns summaries, flashcards, and quiz questions
4. Results saved to DB; note status set to `COMPLETED` or `FAILED`

### Live classrooms

Built on [Daily.co](https://daily.co). Instructors create rooms via `/api/live-rooms`; participants join using a Daily token fetched from `/api/live-rooms/[roomId]/token`.

### Environment variables

**`web/.env`**
```
DATABASE_URL        # PostgreSQL (Supabase pooler)
DIRECT_URL          # Direct DB connection (for migrations)
JWT_SECRET
DAILY_API_KEY
```

**`ai-engine/.env`**
```
GEMINI_API_KEY
```

### API documentation

Swagger UI is available at `/api-doc` when the dev server is running. Docs are auto-generated from JSDoc comments in API route files.
