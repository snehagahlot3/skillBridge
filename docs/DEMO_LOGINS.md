# Demo Logins

Demo accounts for local testing (seeded by `npm run db:seed`). These are no longer shown on the sign in page — use the credentials below manually.

| Role   | Email               | Password    |
| ------ | ------------------- | ----------- |
| User   | priya@demo.com      | demo12345   |
| Owner  | rajesh@demo.com     | demo12345   |
| Mentor | mentor@demo.com     | mentor12345 |
| Admin  | admin@demo.com      | admin12345  |

## Notes

- **User** — regular account, lands on `/dashboard`
- **Owner** — posts jobs and hires, lands on `/dashboard`
- **Mentor** — lands on `/mentor`
- **Admin** — lands on `/admin`

Seed the database first:

```bash
npm run db:seed
```

Then start the API and web app:

```bash
npm run dev:api
npm run dev:web
```
