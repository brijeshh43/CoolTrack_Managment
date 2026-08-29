# CoolTrack — Field Service Management Handbook

A practical guide to how the app is built, how each workflow behaves, and where to change things.

---

## 1. Roles

| Role     | How it is assigned                                                                                | What they can do                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Admin    | The **first** account registered becomes admin automatically (database trigger `handle_new_user`) | Everything: create/assign jobs, manage customers, equipment, parts, team; see all jobs and reports |
| Engineer | Every account after the first                                                                     | Sees only jobs assigned to them, marks attendance, performs the on-site workflow, submits reports  |

Roles live in the `user_roles` table (never on the profile) and are checked with the database function `has_role(user_id, role)`. All access rules (RLS) use it.

---

## 2. Screen map

| Route              | Who      | Purpose                                                         |
| ------------------ | -------- | --------------------------------------------------------------- |
| `/auth`            | Public   | Sign in / register                                              |
| `/home`            | Engineer | Today's jobs, counters, duty status, admin shortcut             |
| `/jobs`            | Engineer | All assigned jobs with filters                                  |
| `/jobs/$jobId`     | Engineer | The full on-site workflow (status, checklist, parts, signature) |
| `/report/$jobId`   | Both     | Printable service report                                        |
| `/attendance`      | Engineer | Check-in / check-out with selfie + GPS                          |
| `/history`         | Engineer | Completed job history                                           |
| `/profile`         | Both     | Profile details and sign out                                    |
| `/admin`           | Admin    | Overview: counters + jobs by status + latest jobs               |
| `/admin/jobs`      | Admin    | Create, assign, reassign, filter and export jobs                |
| `/admin/customers` | Admin    | Customers and their equipment units                             |
| `/admin/parts`     | Admin    | Parts catalog (activate/deactivate)                             |
| `/admin/team`      | Admin    | Team list, roles, today's attendance, CSV export                |

Files live in `src/routes/`. A file named `admin.customers.tsx` becomes the URL `/admin/customers`.

---

## 3. Job lifecycle

```text
assigned → accepted → on_the_way → arrived → in_progress → completed
                                        ↘ waiting_for_parts
                                        ↘ cancelled
```

The engineer advances the job one step at a time on the job screen. Each transition writes a GPS entry into `location_logs`, and start/complete coordinates are stored on the job itself.

Statuses and the order are defined in `src/lib/fsm.ts` (`STATUS_FLOW`, `JOB_STATUS_LABEL`). Change them there and the whole UI follows.

---

## 4. Job types and evidence checklists

Four job types: **PM**, **Breakdown**, **Installation**, **Commissioning**.

Each type has its own checklist of photo/video evidence, defined in `CHECKLISTS` inside `src/lib/fsm.ts`:

```ts
{ key: "filter", label: "Filter", photoRequired: true }
```

Adding one line there automatically:

- adds the item to the engineer's job screen,
- adds it to the completion validation,
- adds it to the printed service report.

Each type also has its own detail record table: `pm_records`, `breakdown_records`, `installation_records`, `commissioning_records`.

---

## 5. Engineer daily flow

1. **Attendance** — selfie + GPS check-in on `/attendance`. Check-out at end of day.
2. **Open job** from Home or Jobs.
3. **Accept → On the way → Arrived** (GPS captured each step).
4. **Start work** — fill the type-specific form (complaint/diagnosis, gas charging, pipe details, test results…).
5. **Capture evidence** — before/after photos and videos per checklist item. Location and timestamp are stamped on each upload.
6. **Record parts used** — pick from catalog or type free text, with quantity, condition and serial number.
7. **Customer signature** — name + on-screen signature, saved with GPS.
8. **Complete** — the app validates required evidence, then generates a service report.

---

## 6. Offline support

`src/lib/offline.ts` handles poor connectivity at customer sites:

- Media captured offline is stored locally (as data URLs) in a queue.
- Form drafts are saved locally per job.
- When the device is back online, the queue flushes automatically and uploads to storage.
- `SyncBanner` at the top of the app shows offline / pending-sync state.

---

## 7. Data model (tables)

| Table                                                | Holds                                                      |
| ---------------------------------------------------- | ---------------------------------------------------------- |
| `profiles`                                           | Name, employee code, phone, active flag                    |
| `user_roles`                                         | admin / engineer                                           |
| `customers`                                          | Customer master with address and coordinates               |
| `units`                                              | Equipment per customer: model, serial, warranty            |
| `service_jobs`                                       | The job: type, status, schedule, engineer, GPS             |
| `pm_/breakdown_/installation_/commissioning_records` | Type-specific work details                                 |
| `job_media`                                          | Photos and videos, linked to a checklist key               |
| `parts_used`                                         | Parts consumed on a job                                    |
| `customer_signatures`                                | Signature image + GPS                                      |
| `service_reports`                                    | Generated report, status draft/submitted/approved/rejected |
| `attendance`                                         | Daily check-in / check-out with selfie and GPS             |
| `location_logs`                                      | Every status change location trail                         |
| `audit_logs`                                         | Change trail                                               |
| `parts`                                              | Parts catalog                                              |

Media files are stored in the private `job-media` storage bucket; access is restricted the same way as the job.

---

## 8. Security rules (RLS)

- Admins can read and write everything.
- Engineers can read/write only jobs where `engineer_id = their user id`, and the child records of those jobs (via `can_access_job`).
- Attendance and location logs are personal — engineers see only their own; admins see all.
- Nothing is publicly readable; sign-in is required for every table.

---

## 9. How to make common changes

| I want to…               | Do this                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| Add a checklist item     | Add an entry to `CHECKLISTS` in `src/lib/fsm.ts`                                            |
| Add a job type           | Add to the `job_type` database enum, then to `JOB_TYPES`, `JOB_TYPE_LABEL` and `CHECKLISTS` |
| Change a status name     | Edit `JOB_STATUS_LABEL` in `src/lib/fsm.ts`                                                 |
| Change colours/branding  | Edit tokens in `src/styles.css` (never hardcode colours in components)                      |
| Add an admin screen      | Create `src/routes/_authenticated/admin.<name>.tsx` and add it to `TABS` in `admin.tsx`     |
| Add a bottom-nav item    | Edit `ITEMS` in `src/components/fsm/bottom-nav.tsx`                                         |
| Change the report layout | Edit `src/routes/_authenticated/report.$jobId.tsx`                                          |

---

## 10. Operating notes

- The very first registration must be done by the manager — that account becomes the admin.
- Engineers should allow **camera** and **location** permissions on first use; both are required for evidence.
- Reports print directly from the browser (Print → Save as PDF).
- CSV exports are available for jobs and daily attendance from the admin screens.
