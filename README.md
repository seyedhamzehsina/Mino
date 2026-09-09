# Mino

Mino is a minimalist Chrome new-tab extension with a clock, calendar, daily todos, web search, shortcuts, and optional Google sign-in with Supabase todo sync.

## Run locally

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this project folder.
4. Open a new tab to test Mino.

## Cloud sync setup

1. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor.
2. Enable Google as an Auth provider in Supabase.
3. Add the extension redirect URL from `chrome.identity.getRedirectURL('supabase-auth')` to Supabase Auth redirect URLs.
4. Set the project URL and publishable key in [`js/config.js`](js/config.js). The key is public by design; never put a Supabase `service_role` key in an extension.

## Release checklist

1. Test a new todo, edit, completion, individual deletion, clear-all, sign-in, sign-out, and a second-device sync.
2. Update `version` in `manifest.json`.
3. Review the Store listing text and host `privacy-policy.html` on a public HTTPS URL.
4. Zip the contents of this folder (not the containing folder), excluding `.git`, `release`, and local files.
5. Upload the ZIP to the Chrome Web Store Developer Dashboard and complete its Privacy, Distribution, and Test Instructions sections.

## Data handling

Without sign-in, Mino stores settings, shortcuts, and todos only in Chrome local extension storage. With sign-in, only todos are sent to the configured Supabase project under the authenticated user's account. See [`privacy-policy.html`](privacy-policy.html) for the public policy text.
