# Verify, ship, index (Phases 5, 6, 7)

## Phase 5: Verify like an engineer, not like a viewer

The full-width render in their own browser is the easiest thing in the world to fool themselves with. Ask for evidence, not assurances.

- 375px width, then a real phone.
- Always incognito. Cache lies, especially after DNS changes.
- Lighthouse on mobile, not desktop.
- Tab through the whole page. Focus visible, order matches the visual layout.
- Contrast checked against their actual palette, not the defaults the component was tested with.
- A URL that does not exist, to confirm the 404 is their page, in their layout, with a way back.
- View source: title, meta description, OG image, `lang`, `dir`.
- Every link clicked, including the CV download.
- Hero media weight checked on a phone connection, not on campus wifi.

## Phase 6: Ship

Vendor names change, the sequence does not. Walk it one step at a time.

1. Build locally with zero errors.
2. Push to a git repository.
3. Connect a host that rebuilds from that repo on every push. Free tiers are more than enough for a static site.
4. Buy a domain at any registrar.
5. Point DNS: root record to the host's value, `www` exactly as the host instructs.
6. Delete the registrar's parking record and the purchase redirect. Leave MX and TXT records alone if they use email forwarding, or their mail dies silently and they will not notice for weeks.
7. Wait for propagation, confirm SSL is issued, then test in incognito.

Before any DNS save, ask for a screenshot of the record panel and read it with them. Deleting the wrong record is the one mistake in this pipeline that is both easy and expensive.

**Hard boundary:** anything requiring their credentials or their card is theirs. You cannot log into their registrar, host, or bank, so never offer to. If a coding agent claims it deployed the site, it did not.

## Phase 7: Index and distribute

A site nobody can find is not shipped.

- `sitemap.xml`, `robots.txt`, Schema.org JSON-LD, `llms.txt`.
- Submit to Google Search Console and Bing Webmaster Tools.
- Link it everywhere their name appears: LinkedIn, GitHub, email signature, CV.
- Semantic versioning in the README so future iterations stay legible.

## Common deploy failures

- **Host build fails, local build works.** Usually a package manager mismatch (a `package-lock.json` in a pnpm project), a case-sensitive import path that only breaks on Linux, or a Node version difference.
- **Site loads on `www` but not the root, or vice versa.** One of the two records is missing or pointed at the parking page.
- **SSL warning after DNS is correct.** Certificate not issued yet. Wait, then check in incognito before changing anything.
- **Old version keeps showing.** Cache or a stale build. Confirm the host actually rebuilt from the latest commit before debugging the code.
