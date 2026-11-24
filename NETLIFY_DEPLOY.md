# Deploying Hospica on Netlify (alternative to Vercel)

## 1. Connect the repo
1. Go to https://app.netlify.com → **Add new site → Import an existing project**
2. Choose **GitHub** and authorize → select `Micjeal/clinic-mvp`
3. Netlify auto-detects Next.js; `netlify.toml` in the repo root sets build/publish/plugin

## 2. Environment variables (Site settings → Environment variables)
Copy the same values you use on Vercel:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
NEXT_PUBLIC_SITE_URL=https://your-site.netlify.app
SMS_PROVIDER            (optional — africastalking or twilio)
SMS_API_KEY / SMS_USERNAME / SMS_SENDER_ID   (if Africa's Talking)
# or SMS_ACCOUNT_SID / SMS_AUTH_TOKEN / SMS_SENDER_ID  (if Twilio)
```

## 3. Deploy
Click **Deploy site**. First build takes a few minutes.

## Notes
- `netlify.toml` uses `@netlify/plugin-nextjs` for SSR/ISR support.
- Supabase Auth redirect URLs: add `https://your-site.netlify.app/auth/callback` (and `http://localhost:3000/auth/callback` for local) in Supabase → Authentication → URL Configuration → Redirect URLs.
- Custom domain: Site settings → Domain management → add your domain, update DNS as instructed.
