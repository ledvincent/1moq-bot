---
type: Integration
title: Google Sheets
description: The owner's lead sheet, read-only through the Sheets API v4 with a company service account the sheet is shared with; how to set up the Google Cloud project and key, the error answers, quotas, and the personal data it carries
owner: vincent.ledreau@dirox.net
status: stable
tags: [sourcing, google-sheets, personal-data]
---
# Google Sheets

## What we use it for

- Reading the owner's lead sheet (the first tab only) on Sync now and every day at 06:00 Asia/Ho_Chi_Minh; new rows become [leads](/domain/lead.md) waiting for review. Nothing is written to the sheet (writing status back is a later ticket).
- Why a sheet and why this way: [Google Sheet lead source](/decisions/MOQ-31-google-sheet-lead-source.md).

Specs: `openspec/specs/lead-sourcing/spec.md`. Code: `src/sourcing/google-sheet-source.ts` behind `SheetSource`, the fake in `src/sourcing/fake-sheet-source.ts`; tests never call Google.

## How we connect

- **Google Cloud project** owned by the company, with the Google Sheets API enabled. No billing account is needed for the read quotas used here.
- **Service account** in that project, with no project roles. Create a JSON key for it (IAM → Service accounts → Keys → Add key → JSON), then base64-encode the file on one line (`base64 -w0 service-account.json`, `base64 -i service-account.json` on a Mac) into the secret `GOOGLE_SERVICE_ACCOUNT_KEY`: `.env` locally, `app.env` in `/etc/1moq/` in the production stack ([settings and secrets](/decisions/MOQ-3-settings-and-secrets.md)). Delete the downloaded JSON file afterwards. The setting is optional: without it the tool starts, Settings says Google access is not set up, and a sync fails with that reason. An invalid value stops the start, naming the setting.
- **Sharing**: the owner shares the sheet with the service account's email (shown on Settings) as **Viewer**, and pastes the sheet's link on Settings (any tab or `gid`: only the spreadsheet id is kept).
- **Requests**: an access token from `google-auth-library` with the `spreadsheets.readonly` scope only, then two GETs per sync with a 20-second time-out: the tab list, then the first tab's formatted values, rows 1 to 5,002.
- **Revoking**: delete the key in Google Cloud (the tool then fails with "Google refused the tool's access key"), or unshare the sheet.

## Limits and failure

| Google answers | The owner sees on Find leads |
|---|---|
| 403 | The sheet is not shared with the tool. Share it with <service account email> as Viewer. |
| 404, or 400 on the spreadsheet id | The sheet cannot be found. Check the link on Settings. |
| Time-out, network error, 429 or 5xx | Google could not be reached. Try again later. |
| 401, or an invalid key | Google refused the tool's access key. The service account key needs checking. |
| No key set | The tool's Google access is not set up. |

- A failed sync keeps nothing and is not retried: the owner clicks Sync now again, or the next daily sync runs.
- **Size**: more than 5,000 rows below the header fails the sync with "The sheet has more than 5,000 rows".
- **Quotas and cost**: two read requests per sync, far inside the Sheets API's free per-minute read quota; no charge.
- **Personal data**: the rows hold owners' and founders' names, email addresses and free-text notes. Google is a data processor ([personal data handling](/decisions/MOQ-1-personal-data-handling.md)); the tool stores the values as facts of the lead, and the sync report and the logs hold row numbers and reasons only, never a cell value. Sheet text is data: shown as text, never followed as instructions. Not deployed to production before sign-in (MOQ-4).

## Contacts

- Google Cloud project and service account owner on the company side: TODO (not set up yet; needed before the first real sync).
