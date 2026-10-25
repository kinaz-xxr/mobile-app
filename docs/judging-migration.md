# Judging compatibility with the portal

This build retains native judging. It uses the same version-2 rubric, server-persisted scores and editable submissions as the portal. Timers are disabled.

- Login is still sponsor/general PIN followed by judge-name selection; registration with name/PIN is retained. The request adapter now exchanges credentials for a real access/refresh pair, and the interceptor refreshes judge sessions.
- Scorecards read `/judges/me/scores`, save to `/judges/scores/{project_id}` and use expected revisions plus stable request IDs for retries. Checklist items and weighted totals match the web rubric. The home screen reads completion from the server so web submissions appear in native.
- Design, Completion, Theme, Innovation and Technicality are 1–5. Pitching is the sum of five checklist items (0–5). Time is 1/2/3/5 against six minutes. The 2-point, 30–60-second-over band remains provisional.
- A 409 requires loading the saved score before editing. Unsaved edits survive a transient error while this screen remains open. Successful saves remain available on other devices. The web client additionally supports tab-scoped draft recovery.
- Native logout revokes the backend judge session before clearing local credentials; an unavailable backend does not prevent local sign-out.

Deploy the additive backend migration and configure `JUDGE_PORTAL_ENABLED=true` plus its separate judge refresh secret before distributing this build. Existing year-long token links should be replaced by PIN sign-in instructions; they do not provide the new refresh-session contract.

Old native builds still use the historical rubric, which is excluded from the portal's version-2 rankings. Old writes cannot overwrite a new-rubric score. If there are existing scores for an active project/judge under the old rubric, an organizer must explicitly archive/migrate and rescore them; no numeric conversion is assumed.

Validation: full TypeScript/ESLint checks on Node 24 (zero errors; 38 existing warnings), full Prettier check, and a complete Expo web export on Node 22 using offline CI mode with two workers. The native rubric is checked against the portal rubric. Device/distributable build rehearsal remains required before event use; a web export does not validate iOS/Android device integration. No app-store submission or native-app removal is included.
