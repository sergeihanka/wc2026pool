# App Icons

Place the following PNG icon files in this directory before releasing to production:

| File                    | Size       | Usage                                     |
|-------------------------|------------|-------------------------------------------|
| `icon-180.png`          | 180×180    | Apple touch icon (iOS home screen)        |
| `icon-192.png`          | 192×192    | Android / PWA manifest icon               |
| `icon-512.png`          | 512×512    | PWA manifest icon (splash screen)         |
| `icon-512-maskable.png` | 512×512    | Maskable icon for Android adaptive icons  |

All icons should use the theme background color `#0a1628` so they look correct on
both Android adaptive icon and iOS home screen.

The build will succeed without these files — Workbox only precaches files that
actually exist in the output directory.
