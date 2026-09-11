# Workflow of Tasks

*Replace all bracketed prompts with information specific to your proposed system. Delete instructional text that does not belong in your final specification. Add or remove task sections as needed. Every task shown in the general workflow must have a corresponding task specification below.*

## 1. Workflow Overview
### 1.1 Workflow Goal
This workflow supports the system goal defined in `my_first_agent/README.md`.

### 1.2 Workflow Trigger

The workflow begins each time a scheduled forecast-update job runs, once per day during the two weeks leading up to the hackathon (with runs becoming more frequent, such as twice daily, in the final 48 hours). Each run is triggered by the calendar schedule, not by any single registration or reply, and pulls in whatever new registration and confirmation-response data has accumulated since the previous run.

### 1.3 Completion Condition at Runtime

One run is complete when the system has produced an updated attendance forecast, a point estimate plus a range, based on the latest registration and confirmation data, and has saved or delivered that forecast to organizers. This holds whether or not the new forecast differs from the previous run's number. The run is not considered complete if the forecast fails to generate or the update isn't stored/delivered.

### 1.4 General Workflow

In the normal path, the system pulls current registration counts and any confirmation-nudge replies received since the last run, then combines that data with the historical attendance-to-registration pattern from past CPVC events (currently around 40%). It updates its prediction model with this combined data and generates an updated attendance forecast, expressed as a point estimate and a confidence range, then delivers that forecast to organizers through a shared dashboard or summary report.

The most important exception occurs when confirmation-response volume is too low to meaningfully update the model (for example, most participants haven't replied to the nudge yet). In that case, the system falls back to weighting the historical baseline more heavily rather than overreacting to a small, unrepresentative sample. A second exception is a human-review checkpoint: whenever a new forecast shifts by more than a set threshold (for instance, more than 10 percentage points) from the prior run, the system flags the change for an organizer to review before it's treated as final, rather than auto-publishing a volatile number. Organizers always make the final food/drink/swag purchasing decision; the workflow's job is to hand them a reliable, updated number, not to place orders itself.

### 1.5 Workflow Diagram


```mermaid
flowchart TD
TRIGGER([" Scheduled forecast-update job runs on the calendar schedule: once daily during the two weeks before the hackathon, and twice daily in the final 48 hours "]) --> T1
T1[" T1: Pull current registration counts accumulated since the last run "] --> T2
T2[" T2: Collect confirmation-nudge replies received since the last run "] --> T3
T3[" T3: Combine registration and confirmation data with the historical CPVC attendance-to-registration pattern (~40%) "] --> D1
D1{" D1: Is confirmation-response volume high enough to meaningfully update the model? "}
D1 -- " No: volume too low / sample unrepresentative " --> T4[" T4: Weight the historical baseline more heavily "]
D1 -- " Yes: volume sufficient " --> T5[" T5: Update the prediction model with the combined data "]
T4 --> T6
T5 --> T6
T6[" T6: Generate an updated attendance forecast as a point estimate plus a confidence range "] --> D2
D2{" D2: Did the forecast generate successfully? "}
D2 -- " No " --> STOP1([" Run incomplete: forecast failed to generate; stop without delivering "])
D2 -- " Yes " --> D3
D3{" D3: Does the new forecast shift by more than the set threshold (e.g. more than 10 percentage points) from the prior run? "}
D3 -- " Yes: exceeds threshold " --> T7[" T7: Flag the forecast change for organizer review "]
D3 -- " No: within threshold " --> T9
T7 --> T8[" T8: Review the flagged change with an organizer before the forecast is treated as final "]
T8 --> T9[" T9: Deliver the forecast to organizers through the shared dashboard or summary report "]
T9 --> D4{" D4: Was the updated forecast stored or delivered to organizers? "}
D4 -- " No " --> STOP2([" Run incomplete: update was not stored or delivered "])
D4 -- " Yes " --> DONE([" Run complete: updated forecast (point estimate plus range) saved and delivered to organizers, whether or not it differs from the prior run "])
DONE --> NOTE[" Organizers make the final food, drink, and swag purchasing decision; the workflow hands them the number and does not place orders "]
DONE -.-> |" Next scheduled run pulls newly accumulated registration and confirmation data "| TRIGGER
```
