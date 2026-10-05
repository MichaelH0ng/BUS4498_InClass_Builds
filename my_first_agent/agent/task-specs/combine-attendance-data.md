# Combine registration and confirmation data with the historical CPVC attendance-to-registration pattern (~40%) Task Specification

## Basic Information

- **Task ID:** T3
- **Task name:** Combine registration and confirmation data with the historical CPVC attendance-to-registration pattern (~40%)
- **Task type:** Reason
- **Task owner:** HackTrack forecast pipeline; Michael Hong (system designer) is accountable.

## 1. Task Description

T3 merges the current registration snapshot, the confirmation replies, and CPVC's historical attendance-to-registration rate (about 40% at the last build event) into one combined attendance dataset. The workflow needs one consistent dataset so D1 can judge reply volume and the model (T4 or T5, then T6) can forecast from a single source. The rule is explicit math: calculate the reply rate (replies divided by active registrations), the share of each response value, and the baseline expected attendance (active registrations multiplied by the historical rate). No judgment or model is used.

## 2. Inputs

### Input 1

- **Input name:** Registration count snapshot
- **Contents and format:** Structured record with run ID, total active registrations, and counts by respondent group/channel.
- **Source:** T1: Pull current registration counts accumulated since the last run

### Input 2

- **Input name:** RSVP confirmation responses
- **Contents and format:** Table of latest replies per registration ID with response value and respondent group/channel, plus summary counts.
- **Source:** T2: Collect confirmation-nudge replies received since the last run

### Input 3

- **Input name:** Historical attendance pattern
- **Contents and format:** Structured record of past CPVC events with registrations, actual attendance, and the resulting attendance-to-registration rate.
- **Source:** CPVC's historical event records (maintained by CPVC organizers)

- **If a required input is missing or invalid:** If either current input is missing or the run IDs do not match, stop and record the run as incomplete in the run log. If the historical record is unavailable, use the documented default rate of 40% and label the dataset "default baseline used" so the organizer sees it on the dashboard.

## 3. Outputs

### Output 1

- **Output name:** Combined attendance dataset
- **Contents and format:** Structured record with run ID, active registrations, reply counts by response value, reply rate, counts by respondent group/channel, historical attendance rate and its source, and baseline expected attendance.
- **Next task or recipient:** D1 (Is confirmation-response volume high enough?), then T4: Weight the historical baseline more heavily or T5: Update the prediction model with the combined data
- **Complete when:** The dataset is saved with the current run ID, all fields are populated, and reply counts do not exceed active registrations.

## 4. Planned Tools

### Tool 1

- **Tool name:** `combine_attendance_data`
- **Input:** Registration count snapshot; RSVP confirmation responses; Historical attendance pattern
- **Output:** Combined attendance dataset
- **Implementation Route:** Functions/scripts (deterministic calculations) and database queries (read historical event records)
- **Integration approach:** Direct integration
- **Role in this task:** Joins the three inputs by run ID, calculates the reply rate and baseline expected attendance, and returns the combined attendance dataset. It writes only the new dataset for this run.
- **Task timeout:** 20 seconds for one task run, including retries.
- **Maximum retries:** 1
- **Retry only when:** The historical records read fails with a temporary database error. Wait 2 seconds before retrying. Calculation errors are not retried. The dataset is saved under the run ID, so a retry overwrites the same record instead of creating a duplicate.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the run as incomplete with the failed step in the run log, pass nothing to D1, and flag the failed run on the shared dashboard for the organizer designated for that run.
