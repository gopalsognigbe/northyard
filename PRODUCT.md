# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: Vite + React, GSAP ScrollTrigger, Lenis. Public site is a video-scrub marketing page. 3D studio lives at `/studio` for filming only — visitors never load Three.js.

## Users

Wine merchants, sommeliers, and collectors discovering an invented Languedoc domaine. They arrive from a link or a portfolio case study; they decide whether the house feels real enough to request an allocation.

## Product Purpose

Prove that a 2–4k € freelance package can hold: brand (label + bottle) plus a cinematic site where scroll reads a filmed object, not a live GPU scene.

## Positioning

The bottle is filmed once (mp4 all-intra). The site only seeks `currentTime`. Neighbour wine sites either shop or run WebGL; Laclau does neither.

## Brand commitments

- Invented client: Domaine Laclau, cuvée Fontanille, AOP Faugères 2023, rouge, 75 cl, 13,5% vol.
- Label direction A: cream laid paper, letterpress, schist terraces drawing, oxblood rule, black serif. FR primary.
- Public site must not use the visitor’s GPU for 3D. No live Three.js / WebGL on `/`.
- Hero motion is video scrub (scroll → timeline), Terminal Industries as reference.
- Studio at `/studio` is a production tool, not the vitrine.

## Evidence

- Print plate: `public/labels/fontanille.png`
- Intro: `public/film/glissage.mp4` (auto, ×2)
- Scrub takes: `hero.mp4`, `spin.mp4`, `shift.mp4` (1920×1080, 30 fps, 8 s each)
- Locked reference take: `public/film/plan-01.mp4` (studio only — never overwrite)
- Allocation form: bordeaux sticker overlay at end of scrub (`/apercu` for variants)

## Constraints

- Accessibility: respect `prefers-reduced-motion` (static poster, no scrub). Keyboard-reachable allocation action.
- Commercial claims (prices, awards, real distribution) stay unmarked / unpublished — this is a lab brief.

## Open

- Additional takes (seuil / table / étiquette) to splice later. Hero currently uses the one exported take.
