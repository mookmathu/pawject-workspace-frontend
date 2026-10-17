# Pawject — Frontend

React app (Create React App / `react-scripts`) for Pawject, a Thai-language
team-collaboration workspace (Home / Task board / Chat / Calendar).

## Getting started

```bash
npm install
npm start      # dev server, http://localhost:3000
```

The backend (Express + Prisma) must be running separately — see its own
README for setup. Set `REACT_APP_API_URL` in a `.env` file if it isn't
running at the default `http://localhost:4000/api`.

## Testing

Tests are written with Jest + React Testing Library (both already bundled
via `react-scripts`/`@testing-library/*` in `package.json` — no extra setup
needed).

```bash
npm test           # watch mode
npm run test:ci    # single run, non-interactive (what CI / grading would use)
```

Coverage right now focuses on the pure, dependency-free logic modules —
the parts most worth pinning down with a fast unit test, versus a full
component/integration test:

- `lib/navJump.test.js` — the sessionStorage-backed "deep link" mailbox
  used to jump straight to a task or conversation from the notification
  bell / Home dashboard / Calendar.
- `components/task/categoryColor.test.js` — the name → color hash used for
  task-category tags.
- `lib/api.test.js` — the pure URL-building helpers in the API client
  (`resolveAvatarUrl`, `resolveAttachmentUrl`, `getOAuthUrl`).

The rest of `lib/api.js` talks to the real backend over `fetch` and isn't
unit-tested here; it's exercised end-to-end by using the app against a
running backend instead.

## Linting

ESLint config lives at the project root in `.eslintrc.json` (extends
`react-app` / `react-app/jest`, the standard Create React App rule set).
It runs automatically as part of `npm start` and `npm run build` — no
separate `npm run lint` step, since a standalone ESLint CLI invocation
doesn't resolve the same config CRA's internal build tooling does; this is
expected CRA behavior, not a missing setup.

Where a lint rule genuinely doesn't apply (most commonly
`react-hooks/exhaustive-deps`, e.g. an effect that's deliberately meant to
run once on mount), that's called out with an inline
`// eslint-disable-next-line` comment explaining why, rather than disabled
project-wide.
