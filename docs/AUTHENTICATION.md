# Authentication

## Architecture

Edyfra uses OAuth-compatible authentication with server-side session management. All session handling is done server-side.

## Auth Flow

### Sign Up
1. User submits credentials
2. Account is created and confirmed
3. User profile is initialized
4. User is redirected to onboarding

### Sign In
1. User submits credentials
2. Session is validated server-side
3. User is redirected based on role

### Session Management
- Sessions managed via secure cookies
- Automatic session refresh on every request
- Protected routes enforce authentication server-side

## Security Measures

- Rate limiting on auth endpoints
- CSRF protection on mutation requests
- CORS enforcement
- Security headers
- Input validation on all auth inputs
- Secure cookie configuration
