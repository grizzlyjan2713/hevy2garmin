# Optional strength-training calorie estimate

The default remains `keytel`. Set `user_profile.calorie_method` to `strength`
(or select it on the Next.js Settings page) to opt into the experimental estimate.
Both Python (including the scheduled GitHub workflow) and TypeScript implement it.
Unknown/missing methods retain Keytel. Saving settings itself never starts a sync.

## Reference session

112 kg; born 1980; workout year 2026; duration 5485 seconds (91:25);
active 1761 seconds (29:21); recovery 3724 seconds (62:04); mean HR 89 bpm.

| Estimate | Gross kcal |
| --- | ---: |
| Previously reported Garmin value | 770 |
| Current Keytel, assuming VO2max 45 and constant 89 bpm | 774 |
| Experimental phase-weighted estimate | 528 |

Keytel uses `(-95.7735 + 0.634*HR + 0.404*VO2max + 0.394*kg + 0.271*age) / 4.184`
kcal/min, with age = workout year minus birth year. It weights samples equally,
regardless of sample timestamps, clips negative per-sample estimates and uses
90 bpm without HR. Sex is not used. The old settings explanation displayed a
different equation; it now documents the implementation faithfully.
The original HR series and actual VO2max are unavailable; 774 does not prove
that the earlier 770 was erroneous. No live Garmin result has been reproduced.

The new estimate uses `(6*active_minutes + 1.5*recovery_minutes)*3.5*kg/200`.
It is 31.4% below the reported 770. About 179 kcal of the 528 are the conventional
1-MET resting baseline; about 349 are above that baseline. The uploaded value is
gross, not the above-rest value. No EPOC or HR multiplier is added.

The [2024 Compendium](https://pacompendium.com/wp-content/uploads/2024/02/1_2024-adult-compendium_1_2024.pdf)
lists 6 MET for vigorous resistance training and 3.5 MET for multiple-exercise
resistance training. These are activity classifications, not validation of this
phase algorithm. Using 6 MET for active phases and 1.5 MET for recovery is an
explicit engineering assumption. It is more responsive to long pauses but is
not established as more accurate for this individual. MET estimates also scale
linearly with body weight and cannot capture individual physiology.

FIT generation uses the existing set timeline: logged set durations where present,
otherwise configured working/warmup durations, scaled with the existing 0.3–2.0
bounds. Active intervals are clipped to the session; all remaining time is recovery.
Thus 528 is the comparison with the supplied phase durations, not a promise that
an unseen Hevy workout will reproduce exactly that phase split. Timeline placement,
exercise mappings and HR records are unchanged. The original timeline itself may
extend beyond the session at extreme scale bounds; this change only bounds the
calorie calculation. It does not repair or alter existing timing behavior.

## Safety and packaging

No production deploy, push, workflow dispatch, API sync or activity rewrite was
performed. Existing watch activity calories remain governed by merge/describe
behavior. A manual resync/replace may regenerate a FIT with the selected method;
do not use it to test against existing activities. Existing deduplication, upload,
merge and recovery code is unchanged.

The web app now consumes the local TypeScript package rather than the published
0.14 package, which would otherwise ignore the new option. Build it before web
installation: from the repository root run `npm ci --prefix typescript`, then
`npm run build --prefix typescript`, then `npm ci --prefix web`. `web/.npmrc`
packs the local dependency instead of symlinking its separate Garmin-auth types.
CI and the Vercel install command include the prerequisite build. Vercel must have
access to files outside the web root. No production hosting configuration was changed
remotely. Deployment remains a separate review step.

## Validation performed locally

- TypeScript: build passed; all 413 tests passed (35 files).
- Web: all 749 tests passed; 5 existing tests skipped. Typecheck and ESLint passed.
- Python focused FIT/sync/merge/pending/config suite: 130 passed, one blocked by
  the default home-directory database location; that test passed separately with
  an isolated temporary SQLite database. The 17 calorie/config tests passed again
  after adding the explicit Keytel config default. Ruff check and formatting passed.
- Web production build succeeded with `next build --webpack`, including all pages.
  Default Turbopack builds failed on this machine because process port binding is
  denied, including after requesting expanded execution permissions. Default
  Turbopack CI/Vercel validation is still required before deployment.
- No live end-to-end Garmin/Hevy sync was run. Sync preservation is supported by
  offline regression tests, not by an upload against the production account.
