# Club Event Radar: handoff notes for Ethan

## 1. What works now

Live website: https://michaelh0ng.github.io/BUS4498_InClass_Builds/event_radar/

- Anyone can read the published events, soonest first, and filter for free food.
- A club officer pastes an announcement (and, optionally, a JPG or PNG flyer up to 5 MB). The AI agent turns it into an event card and checks the posting rules in `context/posting-rules.md`.
- The code decides what happens: **published** (it's on the board), **waiting** (a moderator must look), **rejected** (not an event), or **duplicate** (same date, start time, and place as a live post).
- Any post with a photo always waits for a moderator.
- A moderator signs in at the bottom of the event list, sees the waiting posts with the reason and the original text, and clicks **Approve** or **Reject**.

## 2. Where things live

- **GitHub repository:** `MichaelH0ng/BUS4498_InClass_Builds`, in the `event_radar` folder. GitHub Pages serves it from `main` and `/ (root)`.
- **Supabase project:** `event-radar`. Project URL: https://cnhzrjtgivwtgrzigkpz.supabase.co
- **Files that matter:**
  - `index.html`, `app.js`, `style.css`: the website. `config.js` holds the Project URL and the publishable key (both public).
  - `supabase/functions/submit-event/index.ts`: the AI agent (an Edge Function).
  - `supabase/migrations/`: the database changes, one file per stage (the `events` table, flyer photos, moderator sign-in).
  - `context/`: the posting rules and the campus place list.
  - `test/`: sample posts and what each should do.
  - `AGENTS.md`: instructions your AI assistant reads first.

## 3. Secrets

Names only. You don't need any values to work on this.

- `ANTHROPIC_API_KEY`: the AI key. Set in Supabase → Edge Functions → Secrets.
- `HOLD_ALL_POSTS` (optional): set to `true` to make every new post wait.
- `OPENAI_API_KEY` (optional): used only if there is no Claude key.

Never put a key, a password, or an `.env` file in this repository. It is public.

## 4. How to test

Use the posts in `test/sample-announcements.md`.

- **Post A:** published, with free food. Sending it a second time answers "duplicate" (the database refuses the copy).
- **Post D:** waiting. It is off campus, mentions alcohol, and has a Venmo handle and a phone number. Neither of those two appears on the card.
- **Post F:** not posted, because a textbook sale isn't an event.

Heads-up: the sample dates are in early November 2026. Once a date passes, the agent holds that post as "waiting" because the date has passed. The table already holds test rows, so post A will say "duplicate" until you delete the old test row (Supabase → Table Editor → `events`).

Tested so far: A, A twice, D, and the sample flyer (it waited, then was approved). Not tested yet: B, C, E, F, and the bonus post that tries to give the AI orders.

## 5. What's next

- Run the untested sample posts and write down the results.
- The nightly clean-up (the optional stage in `AGENTS.md`) isn't set up, so past events stay on the board until someone archives them.
- Sending a photo bigger than about 5.4 MB straight to the agent makes the request hang. The website blocks files over 5 MB first, so only someone calling the agent directly can hit it.
- The posting rules and the place list are copied into `index.ts`. If you change `context/`, change `index.ts` too and redeploy the agent.
- There is one moderator account. Add another in Supabase → Authentication → Users → Add user. Keep **Allow new users to sign up** turned off: any signed-in user can approve posts.
- Ideas: let clubs edit or withdraw a post, tell a club why its post was rejected, show past events in an archive.

## 6. How we take turns

1. Before you start, download the latest: open GitHub Desktop, **Fetch origin**, then **Pull**.
2. Message each other before you start and when you stop, so we never edit the same file at once.
3. When you stop, **Commit** and **Push**. Check the changed-files list first: if a name has `secret` or `.env`, stop and ask the instructor.
4. Supabase changes (the database and the agent) take effect immediately and are not part of Git. After changing either, save the change in `supabase/` and push it, so the files always match what is running.
