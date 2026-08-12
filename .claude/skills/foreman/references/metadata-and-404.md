# Metadata, indexing, and the 404

These are the parts nobody builds until reminded, and they are most of what decides whether the site is found, shared well, and read correctly by machines.

Paste-ready starting points live in `assets/`: `head-metadata.html`, `404.html`, `robots.txt`, `sitemap.xml`, `llms.txt`.

## The head block

Every value below is a decision, not boilerplate. Fill them with them, do not let the coding agent guess.

- **Title.** Name, then role or the one thing they do. Under about 60 characters, because search results truncate. This is also the browser tab and the bookmark label.
- **Description.** About 155 characters, written for a human deciding whether to click. Not a keyword list.
- **Canonical URL.** Pick one host, `www` or bare, and be consistent everywhere including the sitemap.
- **`lang` and `dir`.** Set them. If the site is bilingual, each version declares its own, and `dir="rtl"` is a layout change, not an attribute.
- **Theme color and favicons.** A 32px favicon, a 180px Apple touch icon, and an SVG mark. A default globe icon in a bookmark bar is a tell.
- **Open Graph and Twitter cards.** Title, description, image, URL, type, site name, and `summary_large_image`.

## The OG image

Whenever someone shares the link in WhatsApp, Slack, LinkedIn, or a group chat, this image is the site. Most people never make one and get a blank grey box.

- 1200 by 630, under about 1 MB.
- Legible at thumbnail size. Their name and one line, set in the site's own display face and palette.
- Real text, not decoration.
- Absolute URL in the tag, not a relative path, or most scrapers will not resolve it.
- Test it before shipping. Sharing debuggers cache aggressively, so check once and correct once.

## Structured data

A Schema.org `Person` (or `Organization`) JSON-LD block tells search engines and models what entity this site is about: name, role, employer or school, same-as links to GitHub, LinkedIn, Scholar. Cheap to add, and it is the difference between being a page and being an entity.

## Crawl and read files

- `robots.txt`: allow everything on a personal site, and point to the sitemap.
- `sitemap.xml`: every real URL with a last-modified date. Regenerate it on build if the stack can.
- `llms.txt`: a short plain-text summary of who they are and what each page contains, for models reading the site. New convention, cheap, increasingly worth having.
- Submit the sitemap to Google Search Console and Bing Webmaster Tools. Verification is a DNS TXT record or a file upload, and it is theirs to do.

## The 404

A custom 404 is the cheapest signal of care on the whole site, and almost every generated site ships the host's default.

Requirements:

- Same layout, nav, tokens, and type as the rest of the site. It should be unmistakably the same place.
- Plain language about what happened. No apology, no error code as the headline.
- One clear way out: home, plus the site's primary action. A dead end with a joke on it is still a dead end.
- Returns a real 404 status, not a 200. Some hosts serve a 200 for SPA fallbacks, which quietly tells crawlers the page exists.
- No auto-redirect. Let the person choose.
- Test it by visiting a URL that does not exist, in incognito, after deploy.
