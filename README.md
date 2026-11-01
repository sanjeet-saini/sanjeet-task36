# JWT Authentication Demo

React frontend + Express backend showing register → login → JWT-protected route.

## Run locally

```bash
# terminal 1
cd server && npm install && npm start      # http://localhost:5000

# terminal 2
cd client && npm install && npm start      # http://localhost:3000 (proxies API to :5000)
```

## Production (single service)

```bash
npm run build      # installs deps and builds the React app into client/build
JWT_SECRET=<long-random-string> NODE_ENV=production npm start
```

The Express server serves the React build and the API from the same URL.

### Deploy on Render
Push this folder to GitHub, then in Render choose **New → Blueprint** and pick the repo.
`render.yaml` sets the build/start commands and generates `JWT_SECRET` automatically.

## API

| Method | Path        | Body / Header                     |
|--------|-------------|-----------------------------------|
| POST   | /register   | `{ username, password }` (password 6–72 chars) |
| POST   | /login      | `{ username, password }` → `{ token }` |
| GET    | /protected  | `Authorization: Bearer <token>`   |
| GET    | /health     | —                                  |

> Users are stored in memory, so they are lost whenever the server restarts.
> Add a database (e.g. MongoDB/Postgres) for real use.
