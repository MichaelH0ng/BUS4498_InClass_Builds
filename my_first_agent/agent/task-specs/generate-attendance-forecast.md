# Generate an updated attendance forecast as a point estimate plus a confidence range Task Specification

## Basic Information

- **Task ID:** T6
- **Task name:** Generate an updated attendance forecast as a point estimate plus a confidence range
- **Task type:** Reason
- **Task owner:** HackTrack forecast pipeline; Michael Hong (system designer) is accountable.

## 1. Task Description

T6 produces the number organizers plan around: an expected attendance point estimate and a confidence range. It applies the prediction model to the current data. On the normal path it applies the updated model from T5 to the combined attendance dataset; on the low-volume path it applies the current stored model to the baseline-weighted dataset from T4. The operation is model-supported: the model multiplies each response group's count by its estimated show-up rate, sums the result for the point estimate, and calculates the range from the model's uncertainty. T6 also attaches the prior run's forecast and the percentage-point change so D3 can check whether the shift exceeds the threshold.

## 2. Inputs

### Input 1

- **Input name:** Combined attendance dataset
- **Contents and format:** Structured record with run ID, active registrations, reply counts by response value, reply rate, counts by respondent group/channel, and historical attendance rate.
- **Source:** T3: Combine registration and confirmation data with the historical CPVC attendance-to-registration pattern (~40%) (normal path, after T5)

### Input 2

- **Input name:** Baseline-weighted attendance dataset
- **Contents and format:** Combined attendance dataset plus reply weight, baseline weight, and low reply volume flag.
- **Source:** T4: Weight the historical baseline more heavily (low-volume path)

### Input 3

- **Input name:** Updated prediction model
- **Contents and format:** Model parameters with version number, run ID, and estimated show-up rate per response group.
- **Source:** T5: Update the prediction model with the combined data (normal path); on the low-volume path, the current model version from the HackTrack model store

### Input 4

- **Input name:** Prior forecast
- **Contents and format:** Structured record of the last delivered forecast with run ID, point estimate, and confidence range.
- **Source:** HackTrack forecast history (the previous run's Delivered forecast from T9: Deliver the forecast to organizers through the shared dashboard or summary report)

- **If a required input is missing or invalid:** Each run needs one dataset (Input 1 on the normal path or Input 2 on the low-volume path) and a model (Input 3). If either is missing, record the error in the run log; the run ends at D2 ("No: Run incomplete: forecast failed to generate; stop without delivering"). If no prior forecast exists (first run), set the change to "not applicable" and continue.

## 3. Outputs

### Output 1

- **Output name:** Attendance forecast record
- **Contents and format:** Structured record with run ID, point estimate, lower and upper bound of the confidence range, model version or "baseline-weighted" label, low reply volume flag, prior forecast, and percentage-point change from the prior run.
- **Next task or recipient:** D2 (Did the forecast generate successfully?), then D3 (Does the new forecast shift by more than the set threshold?), then T7: Investigate cause of shift or T9: Deliver the forecast to organizers through the shared dashboard or summary report
- **Complete when:** The record is saved with the current run ID, the point estimate falls inside its range, and the range falls between 0 and total active registrations.

## 4. Planned Tools

### Tool 1

- **Tool name:** `generate_attendance_forecast`
- **Input:** Combined attendance dataset or Baseline-weighted attendance dataset; Updated prediction model; Prior forecast
- **Output:** Attendance forecast record
- **Implementation Route:** Functions/scripts (apply the model and calculate the confidence range) and database queries (read the prior forecast and save the new record)
- **Integration approach:** Direct integration
- **Role in this task:** Applies the model to the current data, calculates the point estimate, range, and change from the prior forecast, and saves the attendance forecast record for this run.
- **Task timeout:** 30 seconds for one task run, including retries.
- **Maximum retries:** 1
- **Retry only when:** Reading the prior forecast or saving the new record fails with a temporary database error. Wait 2 seconds before retrying. Do not retry a forecast that fails the validity checks. The record is saved under the run ID, so a retry overwrites the same record instead of creating a duplicate.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the failure in the run log and end the run at D2 ("No: Run incomplete, forecast failed to generate; stop without delivering"). The previous delivered forecast stays in place, and the failed run is flagged on the shared dashboard for the organizer designated for that run.
