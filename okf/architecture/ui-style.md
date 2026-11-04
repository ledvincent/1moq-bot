---
type: Architecture
title: UI style
description: The owner's app is black on white with one grey, the system font in big bold sizes, a top menu bar and one centred desktop column, built from the shared parts in web/src/ui/; every later page (sign-in, unsubscribe) uses it
owner: vincent.ledreau@dirox.net
status: stable
tags: [ui, style]
---
# UI style

Set by MOQ-30 (design D4), from the owner's words: "minimalistic black and white website, big fonts, clear", "kind of like apple". Later UI tickets (MOQ-4 sign-in and setup, MOQ-18 unsubscribe page) build in this style. Pages and addresses: [page map](/decisions/MOQ-30-page-map-and-addresses.md).

## Tokens

In one stylesheet, `web/src/styles.css`, as CSS custom properties:
- Colour: black `#000` on white `#fff`, and one grey for secondary text and lines. No other colour: a state such as "paused" is shown by words and weight.
- Type: the system font stack `-apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Helvetica, Arial, sans-serif` (SF Pro on the Mac). No font file and no external request.
- Sizes: page titles about 48px bold, section titles about 24px, body about 17px, generous line height and white space; figures on Overview and Results set large.

## Layout

- A top bar: `1moq` on the left, the eight menu items, and a right slot kept for MOQ-4's Sign out.
- The current menu item has `aria-current="page"`, bold weight and an underline.
- The page sits in one centred column, about 1100px wide at most. Desktop only: no breakpoints.
- Pages showing invented data carry the "Sample data" pill (black outline) next to the title.

## Shared parts

In `web/src/ui/`: `PageHeader` (title and marker), `SampleDataMarker`, `Table`, `Stat` (a big number with its label), `NotConnectedAction` (an action that changes nothing and names the ticket that connects it). New pages use these rather than their own styles.

## Checking

The style is checked by eye in the PR review, in Chrome and Safari; tests check structure and behaviour, not looks ([page tests](/decisions/MOQ-30-page-tests-with-happy-dom.md)).
