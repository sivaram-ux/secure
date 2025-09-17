# Security Configuration for Deployment

## Environment Variables for Production

When deploying to Vercel, make sure to set these environment variables:

### Required Variables:
```
PEPPER=c8b52c75024ae528ce3ee6d3c6f3813b3fbfc4acc8e4f880712adb1e13764784
ALLOWED_EMAILS=nani143sivaram@gmail.com,sivaramtrail@gmail.com
NEXT_PUBLIC_APP_URL=https://your-actual-vercel-domain.vercel.app
```

### Domain Security Features:
- Pepper endpoint only accepts requests from:
  - `localhost:3000` (development)
  - Your Vercel production domain
  - Blocks all other domains

### Post-Deployment Steps:
1. Deploy to Vercel and get your production URL
2. Update `NEXT_PUBLIC_APP_URL` with your actual Vercel domain
3. Redeploy to activate domain restrictions
4. Test that pepper endpoint blocks unauthorized domains

### Security Benefits:
- **Prevents external sites** from stealing your pepper
- **Blocks CSRF attacks** from malicious websites
- **Reduces attack surface** significantly
- **Easy to manage** - just update environment variables

### For Production Only:
Remove localhost domains by updating the pepper route to only allow production domains.