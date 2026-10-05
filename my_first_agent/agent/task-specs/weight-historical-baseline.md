# Weight the historical baseline more heavily Task Specification

## Basic Information

- **Task ID:** T4
- **Task name:** Weight the historical baseline more heavily
- **Task type:** Reason
- **Task owner:** HackTrack forecast pipeline; Michael Hong (system designer) is accountable.

## 1. Task Description

T4 is the exception path used when D1 finds that confirmation-reply volume is too low to meaningfully update the model, for example when most registrants have not yet answered the nudge. Instead of letting a small, unrepresentative sample swing the forecast, T4 applies a fixed reweighting formula that gives the historical attendance rate more influence than the current replies. The rule is explicit: the weight on current replies equals the reply rate divided by the D1 minimum reply rate (always below 1 on this path), and the remaining weight goes to the historical baseline. The weights and reply rate are recorded so organizers can see why the forecast leaned on history.

## 2. Inputs

### Input 1

- **Input name:** Combined attendance dataset
- **Contents and format:** Structured record with run ID, active registrations, reply counts, reply rate, historical attendance rate, and baseline expected attendance.
- **Source:** T3: Combine registration and confirmation data with the historical CPVC attendance-to-registration pattern (~40%), routed through D1 ("No: volume too low")

### Input 2

- **Input name:** Low-volume weighting rule
- **Contents and format:** Structured configuration with the D1 minimum reply rate and the reweighting formula.
- **Source:** HackTrack configuration set by Michael Hong (system designer)

- **If a required input is missing or invalid:** If the dataset or weighting rule is missing, record the run as incomplete in the run log and flag it on the shared dashboard for the organizer designated for that run. Do not fall back to raw registrations.

## 3. Outputs

### Output 1

- **Output name:** Baseline-weighted attendance dataset
- **Contents and format:** The combined attendance dataset plus the reply weight, baseline weight, and a "low reply volume" flag.
- **Next task or recipient:** T6: Generate an updated attendance forecast as a point estimate plus a confidence range
- **Complete when:** The dataset is saved with the current run ID, the reply weight and baseline weight sum to 1, and the low reply volume flag is set.

## 4. Planned Tools

### Tool 1

- **Tool name:** `weight_historical_baseline`
- **Input:** Combined attendance dataset; Low-volume weighting rule
- **Output:** Baseline-weighted attendance dataset
- **Implementation Route:** Functions/scripts (fixed reweighting formula)
- **Integration approach:** Direct integration
- **Role in this task:** Applies the reweighting formula to the combined attendance dataset and returns the baseline-weighted dataset. It writes only the new dataset for this run.
- **Task timeout:** 10 seconds for one task run.
- **Maximum retries:** 0
- **Retry only when:** Not applicable
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the run as incomplete with the error in the run log, pass nothing to T6, and flag the failed run on the shared dashboard for the organizer designated for that run.
