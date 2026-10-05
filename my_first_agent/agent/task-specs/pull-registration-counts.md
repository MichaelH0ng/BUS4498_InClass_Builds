# Pull current registration counts accumulated since the last run Task Specification

## Basic Information

- **Task ID:** T1
- **Task name:** Pull current registration counts accumulated since the last run
- **Task type:** Retrieve
- **Task owner:** HackTrack forecast pipeline; Michael Hong (system designer) is accountable.

## 1. Task Description

T1 starts every scheduled forecast run. It reads the hackathon registration records from CPVC's RSVP form platform and produces a snapshot of the current registration total plus the registrations added since the previous run. The workflow needs this because every later step (combining data, updating the model, and generating the forecast) starts from an accurate registration count. The rule is fixed: count active registrations, exclude canceled or duplicate entries by registration ID, and timestamp the snapshot. Only registration fields needed for counting are read, in line with the system boundary of using no participant data beyond registration and RSVP replies.

## 2. Inputs

### Input 1

- **Input name:** Run trigger
- **Contents and format:** Structured record with the run ID, run timestamp, and the timestamp of the previous successful run.
- **Source:** Scheduled forecast-update job (workflow trigger)

### Input 2

- **Input name:** Registration records
- **Contents and format:** Table of registrations with registration ID, registration timestamp, status (active or canceled), and respondent group/channel.
- **Source:** CPVC's RSVP form platform

- **If a required input is missing or invalid:** Do not produce a partial count. Record the missing input and error in the run log; because no forecast can be generated, the run ends at D2 ("No: Run incomplete: forecast failed to generate; stop without delivering"). Flag the failed run on the shared dashboard for the organizer designated for that run. The next scheduled run starts fresh.

## 3. Outputs

### Output 1

- **Output name:** Registration count snapshot
- **Contents and format:** Structured record with run ID, snapshot timestamp, total active registrations, new registrations since the last run, cancellations since the last run, and counts by respondent group/channel.
- **Next task or recipient:** T2: Collect confirmation-nudge replies received since the last run, then T3: Combine registration and confirmation data with the historical CPVC attendance-to-registration pattern (~40%)
- **Complete when:** The snapshot is saved with the current run ID and its total matches the number of active, de-duplicated registration IDs read from the platform.

## 4. Planned Tools

### Tool 1

- **Tool name:** `pull_registration_counts`
- **Input:** Run trigger; Registration records
- **Output:** Registration count snapshot
- **Implementation Route:** Web API calls (read-only request to the RSVP form platform) and functions/scripts (de-duplicate and count)
- **Integration approach:** Direct integration
- **Role in this task:** Reads registration records from the RSVP form platform, removes canceled and duplicate entries, and returns the registration count snapshot. It changes no records.
- **Task timeout:** 30 seconds for one task run, including retries.
- **Maximum retries:** 2
- **Retry only when:** The RSVP form platform returns a temporary error (timeout, server error, or rate limit). Wait 5 seconds between attempts. Do not retry denied access or an invalid form ID. The tool is read-only, so retries cannot create duplicate records.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the error type and attempts in the run log and do not pass a partial count to T2 or T3; the run ends at D2 ("No: Run incomplete: forecast failed to generate; stop without delivering"). Flag the failed run on the shared dashboard for the organizer designated for that run. Do not continue as if registrations were counted.
