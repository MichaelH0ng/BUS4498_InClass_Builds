# Collect confirmation-nudge replies received since the last run Task Specification

## Basic Information

- **Task ID:** T2
- **Task name:** Collect confirmation-nudge replies received since the last run
- **Task type:** Retrieve
- **Task owner:** HackTrack forecast pipeline; Michael Hong (system designer) is accountable.

## 1. Task Description

T2 gathers the structured replies registrants submitted to the confirmation nudge (attending, not attending, or unsure) since the previous run. The workflow needs these replies because they are the strongest current signal of who will actually show up, and T7 later uses them to check whether declines are concentrated in one group. The rule is fixed: collect each reply with its registration ID, response value, timestamp, and respondent group/channel; keep only the latest reply per registration ID. No free text is interpreted. Receiving zero new replies is a valid result, not a failure; D1 decides whether reply volume is enough to update the model.

## 2. Inputs

### Input 1

- **Input name:** Registration count snapshot
- **Contents and format:** Structured record with run ID, snapshot timestamp, and registration counts by respondent group/channel.
- **Source:** T1: Pull current registration counts accumulated since the last run

### Input 2

- **Input name:** Confirmation reply records
- **Contents and format:** Table of nudge replies with registration ID, response value (attending, not attending, unsure), reply timestamp, and respondent group/channel.
- **Source:** CPVC's RSVP form platform (confirmation nudge responses)

- **If a required input is missing or invalid:** If the reply records cannot be read, record the run as incomplete in the run log and flag it on the shared dashboard for the organizer designated for that run. Do not treat unreadable replies as zero replies.

## 3. Outputs

### Output 1

- **Output name:** RSVP confirmation responses
- **Contents and format:** Table with run ID, registration ID, latest response value, reply timestamp, and respondent group/channel, plus summary counts of attending, not attending, unsure, and no reply.
- **Next task or recipient:** T3: Combine registration and confirmation data with the historical CPVC attendance-to-registration pattern (~40%); also read by T7: Investigate cause of shift when a shift is flagged
- **Complete when:** The table is saved with the current run ID, each registration ID appears at most once, and summary counts equal the row totals.

## 4. Planned Tools

### Tool 1

- **Tool name:** `collect_confirmation_replies`
- **Input:** Registration count snapshot; Confirmation reply records
- **Output:** RSVP confirmation responses
- **Implementation Route:** Web API calls (read-only request to the RSVP form platform) and functions/scripts (keep latest reply per registration ID and summarize)
- **Integration approach:** Direct integration
- **Role in this task:** Reads nudge replies received since the last run, keeps the latest reply per registration, attaches respondent group/channel, and returns the RSVP confirmation responses table. It changes no records.
- **Task timeout:** 30 seconds for one task run, including retries.
- **Maximum retries:** 2
- **Retry only when:** The RSVP form platform returns a temporary error (timeout, server error, or rate limit). Wait 5 seconds between attempts. Do not retry denied access or an invalid form ID. The tool is read-only, so retries cannot create duplicate replies.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the run as incomplete with the error type and attempts in the run log, do not pass partial reply data to T3, and flag the failed run on the shared dashboard for the organizer designated for that run.
