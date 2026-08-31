# German Steel 1.0.3 Release Notes

Release date: 2026-08-01

## Meeting workflow

- Replaced the meeting workflow's horizontal tabs with a compact left-side tab rail for Request, Attendees, Attendance, Gifts, Expenses, and Report.
- Updated all planned attendee wording from **Expected Turnout** to **Expected People**.
- Removed Purpose / Objective and Expected Business Impact from meeting request, review, detail, and meeting-list search views.
- Removed unnecessary request and workflow note fields, including Budget Remarks, Gift / Material Notes, general request Remarks, Gift Issue Remarks, Actual Expense Remarks, Expense Remarks, and Final Remarks.
- Cancellation Remarks remain because a cancellation requires an auditable reason.
- Entering Expected Budget and Company Contribution now automatically calculates Dealer Contribution.
- Planned Expenses and Planned Gifts are added locally and saved through the existing Draft or Submit flow; there is no separate planned-expense save action.
- Repeated-entry forms remain open after adding planned expenses, planned gifts, walk-ins, gift issues, and actual expense lines.

## Attendance and expenses

- Added CSV attendee import in the Attendees workflow for existing meetings. Imported attendees are added through the meeting attendee import API and the list refreshes after success.
- Added a sample attendee import CSV: `meeting-attendees-import-sample.csv`.
- Planned non-gift expenses now show a **Record actual** action after meeting execution. It pre-fills the planned amount, while allowing the user to confirm or adjust the actual amount before submission.
- Issued gifts now appear in Actual Expenses and count toward the expense total and budget validation.
- Gift cost is calculated proportionally from the planned gift quantity and estimated total. For example, issuing 2 of 20 planned diaries with a Rs. 5,000 estimate creates a Rs. 500 actual gift expense.
- Calculated gift expenses are submitted as a Company-paid `gifts` expense line with the rest of the actual expenses.

## Meetings list and interface fixes

- Meeting lists are ordered by meeting date: Needs Action and Scheduled use earliest first, while Completed uses newest first. Records with invalid or missing dates appear last.
- Updated the meeting-list search wording so it no longer references Purpose.
- Made compact meeting time fields keep AM/PM on one line in Meeting Detail.

## Verification and build status

- Android Expo bundle smoke checks passed after the workflow changes.
- App version updated from `1.0.2` to `1.0.3`.
- The internal Expo preview APK has not been queued yet because that action uploads the private project source to Expo and requires explicit approval.
