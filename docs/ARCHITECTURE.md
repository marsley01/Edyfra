# Architecture

## Overview

Edyfra is built on a modern full-stack framework with server-side rendering and a managed backend.

## Key Components

- **Frontend:** Server-rendered React application with client interactivity
- **Backend:** Server-side mutations and REST API routes
- **Middleware:** Edge-level request processing
- **Database:** Managed PostgreSQL with ORM
- **Real-time:** Chat and video infrastructure
- **Background Services:** Asynchronous processing for content and recommendations

## Data Flow

1. Client requests render server components
2. Mutations run server-side with auth guards
3. External integrations via API routes
4. Real-time features via dedicated SDKs
