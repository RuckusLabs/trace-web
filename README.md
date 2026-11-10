# Trace marketing site

Static HTML, CSS, and JavaScript for https://ruckuslabs.co/trace/. No build step, tracking scripts, or account required.

## Local preview

Serve the repository under `/trace/` so asset paths and canonical URLs match production. For example, create a temporary server root with a `trace` symlink to this checkout, then run `python3 -m http.server 18765 --bind 127.0.0.1 --directory <server-root>`. Confirm that the preview serves this checkout; the parent website repository may have its own Trace copy and server.

## Homepage

The production headline (“Design and code. Aligned.”), floating navigation, light styling, and layered 3D footer icon are retained. `workspace.css` and `workspace.js` provide a compact comparison demo with one reference, one implementation, dragging, Align Example, and Reset. Inversion and 50% image blending are enabled by default. The design-studio sample in `images/demo/field-reference.svg` and `field-build.svg` is fictional, code-authored artwork with deliberate differences in heading position, button width, and project spacing.

Keyboard shortcuts work while the demo is focused: arrows/Shift-arrows move, Command/Control-I and -L toggle comparison modes, -Z/Shift-Z undo/redo, and +/-/0/F control scale. Paste/drop replaces the reference. Data remains in memory for the session; reset clears images/history and revokes object URLs. Browser-reserved shortcuts may take precedence. The demo cannot float above or click through other apps.

The shortcut dialog shares the homepage’s card, keycap, and icon styling. Eight everyday shortcuts are visible on the page; the expanded reference contains 22 total. FAQ disclosure and demo alignment animations respect reduced-motion preferences. The footer icon has a 24px solid body and stops animation when settled.

## Guides and screenshots

The Figma comparison and spacing/alignment guides cover capture/paste, reference scale, positioning, inversion, and manual implementation review. Guide screenshots were captured from Trace repository version 1.0.1 targeting macOS 26, using a local sample interface. The inverted comparison is assembled from authentic normal/inverted screenshots with an intentional heading displacement. It is illustrative, not a recording of automatic difference detection. Captions identify the examples; no private desktop content appears in these assets. The homepage uses its authored sample instead of these screenshots.

## Validation

Run `python3 scripts/check-seo.py` (no network or extra dependencies). It checks HTML structure, one H1 per page, unique titles/descriptions/canonicals, social metadata, local links and fragments, image attributes, JSON-LD references, breadcrumbs, sitemap coverage, and homepage reachability across six pages. It reports the software-app rich-result limitation separately.

JavaScript syntax and whitespace checks pass. Browser checks covered the production headline/navigation, no horizontal overflow at 360/390/768/1440px, sample alignment, keyboard movement, and the shortcut dialog’s shared keycaps, centered icon column, scroll behavior, close button, and Escape dismissal. The new guide and updated document pages were checked at 360/1440px. Local metadata validation does not establish Google indexing, rich-result eligibility, or field Core Web Vitals.

## Before publishing

- Verify compatibility, price, and features against the distributed Mac App Store app. This site targets the repository’s macOS 26+ release. The listing reviewed October 8, 2026 still listed macOS 14+; subsequent public listing verification was unavailable. Do not launch these compatibility claims ahead of the corresponding app release.
- Verify capture/paste, inversion/translucence, Actual Size, tabs/history, and lock/click-through behavior in the distributed app. The app source has not been changed by this website work.
- The app schema intentionally omits ratings/reviews. Valid descriptive JSON-LD alone does not qualify for Google’s software-app rich result, which requires a genuine rating or review. Do not invent ratings or copy third-party aggregates to satisfy this requirement. Validate the deployed URL with the Rich Results Test and URL Inspection. See https://developers.google.com/search/docs/appearance/structured-data/software-app.
- Inspect the domain-root `robots.txt`, response headers, and parent sitemap. A `/trace/robots.txt` would not control the domain. Public crawler settings remain unverified. Submit `https://ruckuslabs.co/trace/sitemap.xml` in Search Console after launch.
- Check real-world Core Web Vitals and Search Console impressions/clicks. App Store outbound clicks and actual acquisitions are different outcomes. No analytics or experiment scripts are included.

## Deployment and review

A push to `main` triggers `.github/workflows` and copies the site into the parent repository’s `/trace/` folder. **Merging into main publishes automatically.** Branch pushes and draft PR creation do not trigger this workflow. No deployment, release, or Search Console mutation has been performed for these refinements.

`codex/marketing-site-refinements` (PR #1) preserves the initial marketing refresh. `codex/browser-workspace` builds on it with the simplified browser demo, design refinements, guides, and SEO updates. Review release checks before merging either PR.
