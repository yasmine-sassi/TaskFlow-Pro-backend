# TaskFlow Pro Backend – Frontend Integration Guide

This file captures what the Angular frontend needs: endpoints, payloads, filters, auth expectations, and data shapes. All routes are REST over JSON, protected by JWT (cookie first, bearer fallback). Use Swagger for live docs.

## Auth & Session
- Login: `POST /auth/login` `{ email, password }` → sets HTTP-only cookie (`access_token`) and returns user. Use cookie for requests; bearer token also accepted.
- Register: `POST /auth/register` `{ email, password, firstName, lastName }`.
- Current user: `GET /auth/me` returns user profile; fails 401 if not logged in.
- Logout: `POST /auth/logout` clears cookie.
- Guarding UI: treat 401/403 as unauth; role guard exists for ADMIN-only endpoints (`/auth/admin-only`).

## Role-Based Permissions Summary
- **ADMIN:** Full access to everything; bypasses all project membership checks; can delete any user and any project.
- **Project OWNER:** Can update project, add/remove members, create tasks, assign/unassign tasks, delete tasks, change any task field.
- **Project EDITOR:** Can view project and tasks; can only change **status** of tasks **assigned to them**; cannot create, delete, or assign tasks.
- **Project VIEWER:** Can only view projects and tasks they're members of; cannot make any changes.
- **Comments & Attachments:** Any project member (OWNER/EDITOR/VIEWER) can add comments or attach files to tasks.

## Projects & Members
- List/create/update projects: `POST /projects`, `GET /projects`, `PATCH /projects/:id`.
- Delete project: `DELETE /projects/:id` **(ADMIN only)**.
- Archive project: `PATCH /projects/:id` with `isArchived: true` **(owner only)**.
- Members: owner can add/update/remove members via `/projects/:projectId/members`.
- `ProjectMemberRole` = OWNER | EDITOR | VIEWER.

## Tasks
- Create: `POST /tasks` `{ title, description?, status?, priority?, dueDate?, position?, projectId, assigneeIds?[] }` **(project owner only)**.
- List by project with filters/pagination: `GET /tasks/project/:projectId` query `{ status?, priority?, assigneeId?, search?, page?, limit? }` **(any project member)**.
- Get one: `GET /tasks/:id` **(any project member)**.
- Update: `PATCH /tasks/:id` 
  - **OWNER/ADMIN:** can change any field
  - **EDITOR:** can only change `status` of tasks assigned to them
  - **VIEWER:** cannot update
- Delete: `DELETE /tasks/:id` **(project owner only)**.
- Assign/unassign: `POST /tasks/:taskId/assign` `{ userId }`; `DELETE /tasks/:taskId/assign/:userId` **(project owner only)**.
- Status/priority enums: status = TODO | IN_PROGRESS | IN_REVIEW | DONE; priority = LOW | MEDIUM | HIGH | URGENT.

## Subtasks
- CRUD under `/subtasks` **(any project member can manage subtasks for tasks in their project)**.

## Labels
- CRUD under `/labels`.
- Tasks can be filtered by label in search endpoints (see Search below).

## Comments
- Add: `POST /comments` `{ content, taskId }` **(any project member)**.
- List for task: `GET /comments/task/:taskId` (newest first), includes author info **(any project member)**.
- Update/Delete (author only): `PATCH /comments/:id`, `DELETE /comments/:id`.
- Activity and notifications fire to task owner/assignees.

## Attachments (metadata only)
- Create metadata: `POST /attachments` `{ fileName, fileUrl, fileSize, mimeType, taskId }` **(any project member)**.
- List by task: `GET /attachments/task/:taskId` (newest first) **(any project member)**.
- Delete: `DELETE /attachments/:id` **(any project member)**.
- File storage is BYO (provide `fileUrl` from your uploader/S3/Blob). Server enforces project membership, not upload.

## Search (cross-project)
- Tasks: `GET /search/tasks` query params
  - `q` (text on title/description, case-insensitive)
  - `status`, `priority` (enums above)
  - `projectId` (optional scope; must be accessible)
  - `labelId`
  - `dueFrom`, `dueTo` (ISO strings)
  - `page`, `limit`
  Returns paginated tasks with owner, assignees, labels **(respects project membership; ADMIN sees all)**.
- Comments: `GET /search/comments` query params
  - `q` (text on comment content)
  - `taskStatus`, `taskPriority`
  - `projectId`, `labelId`
  - `dueFrom`, `dueTo`
  - `page`, `limit`
  Returns comments with author and task context **(respects project membership; ADMIN sees all)**.

## Users (Admin)
- List all users: `GET /users` **(ADMIN only)**.
- Delete any user: `DELETE /users/:id` **(ADMIN only)**.
- User self-management: `GET /users/profile`, `PATCH /users/profile`, `DELETE /users/account`.

## Notifications
- Notifications are created for task assignment/update/completion and comments. Listing endpoints exist in Notifications module; each notification has `id`, `type`, `title`, `message`, `isRead`, `entityId`, timestamps. Mark-as-read endpoint available (see Swagger).

## Activity Log
- Recorded for task create/delete/assign, comment add, etc. Activity endpoints list by project/task/user with timestamps and metadata. Use for audit timeline in UI.

## Validation & Errors
- Global `ValidationPipe` with `whitelist` and `forbidNonWhitelisted`: extra payload fields are rejected 400.
- Common errors: 401 unauthenticated, 403 not project member or insufficient role, 404 when entity missing, 400 on validation.

## Environment & Running
- `.env` needs `DATABASE_URL` (pooler) and `DIRECT_URL`. Validation in `src/config/env.validation.ts`.
- Dev start: `npm run start:dev` (PORT default 3000). On Windows + Supabase pooler: `NODE_TLS_REJECT_UNAUTHORIZED=0` is set inside Prisma service for compatibility.

## Seed Data (for local/demo)
- Admin: `admin@taskflow.dev` / `Password123!` (role: ADMIN)
- Member: `member@taskflow.dev` / `Password123!` (role: USER)
- Seed script: `set NODE_TLS_REJECT_UNAUTHORIZED=0 && npx ts-node --skip-project prisma/seed.ts`.

## Frontend Tips
- Rely on HTTP-only cookie; avoid storing token. For API tooling, send bearer from `access_token` cookie if needed.
- Drive dropdowns from enums above; prefer select inputs for status/priority/roles.
- Paginated responses share `{ data, meta { total, page, limit, totalPages } }` shape across tasks/search.
- Use search endpoints for global search bar; project filter optional and enforced server-side.
- Attachments UI should upload to storage first, then POST metadata with resulting URL.
- Role-based UI: disable edit buttons for viewers, limit editors to status-only updates on assigned tasks, show all controls to owners/admins.
