# Copilot Instructions for amplify-image-harbor

## Project Overview
- This is a Next.js app (see `src/app/`) for image management, built with TypeScript and modular React components.
- Backend logic and cloud resources are managed in the `amplify/` directory, using AWS Amplify (see `amplify/backend.ts`, `amplify/auth/`, `amplify/data/`, `amplify/storage/`).
- The app is structured for clear separation between UI (`src/app/`, `src/components/`), services (`src/services/`), and utility logic (`src/utils/`).

## Key Patterns & Conventions
- **Component Structure:**
  - Pages live in `src/app/` (e.g., `gallery/page.tsx`, `admin/page.tsx`).
  - Reusable UI components are in `src/components/`, grouped by feature (e.g., `gallery/`, `upload/`, `common/`).
  - Use CSS modules for styling (e.g., `Gallery.module.css`).
- **Services:**
  - All data, S3, and upload logic is abstracted in `src/services/` (`dbService.ts`, `s3Service.ts`, `uploadService.ts`).
  - UI components should call these services for backend interactions, not access AWS SDKs directly.
- **Types:**
  - Shared types are defined in `src/types/` (e.g., `gallery.ts`, `images.ts`).
  - Always import types from here for cross-component consistency.
- **Utilities:**
  - Common helpers (e.g., image processing, logging) are in `src/utils/`.

## Developer Workflows
- **Start local dev:** Use `npm run dev` (Next.js frontend) and `start-local.sh` for full-stack local setup.
- **Amplify:** Backend resources are managed via the `amplify/` directory. Use Amplify CLI for updates.
- **Styling:** Use CSS modules, colocated with components. Avoid global styles except in `app/globals.css`.
- **Adding Features:**
  - Place new pages in `src/app/`.
  - Add new components under `src/components/` by feature.
  - Add new backend logic in `amplify/` and expose via services in `src/services/`.

## Integration Points
- **Frontend ↔ Backend:** UI calls service functions in `src/services/`, which handle all API/storage/database logic.
- **Amplify:** All cloud resource definitions and logic are in `amplify/`.

## Examples
- To add a new image upload step, create a component in `src/components/upload/` and update `src/services/uploadService.ts`.
- To add a new data model, update `amplify/data/resource.ts` and corresponding types in `src/types/`.

## References
- See `README.md` for Next.js basics and dev server instructions.
- See `amplify/` for backend resource structure.
- See `src/services/` for all backend communication patterns.

---

If you are unsure about a pattern, check for similar examples in the relevant directory before introducing new conventions.
