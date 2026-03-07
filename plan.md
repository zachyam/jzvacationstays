# Admin Inspection Checklist — Implementation Plan

## Overview
Extend the existing checklist system to support full inspection workflows: admin creates checklists grouped by room/area, generates a public link, handyman opens the link to check off items, add comments, and upload photos/videos. Admin reviews completed inspections.

---

## Data Model Changes

### 1. Extend `checklist_items` — add `room` column
Add a `room` (varchar) column to `checklistItems` for grouping items by room/area (e.g., "Kitchen", "Master Bedroom", "Pool Area"). Items with the same `room` value are displayed together under a heading.

**File:** `src/db/schema/checklists.ts`

### 2. New table: `inspections`
Represents a single inspection session (a handyman visiting a property with a checklist).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| checklist_id | uuid FK → checklists | The template checklist being used |
| property_id | uuid FK → properties | Which property |
| token | varchar(64) UNIQUE | Random token for public access URL |
| inspector_name | varchar(255) | Handyman's name (set by admin or self-entered) |
| status | varchar(20) | "pending" / "in_progress" / "completed" |
| notes | text | Overall inspection notes |
| started_at | timestamp | When handyman first opens |
| completed_at | timestamp | When handyman marks done |
| created_at | timestamp | |

**File:** `src/db/schema/inspections.ts`

### 3. New table: `inspection_items`
Snapshot of checklist items for this specific inspection, with completion state, comments, and media.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| inspection_id | uuid FK → inspections | |
| checklist_item_id | uuid FK → checklist_items | Reference to template item |
| room | varchar(100) | Copied from checklist item |
| title | varchar(255) | Copied from checklist item |
| description | text | Copied from checklist item |
| is_completed | boolean | default false |
| status | varchar(20) | "pass" / "fail" / "na" / null |
| comment | text | Handyman's comment |
| completed_at | timestamp | |
| sort_order | integer | |

**File:** `src/db/schema/inspections.ts`

### 4. New table: `inspection_media`
Photos and videos attached to inspection items.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| inspection_item_id | uuid FK → inspection_items | |
| url | varchar(500) | S3/R2 URL |
| file_type | varchar(10) | "image" / "video" |
| file_name | varchar(255) | Original filename |
| file_size | integer | Bytes |
| created_at | timestamp | |

**File:** `src/db/schema/inspections.ts`

---

## File Upload Infrastructure (S3/R2)

### 5. S3 client setup
Create a reusable S3 client configured for either AWS S3 or Cloudflare R2 (both use the S3 API).

**File:** `src/lib/s3.ts`
- Install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`
- Configure from env vars: `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- Export `getPresignedUploadUrl(key, contentType)` — returns a presigned PUT URL (5 min expiry)
- Export `getPublicUrl(key)` — returns the public object URL

### 6. Upload server function
**File:** `src/server/functions/uploads.ts`
- `getUploadUrl` server function — validates file type (image/video), generates a unique S3 key under `inspections/{inspectionId}/{itemId}/{uuid}.{ext}`, returns presigned URL + final public URL
- No auth required (inspection token validated instead)

---

## Server Functions

### 7. Inspection server functions
**File:** `src/server/functions/inspections.ts`

**Admin functions** (require `requireAdmin()`):
- `createInspection({ checklistId, propertyId, inspectorName })` — creates inspection + copies checklist items into `inspection_items`, generates random token, returns inspection with token URL
- `getInspections()` — list all inspections with status, property name, completion stats
- `getInspectionReport({ inspectionId })` — full inspection detail: all items grouped by room, with comments and media, for admin review
- `deleteInspection({ inspectionId })` — delete inspection and cascade

**Public functions** (validate by token, no login required):
- `getInspectionByToken({ token })` — fetch inspection with all items grouped by room, and media
- `updateInspectionItem({ token, itemId, isCompleted, status, comment })` — check off item, set pass/fail, add comment
- `completeInspection({ token, notes })` — mark inspection as completed with optional overall notes
- `startInspection({ token, inspectorName })` — set status to in_progress, record start time

