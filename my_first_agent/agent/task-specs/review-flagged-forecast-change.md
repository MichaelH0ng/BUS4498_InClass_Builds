# Review the flagged change, the investigation findings, and any unresolved question with an organizer before the forecast is treated as final Task Specification

## Basic Information

- **Task ID:** T8
- **Task name:** Review the flagged change, the investigation findings, and any unresolved question with an organizer before the forecast is treated as final
- **Task type:** Decide
- **Task owner:** The CPVC organizer designated for that run's review

## 1. Task Description

T8 is the human-review checkpoint for any forecast that shifted by more than the set threshold. The organizer reviews the new forecast, the prior forecast, and T7's investigation findings, then decides whether the new number should be treated as final. The organizer's judgment is not delegated: they decide to accept the forecast, override it with a stated number and reason, or hold the previous forecast until the next run. This protects CPVC from buying food, drinks, and swag based on a volatile number that has no explanation.

## 2. Inputs

### Input 1

- **Input name:** Attendance forecast record
- **Contents and format:** Structured record with point estimate, confidence range, prior forecast, and percentage-point change.
- **Source:** T6: Generate an updated attendance forecast as a point estimate plus a confidence range, flagged by D3

### Input 2

- **Input name:** Investigation deliverable
- **Contents and format:** T7's outbound deliverable with status, result or "undetermined," evidence summary, subtasks performed, unresolved issues, and handoff note.
- **Source:** T7: Investigate cause of shift

- **If a required input is missing or invalid:** If the investigation deliverable is missing, the organizer reviews the forecast record alone and the review packet labels the investigation "not available." If the forecast record is missing, there is nothing to review; record the run as incomplete.

## 3. Outputs

### Output 1

- **Output name:** Organizer review decision
- **Contents and format:** Structured record with run ID, decision (accept, override, or hold previous), override number and reason when applicable, reviewer name, and decision timestamp.
- **Next task or recipient:** T9: Deliver the forecast to organizers through the shared dashboard or summary report
- **Complete when:** A decision is recorded with the reviewer's name, and an override includes both a number and a reason.

## 4. Planned Tools

### Tool 1

- **Tool name:** `record_review_decision`
- **Input:** Attendance forecast record; Investigation deliverable
- **Output:** Organizer review decision
- **Implementation Route:** Database queries (read the forecast and investigation records and save the decision) and web API calls (show the review packet on the shared dashboard)
- **Integration approach:** Direct integration
- **Role in this task:** Shows the organizer the flagged forecast and T7's findings in one review packet on the shared dashboard and saves the decision the organizer enters. The tool does not make the decision.
- **Task timeout:** Organizer response deadline: before the next scheduled forecast run (within 24 hours, or 12 hours during the final 48 hours before the hackathon).
- **Maximum retries:** Not applicable — manual task.
- **Retry only when:** Not applicable
- **On timeout, exhausted retries, or an error that cannot be retried:** If no decision is recorded by the deadline, record the status "review pending" and pass the forecast to T9 labeled "pending organizer review, not final." The last approved forecast remains the planning number, and the pending review carries forward on the dashboard until an organizer decides.
