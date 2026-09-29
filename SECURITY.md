# SECURITY POLICY: DIMAAG KA FALOODA FORTRESS EDITION 3.0

## 1. Overview & Threat Model
Dimaag Ka Falooda: Beat Run operates under a zero-trust model. All client-side runtime environments (browsers, webviews, and headless scripts) are treated as untrusted. State verification, rate limiting, and write operations are strictly partitioned at serverless and backend boundaries.

### Threat Vectors Addressed:
1. Direct Database Injection:
   - Direct INSERT and UPDATE permissions on the public leaderboard table (`blind_matrix_leaderboard`) are revoked from the `anon` PostgreSQL role.
   - Writes are mediated exclusively through trusted server environments (`/api/submit-score` and Node `server.js`) using the privileged `service_role` key.
2. In-Memory Score Tampering & Autoclickers:
   - Client taps are recorded in a high-resolution, sequential action chain (`actionChain`).
   - Physical human motor reflex jitter is verified: consecutive tap intervals under 35 milliseconds or variance under 0.5 milliseconds trigger automated fraud rejection.
   - Proof-of-Play SHA-256 replay hashes tie the player handle, level, score, mode, device type, and action chain together.
3. WebSocket Denial-of-Service & Frame Hijacking:
   - Mandatory RFC 6455 client frame masking. Unmasked client frames trigger immediate socket termination.
   - Strict Origin header verification rejecting unauthorized third-party origins.
   - 16KB payload cap and per-connection token bucket rate limiting (30 tokens, 10 tokens/sec refill).
   - Rotating security event ring buffer (last 500 security events) accessible only via admin bearer token.
4. Cross-Device Matchmaking Inequity:
   - Hardware classification categorizes clients into phone, tablet, or laptop tiers.
   - Hard device gate prevents high-precision mouse and keyboard devices from entering mobile touch lobbies.

## 2. Row Level Security (RLS) Posture
The PostgreSQL schema enforces:
- `ALTER TABLE public.blind_matrix_leaderboard ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE public.blind_matrix_leaderboard FORCE ROW LEVEL SECURITY;`
- Read access granted to `anon` and `authenticated` roles for top leaderboard listings.
- Write access (`INSERT`, `UPDATE`, `DELETE`) exclusively granted to `service_role`.

## 3. Reporting Vulnerabilities
If you discover a security vulnerability in this application:
1. Do not open public GitHub issues.
2. Submit a detailed report with reproduction steps to the security maintainer.
3. Reports are reviewed and patched within 48 hours of verification.
