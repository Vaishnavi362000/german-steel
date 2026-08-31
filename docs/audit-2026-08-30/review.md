# German Steel mobile review — 30 August 2026

Reviewed the signed-in E2E Field Officer A account at localhost:8081 using a 390×844 viewport. This was a navigation/read-only review, not an end-to-end mutation test. Screenshots were captured and inspected during this run. No source code was changed.

## Highest-impact findings

1. Correct visit customer/owner/contact field mapping (steps 5 and 8).
2. Fix browser-preview attachment loading (step 11).
3. Review attendance classification rather than labeling all remaining days as leave (step 10).
4. Fix calendar sizing on resize and the clipped final day (steps 2–4).
5. Investigate the visit-scoped versus employee-scoped complaint discrepancy (steps 7 and 15).
6. Standardize compact headers, filters, dates, casing, status colors and detail sheets (steps 1–16).

## Accessibility and verification limits

Many clickable elements appear as generic text/icon glyphs, rather than labeled buttons, in the browser's accessible structure. Several secondary labels are tiny and pale. These are accessibility risks, not a WCAG compliance determination; full keyboard, screen-reader and measured contrast testing remains.

No check-in, checkout, attendance request, add/edit/delete action, status update, logout, or permission change was intentionally submitted. The app itself shows a Location updated indicator during normal browsing; background behavior was not validated. Native camera, GPS/background tracking, offline behavior and uploads need emulator/device testing. The customer list root, brands/notes sheets, Home Location, notifications and all create/edit forms were not fully reviewed. Do not treat this report as a full test pass.

## Screens and findings

### 1. Home — Loads; needs clarity

Visit totals and target state load. Strong purple gradient, warning banner, target card and floating plus compete for attention. Several actions are icon-only. 'Show Recent Visits' is awkward wording for a section already present in the page structure. No live data was changed manually.

![Home](<C:/Users/Shubham/Desktop/Projects V2/German Steel Mobile/docs/audit-2026-08-30/01-home.png>)

### 2. Visits after viewport resize — Responsive defect

Resizing the already-loaded app to 390×844 showed only Monday and Tuesday in the calendar strip. This is a browser resize issue; not proof that native device startup is broken.

![Visits after viewport resize](<C:/Users/Shubham/Desktop/Projects V2/German Steel Mobile/docs/audit-2026-08-30/02-visits.png>)

### 3. Visits after reload — Partially recovers

Reloading at phone width restores the week, but the rightmost Sunday remains clipped at the edge. Empty state clearly explains how to add a visit.

![Visits after reload](<C:/Users/Shubham/Desktop/Projects V2/German Steel Mobile/docs/audit-2026-08-30/02-visits-fresh.png>)

### 4. Visits with records — Loads; dense cards

Selecting August 29 returned two completed visits. Cards unnecessarily repeat the same date and employee; the important customer name is truncated while secondary fields occupy large blocks.

![Visits with records](<C:/Users/Shubham/Desktop/Projects V2/German Steel Mobile/docs/audit-2026-08-30/03-visit-records.png>)

### 5. Visit summary — Data-display discrepancy

Visit #43 loads with two linked-task types, duration and sales. Contact is N/A and Owner / Customer duplicates the store name. Step 8 shows a real owner and phone on the customer screen. Review field mapping or join the customer record; do not assume the data is absent. Date formats differ from the list.

![Visit summary](<C:/Users/Shubham/Desktop/Projects V2/German Steel Mobile/docs/audit-2026-08-30/04-visit-summary.png>)

### 6. Visit requirement sheet — Loads; misleading initial state

The sheet initially said no requirements, then loaded the existing requirement. The accepted screenshot shows the loaded result, despite the file name. Use a loading state instead of an early empty state. The heading is duplicated, and status, priority, assignment and due date are not visible here.

![Visit requirement sheet](<C:/Users/Shubham/Desktop/Projects V2/German Steel Mobile/docs/audit-2026-08-30/05-requirement-empty.png>)

### 7. Visit complaint sheet — Loads; sparse detail

