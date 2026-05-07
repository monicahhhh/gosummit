# GO Summit Railway Backend

This service stores `/attend` registrations in PostgreSQL for global access.

## Railway Setup

1. Create a new Railway project from this `railway-backend` folder.
2. Add a PostgreSQL plugin in Railway.
3. Add environment variables:
   - `DATABASE_URL` (from Railway Postgres)
   - `CORS_ORIGINS` = `https://gosummit.ai,https://www.gosummit.ai`
   - `ADMIN_KEY` = random long string (for secure list query)
4. Deploy and copy your public service URL (example: `https://gosummit-api.up.railway.app`).

## Endpoints

- `GET /health`
- `POST /api/register`
- `GET /api/registrations?key=YOUR_ADMIN_KEY&limit=100`

### Request Body

```json
{
  "city": "Shenzhen",
  "name": "Jane",
  "title": "Founder",
  "company": "Acme AI",
  "email": "jane@acme.ai",
  "companyType": "Startup"
}
```

## Configure Frontend

In `attend/index.html`, set backend URL:

```html
<script>
  window.GOSUMMIT_API_BASE = "https://your-service.up.railway.app";
</script>
```

Add this before the attend page script block.
