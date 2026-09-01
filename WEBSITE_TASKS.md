# HomeTutor AI — Website Task List

Running list of updates to the public site (hometutorai.io). Kept local (like STATUS.md).

## ✅ Done
- [x] Student guide page **"How to get the most out of me"** — `/guide` — created 2026-08-31
- [x] Made `/guide` **trilingual** (EN/HE/AR toggle); Hebrew reviewed by owner, English synced

## 🔜 To do — the new guide
- [ ] **Arabic wording review** by a fluent speaker (AR was machine-drafted, mirrors the reviewed HE/EN)
- [ ] **Link `/guide` from the homepage** (`public/home.html`) — nav and/or footer
- [ ] **Link `/guide` from the consent page** footer (all 3 languages)
- [ ] **Link `/guide` from the "tutor is active" enrolment email** — the ideal moment (parent is about to start their child)

## 🔜 To do — carried over from earlier
- [ ] **Holding-page copy:** make the "knows your child's preferences" claim fully true only once long-term memory is rolled out (memory guardrail 4 — currently gated off)
- [ ] **Privacy policy:** translate to HE/AR + qualified-counsel review before any wider launch (currently EN starter)
- [ ] **Consent form:** Arabic wording review by a fluent speaker (was pending)
- [ ] **Consent/privacy:** the learning-notes disclosure is live — re-consent or notify families who signed up *before* it, before enabling memory for them

## Notes
- Site structure: static holding page at `/` (`public/home.html`, trilingual EN/HE/AR), plus Next.js pages `/consent` (trilingual), `/privacy` (EN), `/guide` (EN, new).
- Deploys automatically on push to `main` via the Vercel GitHub App.
