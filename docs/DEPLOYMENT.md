# Deployment

## Platform

Edyfra is deployed on a modern serverless platform with edge functions.

## Prerequisites

- Hosting platform account
- Managed PostgreSQL database
- Authentication provider
- Real-time services (chat/video)
- Email service
- AI provider API access
- Payment gateway credentials (optional)

## Environment Variables

All configuration is handled through environment variables. See `.env.example` for required variables.

## Deploy Steps

1. Set up the managed database and run migrations
2. Configure environment variables in the hosting platform
3. Deploy the application
4. Verify the health endpoint
5. Test authentication and core flows
6. Configure custom domain and monitoring

## CI/CD

Automated pipelines run linting, type checking, and builds on every change.

## Production Checklist

See internal checklist for production readiness.
