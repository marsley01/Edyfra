# Migration Guide

## Overview

This guide explains how to migrate existing code to improved patterns while maintaining backward compatibility.

## Migration Phases

### Phase 1: Use Core Services

Replace direct data access with service layer abstractions.

### Phase 2: Split Large Files

Split large modules into focused, single-responsibility files.

### Phase 3: Add Repositories

Create data access layers for each domain.

### Phase 4: Migrate Components

Replace inline styles with design system components.

### Phase 5: Use Shared Utilities

Replace ad-hoc logic with shared hooks and utilities.

## Pattern Comparison

| Pattern | Legacy | Enterprise |
|---------|--------|------------|
| Auth check | Inline checks | Centralized helpers |
| Error handling | Inconsistent | Standardized errors |
| API client | Direct fetch | Typed client |
| DB queries | Direct ORM | Repository pattern |
| Logging | console.log | Structured logger |

## Rollback Plan

Each migration is backward-compatible:
- Old imports still work
- Old patterns still valid
- Wrapper functions provide fallbacks

## Testing

New tests use standard testing frameworks. Existing code can gradually adopt testing.
