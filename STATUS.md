# Dashboard Status

## Stack
- Node.js + Express, `app.js`, flat `db.json`, `index.html` SPA
- Run: `nodemon app.js` → `http://localhost:3000`
- Location: `C:\Users\asapi\OneDrive\Documents\DASHBOARD`

## Current File State
- `index.html` in project = 188KB, syntax OK, missing last session's changes (see TO BUILD below)
- `app.js` has scrape endpoints (`/api/scrape-job`, `/api/parse-job`) and file upload routes
- `db.json` has live data — Kennicott timeline updated with interview/followup/status entries

## What's Working
- Full sidebar with dynamic subitems (Job Search: Active/Applied/Archived/Contacts; all areas: Completed/Archived)
- Dashboard: Needs Attention (auto-logic: interviews, awaiting, upcoming events), Today strip, area cards, calendar
- Calendar: day/week/month, all areas have identical widget, area cals filtered to area events, label above updates dynamically
- Job area: collapsible groups (Active/Applied/Archived), job records with full fields, interviews, contacts, documents
- Company records: own page, linked contacts/jobs, fuzzy match, auto-link on creation
- Contact records: area field, company field links to company record, vertical chip stack with role
- Documents: per-job upload slots (Resume/Cover Letter/Other), Documents library page
- Add Job modal: URL-first → scrape → confirm → fallback paste/screenshot
- Add Company modal: Name/Industry/Website/Location
- Sticky notes on all records: Enter to save, color cycle, up/down reorder
- Copy for Claude button on all records
- Complete/Archive status: buttons on record page, collapsible groups in area view, global Completed/Archived pages
- Calendar event styling: completed=green, past completed=faded green, archived=dim strikethrough
- Undo: NOT YET BUILT (see below)
- Right-click context menu: NOT YET BUILT
- Urgency widget: NOT YET BUILT

## TO BUILD (last session incomplete)
These were attempted but the project file wasn't updated before session ended:

### 1. Undo Stack (Ctrl+Z)
- `const undoStack = []; const MAX_UNDO = 20;`
- `pushUndo({type, recordId, before, after})` called on status/urgency changes
- `undoLast()` reverses last action
- `document.addEventListener('keydown', ...)` intercepts Ctrl+Z

### 2. Context Menu (right-click on record cards)
- `showRecordCtxMenu(event, recordId)` — positioned at cursor
- Shows: urgency options (No flag/Flagged/Priority/Urgent) + status options + Open record
- Add `oncontextmenu="showRecordCtxMenu(event,'${r.id}')"` to `recordCard()` and `jobCard()`
- CSS: `.ctx-menu`, `.ctx-item`, `.ctx-divider`

### 3. Urgency Widget in Job Record Sidebar
- Small section card ABOVE Contacts in right sidebar
- Four pills: No flag / 🟡 Flagged / 🔵 Priority / 🔴 Urgent
- Active pill highlighted, clicking calls `setUrgency(recordId, level)`
- CSS: `.urgency-widget`, `.urgency-pill`, `.active-flagged/priority/urgent`

### 4. Clickable Dot on Needs Attention
- The colored `a-dot` div should trigger `showRecordCtxMenu` on click
- Needs `recordId` added to attention items (interviewing/awaiting jobs)
- `onclick="event.stopPropagation(); showRecordCtxMenu(event, recordId)"`

### 5. setRecordStatus / setUrgency functions
- Replace `markComplete`/`markArchived` with unified `setRecordStatus(recordId, status)`
- Add `setUrgency(recordId, level)` — both push to undoStack
- `cycleUrgency` calls `setUrgency`

### 6. Remove flag button from topbar
- Currently `cycleUrgency` button is in topbar — remove it, urgency lives in sidebar widget only

### 7. Clickable area tags everywhere
- Every "Job Search" tag/pill in attention items, record cards should navigate to that area
- Pattern: `onclick="navigate('area','${area.id}')"` with colored pill style

## Key Decisions
- Urgency (flagged/priority/urgent) and Status (active/interviewing/awaiting/completed/archived) are SEPARATE fields
- Complete on a job event does NOT change the linked job record status
- Needs Attention: urgency-flagged records appear first, then auto-logic (interviews, events, awaiting)
- Undo depth: 20 actions, covers status + urgency + field edits
- Area calendar default: day view
- All calendars use single `renderCalWidget(containerId, mini, areaFilter)` — area filter passed as 3rd arg

## Pending / Deferred
- Documents overhaul: search, filter/sort, download button (sub-batch 3 remaining)
- Contacts overhaul: Last/First alpha sort, line/tile toggle, filter/sort (sub-batch 3 remaining)
- "Ask Claude" button on records (after sub-batch 3)
- Hosting migration to Railway + Supabase (deferred)
- MCP server integration (deferred until hosted)
