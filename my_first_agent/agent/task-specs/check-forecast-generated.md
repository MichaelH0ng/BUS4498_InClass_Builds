# Did the forecast generate successfully? Task Specification

## Basic Information

- **Task ID:** D2
- **Task name:** Did the forecast generate successfully?
- **Task type:** Verify
- **Task owner:** HackTrack forecast pipeline; Michael Hong (system designer) is accountable.

## 1. Task Description

D2 confirms that T6 produced a usable forecast before anything is compared or delivered. It prevents a broken or empty forecast from reaching organizers. The rule is a fixed validity check: a forecast record exists for the current run ID, the point estimate falls inside its confidence range, and the range falls between 0 and total active registrations. If every check passes, the run continues to D3; otherwise the run stops as incomplete without delivering.

## 2. Inputs

### Input 1

- **Input name:** Attendance forecast record
- **Contents and format:** Structured record with run ID, point estimate, lower and upper bound of the confidence range, prior forecast, and percentage-point change.
- **Source:** T6: Generate an updated attendance forecast as a point estimate plus a confidence range

### Input 2

- **Input name:** Registration count snapshot
- **Contents and format:** Structured record with run ID and total active registrations.
- **Source:** T1: Pull current registration counts accumulated since the last run

- **If a required input is missing or invalid:** A missing or invalid forecast record is itself a "No" result. Record it and stop the run as incomplete.

## 3. Outputs

### Output 1

- **Output name:** Forecast generation check
- **Contents and format:** Structured record with run ID, result ("Yes" or "No"), and the name of any failed validity check.
- **Next task or recipient:** D3 (Does the new forecast shift by more than the set threshold?) on Yes; on No, the end state "Run incomplete: forecast failed to generate; stop without delivering," flagged on the shared dashboard for the organizer designated for that run
- **Complete when:** The result is saved with the current run ID, and a "No" result names the failed check.

## 4. Planned Tools

### Tool 1

- **Tool name:** `check_forecast_generated`
- **Input:** Attendance forecast record; Registration count snapshot
- **Output:** Forecast generation check
- **Implementation Route:** Functions/scripts (validity checks) and database queries (read the forecast record)
- **Integration approach:** Direct integration
- **Role in this task:** Reads the forecast record for this run, applies the validity checks, and returns Yes or No with the reason. It changes no forecast data.
- **Task timeout:** 10 seconds for one task run, including retries.
- **Maximum retries:** 1
- **Retry only when:** Reading the forecast record fails with a temporary database error. Wait 2 seconds before retrying. The check is read-only, so a retry cannot change records.
- **On timeout, exhausted retries, or an error that cannot be retried:** Treat the result as "No," record the error in the run log, stop without delivering, and flag the failed run on the shared dashboard for the organizer designated for that run.
