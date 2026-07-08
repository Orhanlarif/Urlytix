
---

# 🧠 3. AGENTS.md

```md
# AGENTS.md

This file provides instructions for AI agents (Codex, Cursor, ChatGPT) working on this repository.

## Project Overview

Urlytics is a SaaS link analytics platform similar to Bitly + analytics.

## Tech Stack

- Frontend: Next.js (App Router)
- Backend: NestJS
- ORM: Prisma
- Database: PostgreSQL
- Package Manager: pnpm

## Rules

- Do NOT break existing working features
- Always follow existing project structure
- Backend must follow NestJS modular architecture
- Frontend must follow clean component structure
- Use TypeScript strictly (no any unless necessary)

## Backend Guidelines

- Use DTOs for all inputs
- Validate inputs with class-validator
- Keep controllers thin, logic in services
- Prisma is the only DB layer

## Frontend Guidelines

- Use modern UI (SaaS style)
- Keep components reusable
- API calls must go through service layer

## Commands

```bash
pnpm dev
pnpm build
pnpm lint