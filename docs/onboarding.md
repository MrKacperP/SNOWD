# Signup and onboarding

Signup uses the existing Google authentication and the account's Google display name. No name or postal-code entry is required before authentication. Onboarding has three steps: role, address, and services. Homeowner and operator preferences retain the existing Firestore profile schema and verification behavior.

## Address providers

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: existing Google Places autocomplete and Google Maps JavaScript API configuration. The same library loader configuration is shared throughout the app.
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`: optional public Mapbox token. When Google is unavailable, Mapbox is the default search provider. When both are configured, an alternate-search button is available. Restart Next.js after changing environment variables.
- Mapbox uses Geocoding v6 with `permanent=true` because address results are saved to the user's profile. The Mapbox account needs permanent geocoding enabled and appropriate billing. Its static map keeps default attribution.
- Google search results display on Google Maps. Mapbox results display on Mapbox. Results from the two providers are not mixed on a map.
- Manual entry is available if an address cannot be found or a provider fails. Manual edits clear old coordinates. Manual addresses have no fabricated map coordinates.

## Defaults and recovery

Existing starter prices remain $25/$40/$60 for small/medium/large driveways and $15 for walkways and sidewalks (CAD per visit). They are editable suggestions, not live market estimates. Only services with pricing supported by the current operator profile schema are offered during operator setup. One shovel and a 10 km radius are selected initially and are editable.

Drafts use a per-user, versioned local-storage key. Storage failure does not block signup; failed saves keep form values and offer retry. Age, phone, notes, business name, and bio are optional. Existing senior-mode behavior is retained when age is provided.

## Verification

Browser checks used a temporary component harness with a stubbed save callback, removed after testing; no live accounts or Firestore profiles were created. Checked homeowner and operator paths, commercial presets, editable prices and invalid-price blocking, save-failure retry, successful completion payloads, draft restoration, address edits invalidating selection, live Google address selection/coordinates/map, keyboard selection, and mobile layouts at 390 px. Current screenshots are `.codex-artifacts/onboarding-desktop.png`, `.codex-artifacts/onboarding-mobile.png`, and `.codex-artifacts/signup-mobile.png`. The original snowd mascot is retained, with a subtle entrance animation that respects reduced-motion preferences.

Mapbox requires a configured token before live integration can be verified. Google OAuth account creation and production Firestore writes were not exercised by the browser harness.
