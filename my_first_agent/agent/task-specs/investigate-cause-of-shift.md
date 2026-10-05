Investigate Shift Task Specification

```yaml
# BASIC INFORMATION
task_id: "T7"
task_name: "Investigate cause of shift"
task_owner: "Michael Hong"

# Agent Inference Configuration
Provider: Groq
Model: "openai/gpt-oss-120b"
Role: Interpret the forecast shift alert and supplied signal data, select the next permitted check, and produce the evidence-backed cause finding for T8.
Maximum inference requests per task run: 4
On inference failure or exhausted limits: Record the unresolved status and hand the case to the organizer designated for that run's review (T8), via the shared dashboard or summary report queue.
```

## 1. Task Goal

- **Objective:** For Cal Poly Vibe Coding organizers, reduce the number of large, unexplained forecast swings that reach human review without any supporting evidence, measured by the percentage of flagged shifts (D3 triggers) that arrive at organizer review (T8) with an identified cause versus none, moving from 0% (no investigation currently happens) to at least 60%, without exceeding the 3-check investigation limit or accessing anything beyond the approved signal sources.


## 2. Inbound Inputs

### Input 1
- **Input name:** Forecast shift alert
- **What it contains:** The current forecast, prior forecast, and percentage-point difference that tripped the threshold
- **Source:** D3 (Shift exceeds threshold?)

### Input 2
- **Input name:** Campus event calendar data
- **What it contains:** Upcoming campus events, dates, and locations near the hackathon date
- **Source:** Cal Poly's official campus events calendar

### Input 3
- **Input name:** RSVP confirmation responses
- **What it contains:** Individual confirmation replies with respondent group/channel, for spotting a concentrated decline pattern
- **Source:** T2 (Collect confirmations)

### Input 4
- **Input name:** Promotion channel status
- **What it contains:** RSVP link status and recent posts on CPVC's official social accounts
- **Source:** CPVC's official social media accounts and RSVP form platform

## 3. Tool Permissions and Boundaries

### Task-Wide Limits

- **Total task timeout:** 60 seconds for one task run, including tool calls, retries, and reasoning. A tool call or retry does not restart this clock.
- **Maximum tool calls:** 4 calls across all tools during one task run; retries count toward this total. This allows one call per permitted check plus one retry, and the 3-check investigation limit and subtask retry limits in Section 4 still apply.

Tools may use only the approved signal sources listed in Section 2 for this flagged shift. They may not search other websites, contact event organizers, respondents, or platform support, post or edit on any account, alter RSVP records, or change the forecast. All three tools are read-only, so retries cannot create duplicate records or messages. The agent interprets tool findings and prepares the Section 6 deliverable; the tools do not decide the cause.

### Tool 1

- **Tool name:** `check_competing_events`
- **Input:** Forecast shift alert; Campus event calendar data
- **Output:** Competing event finding (event name, date, location, and overlap with the hackathon date) for the Evidence summary; unreachable, missing, or ambiguous calendar data for Unresolved issues
- **Implementation Route:** Web API calls (read-only request to the official Cal Poly campus events calendar feed)
- **Integration approach:** Direct integration
- **Role in this task:** Supports Permitted Subtask 1: Check competing events
- **Task timeout:** Subject to the 60-second total task deadline. Each call may take at most 10 seconds or the remaining task time, whichever is shorter.
- **Maximum retries:** 1
- **Retry only when:** The calendar feed returns a temporary error (timeout, server error, or rate limit). Wait 2 seconds and retry only if call budget and time remain. Do not retry denied access, an invalid feed address, or a successful response that simply shows no competing event. The tool is read-only, so a retry creates no duplicates.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the failed source, attempted operation, failure type, and attempts in Subtasks performed and Unresolved issues. Do not treat an unreachable calendar as "no competing event found." Move to another permitted subtask if one can still make useful progress; otherwise set Status to "escalated to human," set Result or recommendation to "undetermined," and hand the case to the organizer designated for that run's review (T8) via the shared dashboard or summary report queue.

### Tool 2

- **Tool name:** `analyze_reply_concentration`
- **Input:** Forecast shift alert; RSVP confirmation responses
- **Output:** Reply concentration finding ("not attending" counts by respondent group/channel and whether declines are concentrated in one group) for the Evidence summary; missing, incomplete, or conflicting response data for Unresolved issues
- **Implementation Route:** Database queries and functions/scripts (read the confirmation responses already collected by T2 and group decline counts by respondent group/channel)
- **Integration approach:** Direct integration
- **Role in this task:** Supports Permitted Subtask 2: Check reply concentration
- **Task timeout:** Subject to the 60-second total task deadline. Each call may take at most 10 seconds or the remaining task time, whichever is shorter.
- **Maximum retries:** 1
- **Retry only when:** A temporary read error on the T2 response records prevents completion. Wait 2 seconds and retry only if call budget and time remain. Do not retry denied access or confirmed missing response data. The tool is read-only, so a retry does not alter response records.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the affected input, attempted operation, failure type, and attempts in Subtasks performed and Unresolved issues. Do not treat unreadable response data as "no concentrated decline." Move to another permitted subtask if one can still make useful progress; otherwise set Status to "escalated to human," set Result or recommendation to "undetermined," and hand the case to the organizer designated for that run's review (T8) via the shared dashboard or summary report queue.

