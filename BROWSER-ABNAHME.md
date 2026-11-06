# Browser acceptance · Hush 2.1.3

This checklist is for a real Chromium browser. jsdom, static audits and HTTP previews do not replace it.

## Startup and Wallpaper

- [ ] A reload starts with no Settings window open; the desktop is calm and empty of popups.
- [ ] Dark, light and color wallpapers keep their selected index per theme; no `dark1.webp`, black fallback or zoom-pop appears.
- [ ] Parallax follows the pointer subtly without black edges; reduced motion and the Parallax switch override every transform.
- [ ] The transparent HUSH wordmark sits in the Settings header with the tiny `2.1.3` version beside it; there is no black badge or eyebrow.

## Settings, Editor, Explorer and Snap

- [ ] Traffic lights, X, Escape and whole-window close all close Settings; it does not intermittently reappear or vanish on drag release.
- [ ] The Settings window uses transparent glass and closes only through its own controls.
- [ ] Window focus keeps the last-used window in the foreground; dragging does not make windows vanish.
- [ ] The Editor tab activates the stage and the clock can be dragged and resized.
- [ ] Explorer Back, Forward, sidebar, breadcrumbs, search, view switching and refresh work.
- [ ] Edge and corner snapping show a neutral monochrome preview and settle smoothly.

## Widgets and Backup

- [ ] Exactly five widget types are offered: notes, tasks, timer, calendar and world clock.
- [ ] No Battery, Quick links or Counter widget remains in the UI, search, commands, backup or CSS.
- [ ] Widgets start empty, can be dragged and resized, and persist after reload.
- [ ] JSON backup export and restore keep settings, shortcuts, Dock pins, widgets and Spaces.

## Hush Spaces

- [ ] Up to three local Spaces can be created; the add control stops at three.
- [ ] Each Space keeps its own theme, wallpaper, desktop shortcuts, Dock pins and widgets after switching.
- [ ] The Spaces pane only appears on the Spaces tab; switching tabs never leaves it stacked under another pane.
- [ ] Spaces render as one grouped list with hairline dividers, not as separate decorated cards.
- [ ] Each row carries exactly one color signal: the dot, which doubles as the color picker.
- [ ] The name reads as a label and only becomes a field on hover or focus.
- [ ] Switch and delete stay invisible until the row is hovered or focused, and remain keyboard reachable.
- [ ] The live Space is marked with the word "Aktiv", not a badge, and cannot be deleted.
- [ ] The footer offers "Space hinzufügen" plus a plain sentence about the free slots and disables at three Spaces.
- [ ] There is no separate Spaces icon in the Dock; Spaces stay reachable through Settings, search and the Settings context menus.
- [ ] Search switches Spaces; rename and Space color persist.
- [ ] Switching to a light Space uses its light wallpaper, never a dark fallback or black frame.
- [ ] Migration from settings version 11 removes saved Battery, Quick links and Counter widgets and creates a valid default Space.

## Settings chrome

- [ ] Actions are intrinsic-width buttons aligned right, never full-width stretched bars.
- [ ] Buttons show distinct hover, active, focus-visible and disabled states.
- [ ] Editor, Widgets and Spaces tabs share one sunken track; the active tab is a raised chip with `aria-selected`.
- [ ] Arrow keys, Home and End move between tabs.
- [ ] The whole Settings window is legible in the light theme.

## Safety

- [ ] Option/Alt opens a safe local app card with no iframe and no unsafe embedding.
- [ ] `javascript:` and unsafe `data:` URLs are blocked; labels use safe text handling.
- [ ] No runtime CDN, inline extension script, external font or remote telemetry is loaded.
- [ ] No rejected focus mode, transient popup or arbitrary embedded frame appears.

## Environment note

No real Chromium browser binary is available in this workspace. The automated results cover static, jsdom and HTTP checks; the boxes above remain the manual acceptance record.
