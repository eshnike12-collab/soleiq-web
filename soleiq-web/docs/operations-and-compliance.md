# Operations, privacy, and compliance expectations

## Backups and disaster recovery

- Enable Supabase point-in-time recovery for production and retain backups in
  accordance with each hospital contract and retention policy.
- Test database restore and private-object recovery at least quarterly.
- Record recovery-point and recovery-time objectives per deployment.
- Keep schema migrations, worker versions, model versions, prompt versions, and
  safety-rule versions deployable from source control.
- Treat audit and outbox tables as part of the recovery set.
- Do not restore production PHI into developer environments.

## Retention and deletion

`organizations.retention_policy` is the configuration source, but automated
enforcement remains a deployment responsibility. A deletion workflow must:

1. verify legal/clinical retention holds;
2. identify all organization-scoped database rows and private objects;
3. preserve required audit evidence without retaining unnecessary clinical
   payloads;
4. use a reviewed, idempotent job;
5. produce a completion record without logging PHI.

Legacy visits/scans must remain until backfill reconciliation and hospital
retention approval are complete.

## Security operations

- Store service-role and AI credentials only in a managed server secret store.
- Rotate credentials and invitation/token signing assumptions through a
  documented incident process.
- Configure Supabase Auth rate limits, email verification, password policy, and
  breached-password controls. The app also applies a local AI request limiter;
  production needs a shared Redis/edge limiter.
- Enable MFA for staff before production and require it for PHI-capable admins.
- Integrate hospital SSO by mapping verified identity-provider assertions to a
  pre-created invitation/membership, never to browser-supplied role metadata.
- Forward structured request-ID logs and audit events to the approved monitoring
  system. Do not log photos, prompts with PHI, intake payloads, tokens, or signed
  URLs.
- Alert on urgent outbox events, repeated authorization failures, membership
  changes, break-glass use, and worker failures.

## Vendor and organizational requirements

These technical controls do not by themselves make a deployment HIPAA
compliant. Production readiness also requires, at minimum:

- executed BAAs with hosting, database, email, observability, AI, and support
  vendors that create, receive, maintain, or transmit PHI;
- a documented risk analysis and risk-management program;
- workforce training and access reviews;
- incident response and breach-notification procedures;
- data-use, minimum-necessary, retention, and patient-rights procedures;
- validated model governance, clinical safety review, and change control;
- jurisdiction-specific privacy and medical-device analysis.

The default Anthropic adapter is not enabled by architecture alone. A deployment
must use an approved vendor arrangement and configuration before sending PHI.

## Known deployment work

- Provision the managed outbox consumer/queue and notification provider.
- Add a shared distributed rate limiter.
- Configure MFA and hospital SSO.
- Connect audit export to the hospital SIEM.
- Define and test break-glass access before implementing it.
- Implement automated retention/deletion jobs after policy approval.
- Run local Supabase migration and RLS tests in CI with Docker.

