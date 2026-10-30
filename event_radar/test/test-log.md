# Week 9 test log: Club Event Radar

- Student: @MichaelH0ng
- Website: https://michaelh0ng.github.io/BUS4498_InClass_Builds/event_radar/
- Folder: https://github.com/MichaelH0ng/BUS4498_InClass_Builds/tree/main/event_radar
- Teammate: @arlowe928-lab
- Written by the BUS 4498 Hosting Builder on Oct 30, 2026, 4:04 PM.

## Builder checks

| Check | Result | When |
|---|---|---|
| Database | Passed. Visitors can read published events from the database (0 so far). Visitors can’t change the database. Only the agent can. | 5:14 PM |
| AI agent | Passed. The agent is running, and it has your AI key: Claude (claude-haiku-5-5). | 5:31 PM |
| Website (GitHub Pages) | Passed. Your website opens at https://michaelh0ng.github.io/BUS4498_InClass_Builds/event_radar/ config.js holds only the Project URL and the publishable key, with no secret key. | 5:58 PM |
| Photo uploads | Passed. The post is waiting for a moderator, as it should (rule R9). The agent read the date from the photo (Wednesday, November 11). The photo is saved in Supabase Storage. | 6:06 PM |
| New sign-ups turned off | Passed. New sign-ups are off: only the accounts you create can sign in. | 6:13 PM |

## Test posts

| Post | Expected | What happened |
|---|---|---|
| A. A clean post | Published. Thursday, November 5, 7:00 PM to 10:00 PM, University Union (UU), Room 220, Free, free food. | published (then duplicate the second time): Your event is posted. It's on the board now. |
| B. A messy group-chat post | Published for tomorrow at 6:00 PM at the UU Plaza. Not tagged as free food, because "snacks maybe??" doesn't clearly promise free food (rule R7). | Not sent |
| C. The same event as A, reworded by another officer | Already posted. Same date, start time, and place as post A, so the database refuses a second copy. Post A first. | Not sent |
| D. A post that breaks several rules | Waiting for a moderator. Off campus (R3), alcohol (R4), a personal payment handle (R5), and a personal phone number (R6). The phone number and Venmo handle stay off the card. | Not sent |
| E. A post with missing details | Waiting for a moderator, asking for the date, start time, and place (R2). | Not sent |
| F. Not an event | Not posted. It's a sale, not an event (R1). | Not sent |
| X. a post that tries to give the AI orders | Waiting for a moderator. The agent treats the post as data, not as instructions (this comes back in Week 10). | Not sent |
| flyer. Flyer photo (Stage 7) | Waiting for a moderator, because posts with a photo are checked first (R9). The card should read the flyer: Sustainability Crew Clothing Swap, Wednesday, November 11, 11:00 AM to 2:00 PM, Dexter Lawn, Free. After a moderator approves it, it appears on the website with the photo. | waiting: Your post is saved, and a moderator will look at it before it appears. |

## My answers

**Sending post A twice:** Second send: the database stopped the copy, not the AI agent. The agent built the same dedupe_key, and the unique index refused the second row with error 23505. The agent only turned that refusal into a “duplicate” answer. The AI was still called on the second send, so it cost a little credit.

**What I approved and rejected:** Kickoff Party: The agent held it for four reasons: off campus, alcohol (BYOB), a personal Venmo handle, and a personal phone number.

**The hand-off:** (not answered)
