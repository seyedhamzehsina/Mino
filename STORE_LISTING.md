# Chrome Web Store listing — Mino

This file is the ready-to-paste source for the Chrome Web Store Developer Dashboard. Review the bracketed values before submission.

## Product details

- **Name:** Mino — Minimal New Tab
- **Category:** Productivity
- **Primary language:** English
- **Short description:** A calm, customizable new tab with a clock, daily todos, calendar, shortcuts, and optional private sync.
- **Official URL:** https://github.com/seyedhamzehsina/Mino
- **Support URL:** https://github.com/seyedhamzehsina/Mino/issues
- **Privacy policy URL:** `[Publish privacy-policy.html over HTTPS, then paste its public URL here.]`

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
- Optionally sign in with Google to synchronize todos through the configured Supabase project.

Mino is designed to be quiet, readable, and personal. It works fully locally without an account; sign-in is only needed for optional todo sync.

## Privacy practices submission

Use the actual behavior of version 1.1.1 when completing the Privacy practices tab.

| Data type | Handled? | Purpose | Stored/transmitted |
| --- | --- | --- | --- |
| Personally identifiable information | Yes, only after optional sign-in: email address, account identifier, display name | Authenticate the account and show signed-in state | Received through Supabase authentication; retained locally for the session |
| User-generated content | Yes: todo text, completion state, date, and update time | Provide the todo feature and optional multi-device sync | Stored in Chrome extension storage; sent to Supabase only when optional sync is enabled |
| Website URLs | Yes: user-entered shortcut URLs | Open user-created shortcuts and request their favicons | Stored locally; favicon request is sent to Google only when a shortcut is displayed |
| Search queries | Yes, only when typed into search | Show search suggestions and perform the user-requested search | Suggestions are requested from Google; submitted searches open Google Search |

For the dashboard declarations, state that Mino does **not** sell user data, use it for advertising, transfer it for unrelated purposes, or use it to determine creditworthiness or for lending purposes.

## Permission justification

- `storage`: saves todos, settings, shortcut details, and the optional account session in Chrome extension storage.
- `identity`: opens the user-initiated Google sign-in flow for optional todo synchronization.
- `https://suggestqueries.google.com/*`: retrieves search suggestions only while the user types in Mino’s search field.
- `https://*.supabase.co/*`: authenticates the optional account and synchronizes the user’s todos with the configured Supabase project.

## Graphic assets

- Store icon: `assets/icons/icon-128.png` (128×128).
- Small promo tile: `store-assets/mino-promo-small-v2.png` (440×280).
- Marquee promo tile: `store-assets/mino-marquee-1400x560.png` (1400×560).
- Real Store screenshots, prepared from the current extension interface: `store-assets/screenshots/mino-workspace-dark-1280x800.png`, `store-assets/screenshots/mino-workspace-light-1280x800.png`, and `store-assets/screenshots/mino-settings-1280x800.png`.
- The source screenshots are retained in `store-assets/screenshots/` for reference. Do not use generated marketing images as Store screenshots.

## Final submission checklist

- [ ] Replace the Privacy policy URL with a public HTTPS URL.
- [ ] Verify the Google OAuth redirect URL in Supabase and Google Cloud for the production extension ID.
- [ ] Capture current, unedited screenshots from Chrome.
- [ ] Upload the ZIP containing the extension contents, not the project folder.
- [ ] Complete the Privacy practices and Single purpose declarations to match the table above.
- [ ] Submit first to the intended test audience, then review and publish.
