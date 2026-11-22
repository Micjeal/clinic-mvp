# Architecture

## Runtime boundaries

`apps/web/src/app` contains Next.js routes and thin composition. Reusable presentation is in `components`; appointment UI is in `features/appointments`. Server Actions in `server/actions` parse requests and map safe responses. Domain behavior is in `server/services`; direct Supabase table access is in `server/repositories`.

The intended direction is:

```text
UI → Server Action → Service → Repository → Supabase
```

Server Components call services directly for reads. They do not call the application over HTTP. HTTP routes should be added only for webhooks, integrations, mobile, or external API boundaries.

## Packages

`@clinic/database` is generated from the existing Supabase project. `@clinic/validation` contains reusable domain schemas. `@clinic/permissions` contains permission constants. `@clinic/shared` is deliberately small and framework-neutral.

## Future extraction

The service/repository boundary is designed so a future `apps/api` (NestJS) or mobile client can reuse the domain contracts without introducing that server today.
