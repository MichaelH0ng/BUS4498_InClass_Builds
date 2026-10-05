# Is confirmation-response volume high enough to meaningfully update the model? Task Specification

## Basic Information

- **Task ID:** D1
- **Task name:** Is confirmation-response volume high enough to meaningfully update the model?
- **Task type:** Decide
- **Task owner:** HackTrack forecast pipeline; Michael Hong (system designer) is accountable.

## 1. Task Description

D1 decides which forecasting path the run takes. If too few registrants have answered the confirmation nudge, updating the model would overreact to a small, unrepresentative sample, so the run goes to T4 to lean on the historical baseline. If enough have answered, the run goes to T5 to update the model. The rule is a fixed comparison: the reply rate (replies divided by active registrations) is compared with the minimum reply rate set in HackTrack configuration (for example, 30% of active registrations). At or above the minimum routes to T5; below it routes to T4.

## 2. Inputs

### Input 1

- **Input name:** Combined attendance dataset
- **Contents and format:** Structured record with run ID, active registrations, reply counts by response value, and reply rate.
- **Source:** T3: Combine registration and confirmation data with the historical CPVC attendance-to-registration pattern (~40%)

### Input 2

- **Input name:** Minimum reply rate
- **Contents and format:** Single configured percentage with the date it was last changed.
- **Source:** HackTrack configuration set by Michael Hong (system designer)

- **If a required input is missing or invalid:** If the dataset is missing or the reply rate cannot be calculated, record the error in the run log; the run ends at D2 ("No: Run incomplete: forecast failed to generate; stop without delivering"). Flag the failed run on the shared dashboard for the organizer designated for that run. If the minimum reply rate is missing, route to T4 (the conservative path) and note "default routing used" in the run log.

## 3. Outputs

### Output 1

- **Output name:** Reply volume decision
- **Contents and format:** Structured record with run ID, reply rate, minimum reply rate, and result ("Yes: volume sufficient" or "No: volume too low / sample unrepresentative").
- **Next task or recipient:** T5: Update the prediction model with the combined data (Yes) or T4: Weight the historical baseline more heavily (No)
- **Complete when:** The decision is saved with the current run ID and exactly one route is selected.

## 4. Planned Tools

### Tool 1

- **Tool name:** `check_reply_volume`
- **Input:** Combined attendance dataset; Minimum reply rate
- **Output:** Reply volume decision
- **Implementation Route:** Functions/scripts (threshold comparison)
- **Integration approach:** Direct integration
- **Role in this task:** Compares the reply rate with the minimum reply rate and returns the routing decision. It changes no records other than saving the decision for this run.
- **Task timeout:** 5 seconds for one task run.
- **Maximum retries:** 0
- **Retry only when:** Not applicable
- **On timeout, exhausted retries, or an error that cannot be retried:** Route to T4: Weight the historical baseline more heavily (the conservative path) and note "default routing used" in the run log so the organizer can see it on the dashboard.