The existing complaint loads. Heading is duplicated, with a plain gray record block and little metadata. This should use the same compact detail structure as requirements.

![Visit complaint sheet](<C:/Users/Shubham/Desktop/Projects V2/German Steel Mobile/docs/audit-2026-08-30/06-complaint.png>)

### 8. Customer detail — Loads; excessive decoration

Owner E2E Test and a phone number are present, unlike Visit Summary. The customer name is truncated in a large identity card. Edit is shown twice, and each contact field has a separate tinted row. Empty email is shown without an explanatory placeholder.

![Customer detail](<C:/Users/Shubham/Desktop/Projects V2/German Steel Mobile/docs/audit-2026-08-30/07-customer-detail.png>)

### 9. Profile / section launcher — Works; inconsistent labeling

All major section entries are visible. BANGALORE is uppercase instead of sentence case. The subtitle is Sales rather than an explicit role. Large launcher cards require more space than compact rows; logout is an unlabeled icon in the accessible structure.

![Profile / section launcher](<C:/Users/Shubham/Desktop/Projects V2/German Steel Mobile/docs/audit-2026-08-30/08-profile.png>)

### 10. Attendance — Calculation semantics need review

Month and year show the current month. Summary values are repeated in a decorative chart with small labels. The app calculates Leaves as elapsed days minus full days, half days and Sundays; that is not a count of approved leave. Sundays are called Holidays. Align absence/leave/Sunday semantics with the intended business rules. Native and web parity was not exhaustively reconciled.

![Attendance](<C:/Users/Shubham/Desktop/Projects V2/German Steel Mobile/docs/audit-2026-08-30/09-attendance.png>)

### 11. Expenses — Confirmed web-preview failure

The ₹100 pending expense loads. Its attachment shows a placeholder. Runtime logs report expo-file-system.downloadAsync is not available on web. Add a web-compatible image path or explain unsupported preview behavior. Month/year controls are spaced far apart; date and category casing are inconsistent.

![Expenses](<C:/Users/Shubham/Desktop/Projects V2/German Steel Mobile/docs/audit-2026-08-30/10-expenses.png>)

### 12. Meetings — Loads; comparatively clear

Needs Action, Scheduled and Completed tabs have understandable labels; counts and empty-state guidance are useful. One completed meeting is counted; the default Needs Action tab is empty. Completed-record detail and creation were not tested.

![Meetings](<C:/Users/Shubham/Desktop/Projects V2/German Steel Mobile/docs/audit-2026-08-30/11-meetings.png>)

### 13. Requirements list — Loads; redundancy

The card repeats the customer name in its header and body. A wide right column is mostly empty apart from a chevron. The record is grouped under Today, which is based on updatedAt in code rather than explicitly labeled as an update date. Add clearer date context and a more compact card.

![Requirements list](<C:/Users/Shubham/Desktop/Projects V2/German Steel Mobile/docs/audit-2026-08-30/12-requirements.png>)

### 14. Requirement detail — Loads; mostly complete

Title, description, due date, priority and assignment are visible. Many stacked containers and a tall empty attachment section push status controls below the first screen. Status mutation was deliberately not tested.

![Requirement detail](<C:/Users/Shubham/Desktop/Projects V2/German Steel Mobile/docs/audit-2026-08-30/13-requirement-detail.png>)

### 15. Complaints list — Discrepancy to investigate

August's assigned-employee Complaints list is empty, although Visit #43 exposes a complaint. This list uses getByAssignedToAndDate, whereas the visit sheet is visit-scoped. Verify assignment and date semantics before declaring lost data or a frontend filter bug.

![Complaints list](<C:/Users/Shubham/Desktop/Projects V2/German Steel Mobile/docs/audit-2026-08-30/14-complaints.png>)

### 16. Pricing — Empty state loads

Today's date is displayed with no records. Large empty space and a different date-control style make it feel disconnected from other sections. A consistent date picker and useful empty-state guidance would help. No price was added.

![Pricing](<C:/Users/Shubham/Desktop/Projects V2/German Steel Mobile/docs/audit-2026-08-30/15-pricing.png>)

