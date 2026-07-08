# Architecture

## Overview

Urlytics follows a monorepo structure:

- apps/web -> frontend
- apps/api -> backend

## Backend

- NestJS modular architecture
- Prisma ORM
- PostgreSQL database

## Frontend

- Next.js App Router
- API communication via REST

## Data Flow

Client -> Next.js -> API (NestJS) -> Prisma -> PostgreSQL