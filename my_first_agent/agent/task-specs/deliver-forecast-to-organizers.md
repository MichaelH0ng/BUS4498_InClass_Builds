# Deliver the forecast to organizers through the shared dashboard or summary report Task Specification

## Basic Information

- **Task ID:** T9
- **Task name:** Deliver the forecast to organizers through the shared dashboard or summary report
- **Task type:** Act
- **Task owner:** HackTrack forecast pipeline; Michael Hong (system designer) is accountable.

## 1. Task Description

T9 publishes each run's forecast to CPVC organizers so they can plan food, drinks, and swag. It posts the forecast to the shared dashboard and updates the summary report. The rule is fixed: if the forecast was within the threshold, publish it as current; if it was flagged, publish it with the organizer's T8 decision (accepted, overridden, or held) or, if the review is still pending, label it "pending organizer review, not final." T9 never places orders; organizers make the purchasing decision.

## 2. Inputs

### Input 1

- **Input name:** Attendance forecast record
- **Contents and format:** Structured record with run ID, point estimate, confidence range, prior forecast, change, and low reply volume flag.
- **Source:** T6: Generate an updated attendance forecast as a point estimate plus a confidence range (through D3 "No: within threshold") or T8 for flagged forecasts

### Input 2

- **Input name:** Organizer review decision
- **Contents and format:** Structured record with decision, override number and reason when applicable, reviewer name, and timestamp, or "review pending."
- **Source:** T8: Review the flagged change, the investigation findings, and any unresolved question with an organizer (flagged forecasts only)

- **If a required input is missing or invalid:** If the forecast record is missing, do not publish anything; record the run as incomplete so it ends at D4 ("No"). For a flagged forecast with no review decision, publish it labeled "pending organizer review, not final."

## 3. Outputs

### Output 1

- **Output name:** Delivered forecast
- **Contents and format:** Dashboard entry and summary report section with run ID, point estimate, confidence range, change from the prior run, review status, and timestamp.
- **Next task or recipient:** CPVC organizers through the shared dashboard and summary report; stored in HackTrack forecast history as the next run's prior forecast
- **Complete when:** The entry for the current run ID appears on the dashboard and in the summary report, matching the forecast record.

### Output 2

- **Output name:** Delivery status
- **Contents and format:** Structured record with run ID, delivered or failed, channels updated, and error details if any.
- **Next task or recipient:** D4 (Was the updated forecast stored or delivered to organizers?)
- **Complete when:** The status is saved and confirmed by reading back the dashboard entry.

## 4. Planned Tools

### Tool 1

- **Tool name:** `deliver_forecast`
- **Input:** Attendance forecast record; Organizer review decision
- **Output:** Delivered forecast; Delivery status
- **Implementation Route:** Web API calls (write to the shared dashboard and summary report) and database queries (save to forecast history and read back the entry)
- **Integration approach:** Direct integration
- **Role in this task:** Publishes the forecast with its review status to the dashboard and summary report, saves it to forecast history, reads the entry back, and returns the delivery status. This tool changes shared records.
- **Task timeout:** 30 seconds for one task run, including retries.
- **Maximum retries:** 1
- **Retry only when:** The dashboard or report write returns a temporary error (timeout, server error, or rate limit). Wait 5 seconds, then read back whether an entry for this run ID already exists. Retry only if it does not. Each entry is keyed to the run ID and overwrites rather than appends, so a retry cannot create a duplicate forecast.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the delivery status as failed with the error and attempts, and end the run at D4 ("No: Run incomplete, update was not stored or delivered"). If the read-back cannot confirm whether the entry was written, treat the outcome as uncertain, do not retry again, and flag it to the organizer designated for that run. The previous delivered forecast stays in place.
