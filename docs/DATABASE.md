# Database

## Stack

- **Provider:** Managed PostgreSQL
- **ORM:** Prisma
- **Schema:** Defined in `prisma/schema.prisma`

## Schema Overview

The database schema defines models for users, content, transactions, and institutional data.

## Data Access

All database access is handled server-side through the ORM. No direct database access from the client.

## Migrations

Database migrations are managed through the ORM's migration system.

## Seed Data

Seed scripts are available for local development.
