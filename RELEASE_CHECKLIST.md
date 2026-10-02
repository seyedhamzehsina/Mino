# Mino — Official Chrome Web Store release checklist

Last updated: 2026-10-02

Use this document in order. Items marked **[You]** need access, payment, or a decision from you. Items marked **[Me]** are implementation and packaging work I can do in the project.

## Current readiness snapshot

- [x] MVP extension is working on the current `main` branch.
- [x] Game UI is hidden for the MVP; its code is retained for a later release.
- [x] Privacy policy is public: https://mino.seyedhamzehsina.chatgpt.site/privacy.html
- [x] Store icons and promotional artwork exist in `store-assets/`.
- [x] Store listing draft exists in `STORE_LISTING.md`.
- [ ] Rebuild the release ZIP after the most recent UI polish, before uploading it.
- [ ] Capture new Store screenshots from the final build. Existing screenshots are from an older interface.
- [ ] Complete Chrome Web Store developer registration.

## 1. Activate the Chrome Web Store developer account

- [ ] **[You]** On the Chrome Web Store Developer Dashboard, accept the agreement and click **Pay registration fee**.
- [ ] **[You]** Complete Google's one-time $5 registration payment.
- [ ] **[You]** Return to the dashboard and confirm that **Add new item** is available.

**Stop here until the payment is complete.** The next step creates Mino's permanent Chrome Web Store extension ID.

## 2. Prepare the exact package to upload

- [ ] **[Me]** Rebuild `release/mino-1.2.0.zip` from the current final source code.
- [ ] **[Me]** Verify the ZIP contains `manifest.json` at its root (not inside an extra folder), has version `1.2.0`, and excludes development-only files.
- [ ] **[You]** Upload that ZIP with **Add new item** in the dashboard.
- [ ] **[You]** Do not submit for public review yet; first copy the extension ID created by the upload.

## 3. Enable Google sign-in for the Store build

- [ ] **[You]** Copy the new Store extension ID from its dashboard page or URL.
- [ ] **[You]** In Supabase → **Authentication** → **URL Configuration** → **Redirect URLs**, add:

  `https://YOUR_STORE_EXTENSION_ID.chromiumapp.org/supabase-auth`

- [ ] **[You]** Keep the current unpacked-extension redirect while local testing still needs it.
- [ ] **[You]** In Google Cloud OAuth settings, keep this Supabase callback authorized:

  `https://pxarsfdfmqyvnvbedceq.supabase.co/auth/v1/callback`

  Do **not** replace it with the `chromiumapp.org` URL; Supabase handles the final redirect to the extension.

- [ ] **[You]** Install the uploaded draft from the Chrome Web Store dashboard in a separate Chrome profile or another computer and test Google sign-in.

## 4. Run the release smoke test

- [ ] **[You]** Google sign-in succeeds and the user menu opens from the profile badge.
- [ ] **[You]** Add, complete, delete, clear, and restore a task; then reload Chrome and confirm the expected state remains.
- [ ] **[You]** Test the extension on another Chrome profile/device with the same account and confirm sync behavior.
- [ ] **[You]** Click a shortcut: it opens in the current tab. Ctrl/Cmd-click retains the normal new-tab behavior.
- [ ] **[You]** Check light and dark mode, calendar/todo animations, settings animation, and the centered add-task icon.
- [ ] **[You]** Open Support from Settings, confirm the wallet text and copy action, and verify it clearly says **Ethereum (ERC-20)**.
- [ ] **[You]** Sign out and verify the guest experience still works cleanly.

Record any issue here before submitting. Do not change the manifest version during this test unless we make a new package; after an item is uploaded, every later Store update must use a higher version number.

## 5. Create final Store assets

- [ ] **[You]** Capture 3–5 fresh, unedited screenshots of the final installed extension at 1280×800 or larger.
- [ ] **[You]** Include: main workspace, Todo/Calendar open, Settings/Support, and one dark-mode view.
- [ ] **[You]** Use the existing assets in `store-assets/` for the 128px icon, 440×280 small promo tile, and 1400×560 marquee promo image.
- [ ] **[You]** Avoid screenshots containing private tasks, email addresses, or browser/profile data.

## 6. Complete the Store listing and privacy form

- [ ] **[You]** Paste the title, short description, full description, category, and support details from `STORE_LISTING.md`.
- [ ] **[You]** Set the privacy-policy URL to:

  `https://mino.seyedhamzehsina.chatgpt.site/privacy.html`

- [ ] **[You]** In Privacy practices, accurately disclose that Mino handles Google account identity for sign-in and user-created productivity data (tasks, completion state, dates, shortcut URLs, and preferences) for sync and core functionality.
- [ ] **[You]** Confirm the data is not sold, not used for advertising, and not transferred for unrelated purposes.
- [ ] **[You]** Fill in all required single-purpose, certification, and permission explanations truthfully according to the actual build.

## 7. Submit safely

- [ ] **[You]** Start with the narrowest available test audience / unlisted or staged publishing option in the dashboard.
- [ ] **[You]** Add reviewer test instructions: “Install Mino, open a new tab, and use Google sign-in from the profile badge. Core task functionality also works without signing in.”
- [ ] **[You]** Review every listing preview, then submit for review.
- [ ] **[You]** Keep publication deferred if you want to approve the exact public launch moment yourself.

## 8. After approval

- [ ] **[You]** Install the public Store version on a clean Chrome profile and repeat the sign-in smoke test.
- [ ] **[You]** Publish the Store listing when ready.
- [ ] **[Me]** For future changes, bump `manifest.json` version, rebuild a new ZIP, and prepare release notes before uploading an update.

## What to do next

Your next action is **Step 1: click “Pay registration fee” and complete the $5 developer registration**. Once it is complete, tell me and I will rebuild and validate the final upload ZIP for Step 2.
