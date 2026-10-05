# Has a supported cause been identified, has the check limit (3 checks) been reached, or can no remaining check make progress? Task Specification

## Basic Information

- **Task ID:** D5
- **Task name:** Has a supported cause been identified, has the check limit (3 checks) been reached, or can no remaining check make progress?
- **Task type:** Decide
- **Task owner:** HackTrack forecast pipeline; Michael Hong (system designer) is accountable.

## 1. Task Description

D5 decides after each T7 check whether the investigation should continue or move to organizer review. It keeps the agent from looping indefinitely and enforces the 3-check limit. The rule is a fixed stopping condition: stop when T7 has recorded a supported cause, when 3 checks have been used, or when T7 reports that no remaining permitted check can make progress (for example, every remaining source is unreachable). If none of these is true, the run returns to T7 for the next check. D5 does not judge whether a cause is correct; it only reads T7's recorded status.

## 2. Inputs

### Input 1

- **Input name:** Investigation progress record
- **Contents and format:** Structured record with run ID, checks completed so far, whether a supported cause has been recorded, and whether any remaining check can make progress.
- **Source:** T7: Investigate cause of shift

- **If a required input is missing or invalid:** If the progress record is missing or unreadable, stop the investigation and route to T8 with the status "investigation status unknown" so the organizer reviews the shift without relying on an incomplete record.

## 3. Outputs

### Output 1

- **Output name:** Investigation stop decision
- **Contents and format:** Structured record with run ID, checks used, result ("Yes" or "No: no cause yet and another approved check can still make progress"), and which stop condition applied.
- **Next task or recipient:** T8: Review the flagged change, the investigation findings, and any unresolved question with an organizer before the forecast is treated as final (Yes) or T7: Investigate cause of shift (No)
- **Complete when:** The decision is saved with the current run ID, exactly one route is selected, and a "Yes" result names the stop condition.

## 4. Planned Tools

### Tool 1

- **Tool name:** `check_investigation_stop`
- **Input:** Investigation progress record
- **Output:** Investigation stop decision
- **Implementation Route:** Functions/scripts (stopping-condition check)
- **Integration approach:** Direct integration
- **Role in this task:** Reads T7's progress record, applies the three stop conditions, and returns whether to continue investigating or move to organizer review.
- **Task timeout:** 5 seconds for one task run.
- **Maximum retries:** 0
- **Retry only when:** Not applicable
- **On timeout, exhausted retries, or an error that cannot be retried:** Stop the investigation and route to T8 with the status "investigation status unknown," recording the error in the run log. Do not return to T7, so the 3-check limit cannot be exceeded.
