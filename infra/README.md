# Infrastructure

`compose.yaml` is a staging/production template, not a local-development replacement.
Run each environment on a separate host or with a distinct Compose project name,
database volume, domains, and secret set.

## Prepare an environment

1. Copy `.env.example` to `.env` on the target host.
2. Replace every placeholder from the host secret store. Do not commit `.env`.
3. Set immutable API, migration, and web image tags (normally the commit SHA).
4. Put a TLS reverse proxy/load balancer in front of web and API. The default web
   binding is loopback-only; PostgreSQL and Redis are not published.
5. Authenticate the host to the container registry.

Validate without starting services:

```sh
docker compose --env-file infra/.env -f infra/compose.yaml config --quiet
```

For a local image smoke build, leave image names at their defaults and run:

```sh
docker compose --env-file infra/.env -f infra/compose.yaml build api web migrate
```

## Release

Follow `docs/runbook.md`. In short: back up, pull immutable images, run the one-off
migration profile, start services, then execute health and redirect smoke tests.

```sh
docker compose --env-file infra/.env -f infra/compose.yaml pull
docker compose --env-file infra/.env -f infra/compose.yaml --profile release run --rm migrate
docker compose --env-file infra/.env -f infra/compose.yaml up -d --remove-orphans api web
```

Production and staging use the same artifact. Configuration changes by environment;
code is never rebuilt on the server. `NEXT_PUBLIC_API_URL` is compiled into the web
bundle, so CD must build a web image for the intended public API URL.

## Worker status

There is intentionally no worker service or Dockerfile. The API has no worker
entrypoint or durable job contract yet. Starting another API process as a “worker”
would duplicate HTTP serving and would not consume jobs. Add a worker image only when
the extraction gates in `docs/architecture.md` are met.
