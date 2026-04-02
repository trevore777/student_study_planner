# StudyTrack starter pack

This starter pack includes:

- a Node.js + Express + EJS prototype
- client-side IndexedDB storage for local-first persistence
- starter schema files in SQL and JSON
- a privacy-by-design draft
- a school pitch summary

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Recommended roadmap

1. Prototype local-first student workflow
2. Add teacher-posted homework
3. Add optional school-managed sync
4. Add bounded AI for planning only

## Important implementation note

For a browser-first prototype, use IndexedDB on-device. If you later wrap the app with Capacitor or another native shell, you can revisit true local SQLite.