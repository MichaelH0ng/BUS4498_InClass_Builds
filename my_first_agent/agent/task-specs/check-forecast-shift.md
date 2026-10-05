# Does the new forecast shift by more than the set threshold (e.g. more than 10 percentage points) from the prior run? Task Specification

## Basic Information

- **Task ID:** D3
- **Task name:** Does the new forecast shift by more than the set threshold (e.g. more than 10 percentage points) from the prior run?
- **Task type:** Decide
- **Task owner:** HackTrack forecast pipeline; Michael Hong (system designer) is accountable.

## 1. Task Description

D3 decides whether a new forecast can go straight to organizers or needs investigation and human review first. Large swings are the forecasts most likely to cause bad purchasing decisions, so they are routed to T7 and then T8. The rule is a fixed comparison: the change between the new and prior forecast, expressed in percentage points of active registrations, is compared with the configured threshold (10 percentage points). A change above the threshold routes to T7 with a forecast shift alert; anything at or below it, or a first run with no prior forecast, routes to T9.

## 2. Inputs

### Input 1

- **Input name:** Attendance forecast record
- **Contents and format:** Structured record with run ID, point estimate, confidence range, prior forecast, and percentage-point change.
- **Source:** T6: Generate an updated attendance forecast as a point estimate plus a confidence range, confirmed by D2

### Input 2

- **Input name:** Shift threshold
- **Contents and format:** Single configured value in percentage points with the date it was last changed.
- **Source:** HackTrack configuration set by Michael Hong (system designer)

- **If a required input is missing or invalid:** If the threshold is missing, route to T7 (the cautious path) and note "default routing used" in the run log. If the percentage-point change cannot be calculated because no prior forecast exists, route to T9.

## 3. Outputs

### Output 1

- **Output name:** Forecast shift alert
- **Contents and format:** Structured record with run ID, current forecast, prior forecast, and the percentage-point difference that tripped the threshold.
- **Next task or recipient:** T7: Investigate cause of shift (only when the threshold is exceeded)
- **Complete when:** The alert is saved with the current run ID and its difference is greater than the threshold.

### Output 2

- **Output name:** Shift decision
- **Contents and format:** Structured record with run ID, percentage-point change, threshold, and result ("Yes: exceeds threshold" or "No: within threshold").
- **Next task or recipient:** T7: Investigate cause of shift (Yes) or T9: Deliver the forecast to organizers through the shared dashboard or summary report (No)
- **Complete when:** The decision is saved with the current run ID and exactly one route is selected.

## 4. Planned Tools

### Tool 1

- **Tool name:** `check_forecast_shift`
- **Input:** Attendance forecast record; Shift threshold
- **Output:** Forecast shift alert; Shift decision
- **Implementation Route:** Functions/scripts (threshold comparison)
- **Integration approach:** Direct integration
- **Role in this task:** Compares the percentage-point change with the threshold, returns the routing decision, and creates the forecast shift alert when the threshold is exceeded.
- **Task timeout:** 5 seconds for one task run.
- **Maximum retries:** 0
- **Retry only when:** Not applicable
- **On timeout, exhausted retries, or an error that cannot be retried:** Route the forecast to T7 so it receives investigation and organizer review rather than being published unchecked, and record the error in the run log.