### Tool 3

- **Tool name:** `check_promotion_status`
- **Input:** Forecast shift alert; Promotion channel status
- **Output:** Promotion channel finding (whether the RSVP link is working and whether recent official CPVC posts show unusual activity, such as a viral post) for the Evidence summary; unreachable accounts or unclear link status for Unresolved issues
- **Implementation Route:** Web API calls (read-only HTTP status check of the RSVP link and read-only requests for recent public posts on CPVC's official social accounts)
- **Integration approach:** Direct integration
- **Role in this task:** Supports Permitted Subtask 3: Check promotion status
- **Task timeout:** Subject to the 60-second total task deadline. Each call may take at most 10 seconds or the remaining task time, whichever is shorter.
- **Maximum retries:** 1
- **Retry only when:** The RSVP platform or social account returns a temporary error (timeout, server error, or rate limit). Wait 2 seconds and retry only if call budget and time remain. Do not retry denied access or an account that no longer exists. A confirmed broken RSVP link is a finding, not a tool error, and is not retried. The tool is read-only and cannot post, edit, or interact with any account.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the affected channel, attempted operation, failure type, and attempts in Subtasks performed and Unresolved issues. Do not report a tool failure as an RSVP link outage. Move to another permitted subtask if one can still make useful progress; otherwise set Status to "escalated to human," set Result or recommendation to "undetermined," and hand the case to the organizer designated for that run's review (T8) via the shared dashboard or summary report queue.

## 4. How the Agent Should Reason

### Permitted Subtask 1
- **Subtask name:** Check competing events
- **Subtask description:** Examines the campus event calendar for events near the hackathon date that could pull attendees away. Produces a finding of whether a competing event exists and how likely it is to overlap with the hackathon.
- **Subtask boundary:** May only read the official Cal Poly campus events calendar. May not contact event organizers, students, or any other party. May not alter the forecast directly.
- **Retry limits:** 1 attempt. If no competing event is found, the agent moves to another permitted subtask rather than re-checking the same calendar.

### Permitted Subtask 2
- **Subtask name:** Check reply concentration
- **Subtask description:** Examines RSVP confirmation responses grouped by respondent group/channel to determine whether "not attending" replies are concentrated in one group. Produces a finding of whether a concentrated decline pattern exists and, if so, which group it's tied to.
- **Subtask boundary:** May only read confirmation response data already collected by T2. May not contact respondents directly. May not alter response records.
- **Retry limits:** 1 attempt.

### Permitted Subtask 3
- **Subtask name:** Check promotion status
- **Subtask description:** Examines RSVP link status and recent posts on CPVC's official social accounts for a technical issue (broken link) or unusual activity (viral post) that could explain the shift. Produces a finding of whether a promotion-channel issue exists.
- **Subtask boundary:** May only read RSVP link status and public posts on official CPVC accounts. May not post, edit, or interact with any account. May not contact platform support.
- **Retry limits:** 1 attempt.

- **Decision guidance:** After each subtask, use its findings to select the permitted subtask most likely to resolve the most important remaining uncertainty. Do not follow a fixed sequence. If no permitted subtask can make useful progress, stop and hand the case to a person.

## 5. When to Stop or Hand Off to a Human

- **Stop successfully when:** A supported cause has been identified for the forecast shift, backed by a specific finding from at least one permitted subtask (e.g., a confirmed competing event on the hackathon date, a confirmed decline concentrated in one respondent group, or a confirmed RSVP link outage or viral post), and that finding is recorded along with which subtask produced it. A "no clear signal found" result after using the full check budget is not a successful stop — see the hand-off condition below.
- **Hand off early when:** Any of the following occurs — (1) the 3-check budget is exhausted without a supported cause being identified, (2) a subtask surfaces evidence outside its permitted read-only scope (e.g., a finding that would require contacting a person or editing a record), or (3) a subtask fails to run (e.g., the calendar feed or RSVP platform is unreachable) and no other permitted subtask can make useful progress.
- **Hand off to:** The organizer designated for that run's review (the same organizer role referenced in T8 of the workflow), via the shared dashboard or summary report queue used for forecast delivery.

## 6. Outbound Deliverable

- **Status:** completed or escalated to human.
- **Result or recommendation:** The identified cause of the forecast shift (competing campus event, decline concentrated in one respondent group, or promotion-channel issue), stated in one sentence with the subtask that produced it. If the task was escalated before a supported cause was found, write undetermined.
- **Evidence summary:** The specific finding behind the result and its source: competing event name, date, and overlap from the campus calendar; "not attending" counts by respondent group from T2 responses; or RSVP link status and post activity from CPVC's official accounts. For an escalation, what each check found or why it could not run.
- **Subtasks performed:** Each permitted check run, in order, with its finding and any retry or tool failure.
- **Unresolved issues:** Checks not run, unreachable sources, or ambiguous findings. Write none only when the task has been completed successfully.
- **Handoff note:** Why the investigation stopped, the open question, and what the organizer needs to decide at T8 (for example, accept the shift as real, override it, or wait for the next run); write "Not applicable" for a completed task.
- **Next task or recipient:** T8 (Review with organizer) in all cases. On completed status, the organizer reviews the identified cause before the forecast is finalized. On escalated status, the organizer reviews the unresolved findings via the same review step.
