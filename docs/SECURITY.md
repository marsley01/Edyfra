# Security

## Overview

Edyfra follows security best practices for production applications.

## Authentication & Authorization

- OAuth-compatible authentication
- Role-based access control
- Server-side session management
- Protected server-side mutations

## Input Validation

- All inputs validated server-side
- User-generated content sanitized
- Parameterized database queries

## Request Security

- CORS enforcement
- CSRF protection
- Rate limiting
- Security headers (CSP, X-Frame-Options, etc.)
- HTTPS enforcement

## Data Protection

- No secrets in client code
- Minimal data exposure in API responses
- Secure cookie configuration
- Server-side only access to sensitive operations

## Vulnerability Reporting

See `SECURITY.md` in the repository root for reporting vulnerabilities.
