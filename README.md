# Trace browser workspace experiment

Static HTML, CSS, and JavaScript for https://ruckuslabs.co/trace/. No build step or tracking scripts.

## Experimental branch

`codex/browser-workspace` builds on the preserved marketing branch `codex/marketing-site-refinements` (PR #1). It replaces the homepage hero with a 100dvh browser playground; the marketing content remains below it. The earlier design remains committed on its own branch.

`workspace.css` and `workspace.js` contain the playground. Features include image file upload, drag/drop and clipboard paste, a customizable implementation background, draggable references, tabs/thumbnails, inversion, 50% image blending, separate window opacity, zoom/Actual Size/Fit, alignment, per-reference undo/redo, locking/hiding, a theme toggle, and a shortcut dialog. Data stays in memory and blob URLs are revoked on page exit. No image upload service or account is used.

Keyboard shortcuts are scoped to the focused playground. Command is used on Mac, Control on other systems. Browser-reserved shortcuts such as Command–T/W may take precedence; toolbar/tab controls provide alternatives. Command–N creates a reference tab rather than a native window. The browser’s screen-sharing chooser is used for a single-frame capture and tracks stop immediately afterward. It cannot capture underneath itself while excluding the playground or float over another application. Screen-sharing and clipboard-copy permissions remain browser dependent.

Validation: image-file import, tab creation/switching/closing, inversion, history, keyboard nudging, exact sample alignment, locking, and the shortcut dialog were exercised in the in-app browser. The viewport was checked at desktop and 390px without horizontal page overflow. The permission-dependent screen chooser and clipboard image copy have not been exercised end to end. Local HTML/links/metadata/assets and JavaScript syntax checks passed.


Serve this directory with any static server. Keep the `/trace/` deployment prefix when checking canonical URLs and the sitemap. Shared styles live in `styles.css`; only the homepage loads `script.js` for the desktop comparison scene and layered 3D icon. All essential content remains available without JavaScript.

## Product screenshots

The new reference screenshots were captured from a build of the current Trace repository (1.0.1, macOS 26 target), using a local sample interface and clipboard paste. The overlay image is an illustrative comparison assembled from authentic normal/inverted Trace screenshots with the sample heading displaced. It reproduces the app's encoded-RGB 50% blend; captions disclose that it is assembled, rather than a recording of a live comparison. No private desktop content appears in these assets. The old full-desktop carousel and preferences screenshots are no longer used.

## Before publishing

- This repository targets the current macOS 26+ app. The App Store listing reviewed on October 8, 2026 still listed macOS 14+. Verify the distributed version's minimum OS, features, and screenshot UI before publishing this site. Do not launch these compatibility claims ahead of the corresponding app release.
- Verify the free price, Mac App Store destination, capture/paste behavior, inversion/translucence, Actual Size, tabs/history, and lock/click-through behavior in the distributed app.
- The homepage SoftwareApplication schema passed Google's Rich Results Test on October 8, 2026 (one valid item; only the optional aggregateRating field was missing). The submitted sample contained only the schema, not the unpublished page design. Repeat the test for the deployed URL and inspect it in Search Console. Do not add invented ratings or promise rich-result appearance.
- Submit `https://ruckuslabs.co/trace/sitemap.xml` in Search Console. Inspect the domain-root `robots.txt` and existing sitemap in the parent site repository; a `/trace/robots.txt` would not control the domain. The public domain-root robots and sitemap requests returned HTTP 403 in this environment on October 8, 2026, so their contents remain unverified. Inspect them in the parent repository or Search Console before launch.
- Compare Search Console impressions/clicks and App Store Connect acquisition before and after launch. No analytics scripts or new account setup are included.

## Deployment

The existing workflow copies this repository into the parent site's `/trace/` folder when `main` is pushed. A push to `main` publishes automatically. These refinements are proposed for review; no deployment or release has been performed.

## Validation performed

All five pages were reviewed at 360, 390, 768, and 1440 pixels, without horizontal overflow or broken images. Frame dragging, alignment, inversion, 50% blending, focused arrow-key nudging, the layered 3D icon, FAQ expansion, and the JavaScript-free desktop scene passed. Local checks covered HTML nesting, one H1 per page, descriptions/canonical/social metadata, JSON-LD, asset dimensions, all internal links and fragment targets, sitemap coverage, JavaScript syntax, and text contrast. New responsive screenshot files total approximately 156 KB. The app source was built for screenshots but not changed.

## Visual direction

The original white background, centered headings, narrow layout, floating pill navigation, shortcut card, and layered 3D icon are retained. The screenshot carousel is replaced by a desktop scene with a Figma-inspired editor and a separately draggable Trace window, assembled from current Trace screenshot pixels. Arrow keys are handled only while the overlay is focused; the page does not intercept browser shortcuts. The icon supports mouse/touch dragging and stops animation when settled, while reduced-motion preferences disable its movement.

The homepage shortcut card now presents 22 current app shortcuts in capture/edit, compare/align, and tabs/workspace groups. The comparison frame batches pointer position changes into animation frames, crossfades predecoded reference/inversion layers, and animates alignment reset without changing the selected modes. Reduced-motion settings disable the transitions. CSS/JavaScript asset URLs carry a revision to refresh older browser previews.

The preview moves the whole Trace window over the editor. Alignment resets match both image areas exactly; inversion and blending remain independently selectable. Shortcut glyphs preserve their proportions with optical size adjustments, including dedicated undo/redo arrows. The footer icon rests at an angle with 20 solid body layers so its depth remains visible when idle.

The desktop preview expands to 800px with a 16:10 MacBook-style proportion on larger screens. Inversion and 50% blending are enabled by default. Navigation, download, and text links use a shared 24-unit SVG arrow family with matching stroke weight and rounded ends.

Supporting homepage actions use secondary pill buttons with title-case labels and normal letter spacing. Overlay dragging caches movement bounds during resize, performs no layout reads in pointer movement, and commits only the latest position once per animation frame. The dock no longer uses backdrop blur beneath the moving window, and the inner comparison surface no longer requests an unnecessary transform layer. Dragging, mode controls, exact settled alignment, and mobile button wrapping were checked in the local preview.

The design caption is outside the desktop and its controls. The workflow uses three desktop cards that stack on mobile, shortcut group headings are centered, and the FAQ now includes eight product questions with an introductory subheadline. The interactive footer icon has a solid 24px extruded blue body behind its original face, with an angled resting pose and no continuous animation.

FAQ answers animate open and closed over 220ms, support reversing an in-progress transition, and retain native keyboard interaction. Reduced-motion settings use instant native disclosure behavior.
