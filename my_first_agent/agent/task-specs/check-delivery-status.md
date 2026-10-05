# Was the updated forecast stored or delivered to organizers? Task Specification

## Basic Information

- **Task ID:** D4
- **Task name:** Was the updated forecast stored or delivered to organizers?
- **Task type:** Verify
- **Task owner:** HackTrack forecast pipeline; Michael Hong (system designer) is accountable.

## 1. Task Description

D4 confirms that the run actually reached organizers, which is the workflow's completion condition. A run only counts as complete when the updated forecast is saved and visible on the shared dashboard or summary report. The rule is a fixed status check: the delivery status from T9 says "delivered," and reading back the dashboard shows an entry for this run ID that matches the forecast record. If both are true, the run is complete; otherwise it stops as incomplete.

## 2. Inputs

### Input 1

- **Input name:** Delivery status
- **Contents and format:** Structured record with run ID, delivered or failed, channels updated, and error details if any.
- **Source:** T9: Deliver the forecast to organizers through the shared dashboard or summary report

### Input 2

- **Input name:** Delivered forecast
- **Contents and format:** Dashboard entry and summary report section for the current run ID.
- **Source:** Shared dashboard and summary report (written by T9)

- **If a required input is missing or invalid:** A missing delivery status or dashboard entry is itself a "No" result. Record it and stop the run as incomplete.

## 3. Outputs

### Output 1

- **Output name:** Run outcome
- **Contents and format:** Structured record with run ID, result ("Run complete" or "Run incomplete: update was not stored or delivered"), and the reason for any failure.
- **Next task or recipient:** End state "Run complete" (and the next scheduled run) on Yes; on No, the end state "Run incomplete: update was not stored or delivered," flagged to the organizer designated for that run
- **Complete when:** The run outcome is saved with the current run ID.

## 4. Planned Tools

### Tool 1

- **Tool name:** `check_delivery_status`
- **Input:** Delivery status; Delivered forecast
- **Output:** Run outcome
- **Implementation Route:** Web API calls (read back the dashboard entry) and database queries (read the delivery status and save the run outcome)
- **Integration approach:** Direct integration
- **Role in this task:** Reads T9's delivery status, confirms the dashboard entry for this run, and records whether the run is complete. It does not deliver or edit the forecast.
- **Task timeout:** 15 seconds for one task run, including retries.
- **Maximum retries:** 1
- **Retry only when:** The dashboard read-back fails with a temporary error. Wait 5 seconds before retrying. The check is read-only, so a retry cannot create a duplicate entry.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the run as incomplete because delivery could not be confirmed, and flag it to the organizer designated for that run. Do not report the run as complete.
