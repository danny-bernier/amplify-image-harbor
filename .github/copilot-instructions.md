# Copilot Instructions for amplify-image-harbor

Purpose: concise, actionable guidance so an AI coding assistant can be productive immediately.

Project overview
- Next.js app (see `src/app/`) using the App Router; UI is React + TypeScript.
- Backend and cloud resources are defined under `amplify/` (see `amplify/backend.ts`, and resource files under `amplify/*`).
- Code is organized into UI, services, types, and utilities:
  - UI: `src/app/` for pages and `src/components/` for reusable pieces (e.g., `gallery/`, `upload/`, `common/`).
  - Services: `src/services/` contains `dbService.ts`, `s3Service.ts`, `uploadService.ts`, `imageService.ts` — these encapsulate all backend logic.
  - Types: shared interfaces live in `src/types/` (e.g., `images.ts`).
  - Utils: helpers live in `src/utils/` (e.g., `imageUtils.ts`, `logger.ts`).

Big-picture architecture & data flow (what to know)
- The UI never talks to AWS SDKs directly; it calls service functions in `src/services/` which centralize DB, S3, and upload behavior.
- Upload flow example: `src/components/upload/*` -> `src/services/uploadService.ts` -> `src/services/s3Service.ts` (+ `dbService.ts` for metadata).
- Image viewing: gallery components (`src/components/gallery/*`) call `imageService.ts` and use `PromisedImage.tsx` for robust loading and placeholders.
- Amplify is the authoritative definition for cloud resources; changes to schema/resource files in `amplify/` must be applied via the Amplify CLI.

Conventions and patterns (project-specific)
- CSS modules: all component styles use colocated CSS modules (e.g., `Gallery.module.css`, `Upload.module.css`).
- Feature folders: group UI components by feature under `src/components/<feature>/` and export an `index.ts` where appropriate.
- Single source of truth for types: import types from `src/types/` rather than redefining shape in components.
- Services are the integration boundary: put fetch/s3/db logic in `src/services/*` and keep components focused on rendering/state.
- Use `PromisedImage.tsx` for images to get consistent loading/fallback behavior across gallery/inspector components.

Developer workflows & useful commands
- Run frontend dev server: `npm run dev` (Next.js). Use `start-local.sh` to start the full local environment used during development.
- There are helper scripts: `start-local-frontend.sh` and `start-local-sandbox.sh` — check `start-local.sh` to see how they are composed.
- Build: `npm run build` (standard Next.js build). If CI exists, follow pipeline defined in repo (not present here).
- Amplify edits: change files under `amplify/` and then use the Amplify CLI to push cloud changes. For local testing, `start-local.sh` is the canonical entry.

Where to make common changes (examples)
- Add a page: create a new folder under `src/app/` with a `page.tsx` (e.g., `src/app/new-feature/page.tsx`).
- Add a component: place under `src/components/<feature>/`, export from an `index.ts`, add CSS as `<Component>.module.css`.
- Add backend model/resource: edit `amplify/data/resource.ts` (and update types in `src/types/`), then apply via Amplify CLI.
- Add S3/upload behavior: extend `src/services/s3Service.ts` and `src/services/uploadService.ts`; UI should call the upload service only.

Code examples (patterns you'll repeat)
- Loading images with the shared component:
  - `src/components/common/PromisedImage.tsx` — use this when rendering remote images to get consistent placeholders and error states.
- Inspector components:
  - `src/components/gallery/image-inspector/SingleImageInspector.tsx` and `MultiImageInspector.tsx` show how to compose control bars and preview panels.

Tests / linting / formatting
- This repository currently focuses on the app and amplify config. If tests/linting are added, follow existing package.json scripts. Start with `npm run dev` to validate runtime behavior.

Integration notes & gotchas
- Do NOT import AWS SDK directly into UI components — use the service layer (`src/services/*`).
- Amplify resource files under `amplify/` are authoritative for cloud config; editing them requires Amplify CLI steps to deploy.
- The app uses TypeScript; prefer updating `src/types/` when changing data shapes.

If something is ambiguous
- Search for examples in `src/components/` before introducing new patterns. Mirror folder and naming conventions used by `gallery/` and `upload/`.

Feedback
- If any section is unclear or you want more examples (e.g., a step-by-step for adding a model and wiring UI), tell me which area and I'll expand with concrete code edits.
