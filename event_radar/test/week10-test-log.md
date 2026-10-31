# Week 10 test log: what Club Event Radar knows and remembers

- Student: @michaelh0ng
- Website: https://michaelh0ng.github.io/BUS4498_InClass_Builds/event_radar/
- Folder: https://github.com/michaelh0ng/BUS4498_InClass_Builds/tree/main/event_radar
- Chat app: GroupMe
- Written by the BUS 4498 Memory Builder on Oct 30, 2026, 6:24 PM.

## Builder checks

| Check | Result | When |
|---|---|---|
| Week 9 build ready | Passed. The events table is there, and visitors can read published posts. The agent is running with your AI key: Claude (claude-haiku-5-5). New sign-ups are off. Your website opens at https://michaelh0ng.github.io/BUS4498_InClass_Builds/event_radar/ | 4:46 PM |
| Chat-group reader | Passed. The reader has its GroupMe secrets. GroupMe accepts the token, and the group or channel is visible to the bot. It has run once and set its bookmark. Last run: 4:32 PM. A bot ID is set, so the group gets a reply for each post. | 4:41 PM |
| Club list | Not run |  |
| Lessons table | Passed. Visitors can’t read the lessons: they’re for moderators only. A visitor can’t write a lesson, so no post can teach the agent. Only a signed-in moderator can. The agent reads the lessons: 0 lessons are switched on right now. | 5:57 PM |

## Test posts

| Post | Expected | What happened | What the agent looked at |
|---|---|---|---|
| A. A nickname | Published, with the club shown as Board Game Guild: the agent matched the nickname "BGG" on the club list. | Not sent |  |
| B. A club that isn't on the list | Waiting for a moderator, because "Cal Poly Kite Flyers" isn't on the club list yet. | Not sent |  |
| C. The new club's next post | Published, with the club shown as Cal Poly Kite Flyers. You changed what the agent knows without touching the code. | Not sent |  |
| D. A known club, no place | Waiting for a moderator, because the place is missing (rule R2). The reason adds a hint from the club list: Board Game Guild usually meets at University Union (UU), Room 220. The agent didn't fill the place in: knowledge about a club in general isn't a fact about this event. | Not sent |  |
| E. The original post | Published for Tuesday, November 3 at 6:00 PM at the UU Plaza. | Not sent |  |
| F. An update | Published, replacing E. The agent checked the club's upcoming posts, saw that this updates "pitch practice," and copied the place from the earlier post. The earlier card leaves the website. | Not sent |  |
| G. A reminder that changes nothing | Already posted. A reminder isn't an update, and the database's duplicate check (same date, start time, and place as F) refuses a second copy. | Not sent |  |
| H. Something the rules don't cover | Published. The posting rules don't say anything about study hours, so to the agent it looks like an event. Now teach it: sign in as a moderator and save this lesson: *Drop-in study hours, tutoring, and office hours aren't events for this website. Hold them for a moderator.* | Not sent |  |
| I. The next one, after the lesson | Waiting for a moderator, citing your lesson. | Not sent |  |
| J. A post that tries to teach the agent | Waiting for a moderator. Your lesson still applies, and the post is flagged for trying to give the AI instructions. Check Table Editor → lessons: there is still only the lesson you wrote. A post can't teach the agent, because only signed-in moderators can write lessons. | Not sent |  |
| K. After you switch the lesson off | Published. The agent forgot the lesson the moment you switched it off. Switch it back on when you're done. | Not sent |  |

## My answers

**The demo (Step 1):** The agent didnt understand what the follow-up was associated with, it was short-term memory.

**The fix (Step 2):** (not answered)

**My chat group (Step 4):** My first post reached the website in about 7 seconds: it was posted in the group at about 11:47:25 PM UTC, and the agent saved and published the card at 11:47:32 PM UTC. The bot replied about 6 seconds after the post, and the message the reader is programmed to send for a published event is ‘Thanks Michael! Your event “Board Game Night” is on the board.’ The agent made the card from the text, with the club shown as Board Game Guild, on Tuesday, November 3 at 7:00 PM at the University Union.

**Knowledge (Step 5):** Between post B and post C, the only thing that changed was one new row in the clubs table, which I added in the Table Editor: Cal Poly Kite Flyers, with the nicknames ‘kite flyers, kite club.’ Post B (7:55 PM) waited because the club list had 6 clubs and the agent noted ‘Cal Poly Kite Flyers is not on the list.’ Post C (8:04 PM) published with the club shown as Cal Poly Kite Flyers, because the agent read the list again, now 7 clubs, and noted that it matched ‘kite flyers’ to that club. I redeployed nothing, since the agent loads the club list from the database on every post and the code was the same for both.

**Memory (Step 6):** Before it replaced post E, the agent read the club list (7 clubs) and matched Mustang Pitch Society. It read the one earlier chat message from Michael Hong, and it checked 1 upcoming post from that club, ‘Pitch Practice’ on 2026-11-03 at 6:00 PM at UU Plaza, and decided F updates it. F said only ‘same place’, yet the UU Plaza on F’s card was already filled in when the agent saved it, because the AI read E’s text in the chat context, so the code had no place left to copy from E’s database record. E was then marked replaced, and F went up as the one published Pitch Practice card at 7:00 PM.

**Lessons (Step 7):** Post J waited for a moderator at 6:14 PM: it was not published and not rejected, and the saved reason lists two holds, the study-hours lesson and ‘The post tries to give the AI instructions, so a moderator should look at it. Only moderators can teach the agent.’ It couldn’t create a lesson because the agent only reads the lessons table and never writes to it, and only a signed-in moderator account can add a lesson, so text inside a post has no way to become one. The lessons table still holds just the one lesson I wrote myself, with created_by mkhong@calpoly.edu.