### 8. Extend existing admin-checklists
**File:** `src/server/functions/admin-checklists.ts`
- Update `addChecklistItem` to accept optional `room` parameter
- Update `getChecklistById` to return items with room info

---

## Routes & UI

### 9. Update checklist detail page — add room grouping
**File:** `src/routes/_admin/checklists/$checklistId.tsx`
- Add `room` field to the "add item" form (text input with datalist of existing rooms for autocomplete)
- Group items by room in the display, with room headings
- Add "Create Inspection" button that opens a modal to select property + inspector name, then calls `createInspection` and shows the shareable link

### 10. Admin inspections list page
**File:** `src/routes/_admin/inspections/index.tsx`
- Table/card list of all inspections
- Shows: property name, checklist title, inspector name, status badge, completion %, date
- Filter by status (pending / in_progress / completed) and property
- Link to inspection report

### 11. Admin inspection report page
**File:** `src/routes/_admin/inspections/$inspectionId.tsx`
- Read-only view of completed (or in-progress) inspection
- Items grouped by room
- Each item shows: pass/fail status, comment, uploaded photos/videos (thumbnail grid, click to enlarge)
- Overall progress bar and stats
- Inspector notes section
- Shareable link display with copy button

### 12. Add "Inspections" to admin sidebar
**File:** `src/components/admin/admin-sidebar.tsx`
- Add nav item: `{ to: "/inspections", label: "Inspections", icon: "solar:clipboard-check-linear" }`

### 13. Public inspection page (handyman view)
**File:** `src/routes/inspect/$token.tsx`
- **Not** under `_admin/` layout — standalone public page, no login required
- Token validated via server function
- Shows property name, checklist title, progress bar
- Items grouped by room with collapsible sections
- Each item has:
  - Checkbox (check off)
  - Pass / Fail / N/A toggle buttons
  - Comment textarea (auto-saves on blur)
  - Upload button for photos/videos (opens file picker, uploads directly to S3 via presigned URL, shows thumbnails)
- "Start Inspection" button at top (captures inspector name if not set)
- "Complete Inspection" button at bottom with optional overall notes textarea
- Mobile-friendly responsive layout (handyman will use phone)

---

## Validators

### 14. Add new Zod schemas
**File:** `src/lib/validators.ts`
- `inspectionSchema` — checklistId, propertyId, inspectorName
- `inspectionItemUpdateSchema` — itemId, isCompleted, status (pass/fail/na), comment
- Update `checklistItemSchema` — add optional `room` field

---

## Migration

### 15. Generate and apply migration
- Run `pnpm db:generate` after schema changes
- Run `pnpm db:migrate` to apply

---

## File Summary

| Action | File |
|--------|------|
| Modify | `src/db/schema/checklists.ts` — add `room` column to `checklistItems` |
| Create | `src/db/schema/inspections.ts` — `inspections`, `inspection_items`, `inspection_media` tables |
| Modify | `src/db/schema.ts` — add inspections export |
| Create | `src/lib/s3.ts` — S3/R2 client + presigned URL helpers |
| Create | `src/server/functions/inspections.ts` — all inspection server functions |
| Create | `src/server/functions/uploads.ts` — presigned URL generation |
| Modify | `src/server/functions/admin-checklists.ts` — room support |
| Modify | `src/lib/validators.ts` — new schemas |
| Modify | `src/routes/_admin/checklists/$checklistId.tsx` — room grouping + create inspection button |
| Create | `src/routes/_admin/inspections/index.tsx` — inspections list |
| Create | `src/routes/_admin/inspections/$inspectionId.tsx` — inspection report |
| Modify | `src/components/admin/admin-sidebar.tsx` — add Inspections nav |
| Create | `src/routes/inspect/$token.tsx` — public handyman inspection page |

---

## Implementation Order
1. Schema + migration (steps 1-4, 15)
2. S3 infrastructure (steps 5-6)
3. Server functions (steps 7-8)
4. Validators (step 14)
5. Admin UI updates (steps 9, 10, 11, 12)
6. Public handyman page (step 13)
