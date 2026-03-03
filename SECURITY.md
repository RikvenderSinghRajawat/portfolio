# Website Security Notes

## Implemented in this project

1. Security headers added across main pages (`index`, `about`, `experience`, `education`, `contact`, `ctf`, `download`):
- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` with restricted device APIs

2. Inline script removal:
- Removed inline script from `index.html`
- Removed inline CTF accordion script from `ctf.html`
- Logic moved into `script.js` so `script-src 'self'` can be used

3. Tokenized resume download flow:
- Direct resume filename links removed from public pages
- Resume links now use `/download#resume-secure-rsr`
- `script.js` requires a short-lived session token set only when user clicks from allowed pages
- `/download` denies direct/broken token access

4. URL and link hardening:
- Suspicious query parameters (`id`, `file`, `cmd`, `exec`, `path`, etc.) are stripped client-side
- `javascript:` links are disabled client-side

5. Social profile exposure hardening:
- Home page social buttons removed
- Contact page social links hidden behind a reveal button

## Important limitation

This site is static HTML/CSS/JS. True prevention of `IDOR`, command injection, and authorization bypass must be enforced on the server side.
Client-side checks improve friction and reduce accidental exposure, but cannot replace backend security controls.

## Required backend controls for real protection

1. Enforce object-level authorization for every resource request.
2. Never map user-provided IDs directly to records without ownership checks.
3. Never pass user input into shell/system commands.
4. Use strict allow-lists for file access and route access.
5. Keep sensitive file paths hidden behind server-side token validation and expiry.

## Example server-side guardrails (Apache)

```apache
RewriteEngine On

# Block common suspicious parameters
RewriteCond %{QUERY_STRING} (^|&)(id|file|path|cmd|command|exec|shell)= [NC]
RewriteRule ^ - [F,L]

# Deny direct resume path; allow only broker page/token flow
RewriteRule ^Rikvender-resume-offsec\.pdf$ - [F,L,NC]

Header always set X-Frame-Options "DENY"
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
```

## Example server-side guardrails (Nginx)

```nginx
if ($query_string ~* "(^|&)(id|file|path|cmd|command|exec|shell)=") {
    return 403;
}

location = /Rikvender-resume-offsec.pdf {
    return 403;
}

add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```
