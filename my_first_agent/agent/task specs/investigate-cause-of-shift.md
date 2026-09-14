Investigate Shift Task Specification

```yaml
# BASIC INFORMATION
task_id: "T7"
task_name: "Investigate cause of shift"
task_owner: "Michael Hong"
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
- **Result or recommendation:** The completed result. If the task was escalated before reaching a supported result, write undetermined.
- **Evidence summary:**  The most important evidence supporting the result or explaining why no result could be reached.
- **Subtasks performed:**  The permitted subtasks completed, including repeated attempts.
- **Unresolved issues:**  Remaining uncertainties or questions. Write none only when the task has been completed successfully.
- **Handoff note:** Reason for stopping, unresolved questions, and what the reviewer needs to decide; write “Not applicable” for a completed task.
- **Next task or recipient:** T8 (Review with organizer) in all cases. On completed status, the organizer reviews the identified cause before the forecast is finalized. On escalated status, the organizer reviews the unresolved findings via the same review step.
