# CLAUDE.md — LeaseUp Bulldog

## What This Product Does

LeaseUp Bulldog is an AI-powered lease-up platform for multifamily operators.
It captures apartment leads, responds instantly via SMS, qualifies prospects
using AI, tracks follow-ups, and pushes leads toward tours and applications —
all from a single operator dashboard.

## Main Users

| Role             | What they do                                                        |
|------------------|---------------------------------------------------------------------|
| Operator         | Owns the portfolio. Monitors pipeline health and conversion KPIs.   |
| Property Manager | Manages day-to-day leads for one or more properties.                |
| Admin            | Configures properties, sets specials, manages integrations.         |

## KPI Goals

These are the metrics the product is designed to move:

- **Response time** — first outbound message must go out within 60 seconds of lead creation
- **Tour rate** — % of qualified leads who schedule a tour
- **Application start rate** — % of toured leads who start an application
- **Application completion rate** — % of started applications that are submitted

## Tone Guidelines for Prospect Communication

All AI-generated messages to prospects must be:

- **Human** — write like a helpful leasing agent, not a chatbot
- **Urgent but calm** — convey availability without pressure
- **Helpful first** — lead with what you can do for them, not what you need from them
- **Never robotic** — no "Your inquiry has been received." style language
- **Never pushy** — no countdown timers, fake scarcity, or high-pressure tactics

## Business Rules

1. Every lead must belong to a property — no orphan leads
2. Every conversation message (inbound and outbound) must be logged to the `conversations` table
3. Every outbound AI-generated message must reference a valid `lead_id`
4. We never promise specials, concessions, or pricing unless those values are stored in the property's settings record
5. We always attempt to collect move-in timing, unit type (bedrooms), and budget from each prospect — these are required for qualification

## Technical Rules

- **TypeScript** everywhere — no `any`, no implicit types
- **Reusable components** — if a UI pattern appears more than once, extract it to `components/`
- **Keep API routes thin** — routes handle request/response only; business logic lives in `lib/`
- **Centralize external integrations** — Supabase, Twilio, and Anthropic clients live in `lib/` and are never instantiated inline
- **Use Zod for validation** on all API route inputs — parse before you trust
- **Server-side secrets** — never expose service-role keys or API tokens to the browser
- **Environment variables** — all secrets in `.env.local`, never hardcoded

## Folder Structure Reference

```
app/
  api/           ← thin route handlers only
  (dashboard)/   ← operator-facing pages
lib/
  ai/            ← AI prompts and qualification logic
  supabase.ts    ← Supabase client factory
  twilio.ts      ← SMS send helper
  anthropic.ts   ← Claude client factory
components/      ← shared UI components
types/           ← shared TypeScript types
supabase/
  migrations/    ← SQL run in Supabase SQL editor
```
