# Chrome Web Store listing — Mino

This file is the ready-to-paste source for the Chrome Web Store Developer Dashboard. Review the bracketed values before submission.

## Product details

- **Name:** Mino — Minimal New Tab
- **Category:** Productivity
- **Primary language:** English
- **Short description:** A calm, customizable new tab with a clock, daily todos, calendar, shortcuts, and private workspace sync.
- **Official URL:** https://github.com/seyedhamzehsina/Mino
- **Support URL:** https://github.com/seyedhamzehsina/Mino/issues
- **Privacy policy URL:** `https://mino-new-tab.seyedhamzehsina.chatgpt.site/privacy.html`
  - Before submitting to Chrome Web Store, make this URL publicly reachable. The current Sites deployment is owner-only and Chrome reviewers must be able to open it without signing in.

## Detailed description

Mino turns every new tab into a calm, focused workspace.

Keep the essentials visible without opening another app: a clear clock and greeting, a daily todo list, a clickable calendar, web search, and your most-used shortcuts. Calendar and todo panels stay out of the way until you choose to open them.

Features:

- Add, edit, complete, and remove tasks for any day.
- Open a date in the calendar to view that day’s tasks.
- Use Gregorian or Persian calendar display.
- Search the web or open a URL directly from the new-tab page.
- Add and remove shortcuts for the sites you use most.
- Personalize the accent color, light or dark mode, liquid-glass appearance, clock settings, and background.
- Sign in with Google to create a private workspace and synchronize todos, shortcuts, clock preferences, and appearance settings through the configured Supabase project.

Mino is designed to be quiet, readable, and personal. Setup uses Google sign-in to create a private workspace that stays available across devices.

## Privacy practices submission

Use the actual behavior of version 1.2.0 when completing the Privacy practices tab.

| Data type | Handled? | Purpose | Stored/transmitted |
| --- | --- | --- | --- |
| Personally identifiable information | Yes: verified Google email address, account identifier, display name | Authenticate the account and show signed-in state | Received through Supabase authentication; retained locally for the session |
| User-generated content | Yes: todo text, completion state, date, shortcuts, clock preferences, and appearance settings | Provide the workspace and multi-device sync | Stored in Chrome extension storage and synchronized to Supabase for the authenticated account |
| Website URLs | Yes: user-entered shortcut URLs | Open user-created shortcuts and request their favicons | Stored locally; favicon request is sent to Google only when a shortcut is displayed |
| Search queries | Yes, only when typed into search | Show search suggestions and perform the user-requested search | Suggestions are requested from Google; submitted searches open Google Search |

For the dashboard declarations, state that Mino does **not** sell user data, use it for advertising, transfer it for unrelated purposes, or use it to determine creditworthiness or for lending purposes.

## Permission justification

- `storage`: saves todos, settings, shortcut details, and the account session in Chrome extension storage.
- `identity`: opens the user-initiated Google sign-in flow for workspace authentication.
- `https://suggestqueries.google.com/*`: retrieves search suggestions only while the user types in Mino’s search field.
- `https://*.supabase.co/*`: authenticates the user with Google and synchronizes their private workspace with the configured Supabase project.

## Graphic assets

- Store icon: `assets/icons/icon-128.png` (128×128).
- Small promo tile: `store-assets/mino-promo-small-v2.png` (440×280).
- Marquee promo tile: `store-assets/mino-marquee-1400x560.png` (1400×560).
- Real Store screenshots, prepared from the current extension interface: `store-assets/screenshots/mino-workspace-dark-1280x800.png`, `store-assets/screenshots/mino-workspace-light-1280x800.png`, and `store-assets/screenshots/mino-settings-1280x800.png`.
- The source screenshots are retained in `store-assets/screenshots/` for reference. Do not use generated marketing images as Store screenshots.

## Final submission checklist

- [ ] Make the deployed Privacy policy URL publicly reachable for Chrome reviewers.
- [ ] Verify the Google OAuth redirect URL in Supabase and Google Cloud for the production extension ID.
- [ ] Capture current, unedited screenshots from Chrome after the final extension reload.
- [x] Create the runtime-only ZIP for version 1.2.0: `release/mino-1.2.0.zip`.
- [ ] Upload that ZIP to the Chrome Web Store Developer Dashboard.
- [ ] Complete the Privacy practices and Single purpose declarations to match the table above.
- [ ] Submit first to the intended test audience, then review and publish.
