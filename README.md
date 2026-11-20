# Compose Tasks

A small, full-stack task manager that demonstrates a multi-container Docker Compose setup:

- **Web** — responsive interface served by Nginx
- **API** — Node.js and Express REST API
- **Database** — PostgreSQL with a persistent named volume

GitHub Actions builds the Compose stack and runs an API integration smoke test on pushes and pull requests.

## Run locally

You need [Docker Desktop](https://www.docker.com/products/docker-desktop/) with Docker Compose enabled.

1. Copy the example environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Change `POSTGRES_PASSWORD` in `.env` to a local development password.
3. Build and start the services:

   ```powershell
   docker compose up --build
   ```

4. Open [http://localhost:8080](http://localhost:8080).

Compose starts PostgreSQL first, waits for its health check, then starts the API and web service. The database data is stored in the `postgres_data` named volume and survives container restarts.

To stop the services, press **Ctrl+C** and run:

```powershell
docker compose down
```

To also remove the saved database data:

```powershell
docker compose down --volumes
```

## API

The API is available through the web service at `http://localhost:8080/api`.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Check API and database connectivity |
| `GET` | `/api/tasks` | List tasks |
| `POST` | `/api/tasks` | Create a task with `{"title":"..."}` |
| `PATCH` | `/api/tasks/:id` | Set completion with `{"completed":true}` |
| `DELETE` | `/api/tasks/:id` | Delete a task |

The database is not published to the host. The API validates task lengths, uses parameterized SQL, and returns JSON errors for invalid requests.

## Project layout

```text
.
├── api/                 # Express API and database schema
├── web/                 # Static frontend and Nginx reverse proxy
├── compose.yaml         # Service and health-check definitions
├── .env.example         # Local configuration template
└── README.md
```

## Configuration and security

`.env` is ignored by Git; commit `.env.example`, never your local `.env`. The example password is for local development only. This project is not configured for production deployment: add proper secret management, TLS, authentication, backups, and production hardening before exposing it publicly.

## Stop and reset

```powershell
docker compose down
docker compose down --volumes  # also deletes the local database contents
```

## License

MIT
