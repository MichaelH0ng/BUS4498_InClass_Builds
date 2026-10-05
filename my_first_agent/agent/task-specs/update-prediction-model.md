# Update the prediction model with the combined data Task Specification

## Basic Information

- **Task ID:** T5
- **Task name:** Update the prediction model with the combined data
- **Task type:** Learn
- **Task owner:** HackTrack forecast pipeline; Michael Hong (system designer) is accountable.

## 1. Task Description

T5 runs when D1 finds enough confirmation replies to meaningfully update the model. It refits the attendance prediction model on the combined attendance dataset so the model reflects how this event's registrants are actually responding, rather than relying only on the historical 40% rate. The operation is model-supported: a statistical attendance model estimates each response group's likely show-up rate (attending, not attending, unsure, and no reply), anchored to the historical baseline, within a predefined fitting procedure. The fitting procedure, features, and limits are fixed in advance; T5 does not change the procedure or choose new data sources.

## 2. Inputs

### Input 1

- **Input name:** Combined attendance dataset
- **Contents and format:** Structured record with run ID, active registrations, reply counts by response value, reply rate, counts by respondent group/channel, and historical attendance rate.
- **Source:** T3: Combine registration and confirmation data with the historical CPVC attendance-to-registration pattern (~40%), routed through D1 ("Yes: volume sufficient")

### Input 2

- **Input name:** Current model version
- **Contents and format:** Stored model parameters with version number, fit date, and the run ID that produced them.
- **Source:** HackTrack model store (previous successful T5 run, or the initial model built from historical CPVC events)

- **If a required input is missing or invalid:** If the dataset is missing, record the run as incomplete. If the current model version cannot be loaded, refit from the historical baseline only and mark the model "rebuilt from baseline" in the run log.

## 3. Outputs

### Output 1

- **Output name:** Updated prediction model
- **Contents and format:** Model parameters with new version number, run ID, fit date, estimated show-up rate per response group, and fit diagnostics (sample size and goodness of fit).
- **Next task or recipient:** T6: Generate an updated attendance forecast as a point estimate plus a confidence range; stored in the HackTrack model store
- **Complete when:** The new model version is saved under the current run ID, every show-up rate is between 0 and 1, and the fit diagnostics pass the predefined minimum.

## 4. Planned Tools

### Tool 1

- **Tool name:** `update_prediction_model`
- **Input:** Combined attendance dataset; Current model version
- **Output:** Updated prediction model
- **Implementation Route:** Functions/scripts (statistical model fitting) and database queries (read and save model versions)
- **Integration approach:** Direct integration
- **Role in this task:** Loads the current model, refits it on the combined attendance dataset within the predefined procedure, and saves a new model version tagged with the run ID.
- **Task timeout:** 60 seconds for one task run, including retries.
- **Maximum retries:** 1
- **Retry only when:** The model store read or write fails with a temporary database error. Wait 5 seconds before retrying. Do not retry a fit that fails its diagnostics. Model versions are saved under the run ID, so a retry overwrites the same version instead of creating a duplicate.
- **On timeout, exhausted retries, or an error that cannot be retried:** Keep the previous model version, record the failure and diagnostics in the run log, pass nothing new to T6, and record the run as incomplete so it ends at D2 ("No: forecast failed to generate"). Flag the failed run on the shared dashboard for the organizer designated for that run.
