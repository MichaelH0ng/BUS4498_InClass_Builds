// Club Event Radar: the website.
// Reads published events with supabase-js and sends new posts to the AI agent (the submit-event Edge Function).
(function () {
  "use strict";

  var config = window.EVENT_RADAR_CONFIG || {};
  var board = document.getElementById("board");
  var form = document.getElementById("post-form");
  var textarea = document.getElementById("announcement");
  var flyerInput = document.getElementById("flyer");
  var postButton = document.getElementById("post-button");
  var resultBox = document.getElementById("result");
  var refreshButton = document.getElementById("refresh");
  var filterBar = document.getElementById("filters");
  var modForm = document.getElementById("mod-form");
  var modEmail = document.getElementById("mod-email");
  var modPassword = document.getElementById("mod-password");
  var modSignInButton = document.getElementById("mod-signin-button");
  var modSignIn = document.getElementById("mod-signin");
  var modMessage = document.getElementById("mod-message");
  var modPanel = document.getElementById("mod-panel");
  var modWho = document.getElementById("mod-who");
  var modNote = document.getElementById("mod-note");
  var modBoard = document.getElementById("mod-board");
  var modSignOut = document.getElementById("mod-signout");

  // Only these columns are granted to visitors (see the Stage 4 migration).
  var COLUMNS = "id, created_at, status, title, club, event_date, start_time, end_time, place_name, place_detail, cost, free_food, summary, flyer_url";
  var MAX_FLYER_BYTES = 5 * 1024 * 1024;

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  var events = [];
  var filter = "all";
  var client = null;
  var moderatorId = "";
  var moderatorEmail = "";

  // Everything shown from user text goes through textContent, never innerHTML.
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== "") node.textContent = text;
    return node;
  }

  function parseDate(value) {
    var parts = String(value || "").split("-").map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function formatTime(value) {
    if (!value) return "";
    var parts = String(value).split(":").map(Number);
    var hour = parts[0];
    var minute = parts[1] || 0;
    var suffix = hour >= 12 ? "PM" : "AM";
    var hour12 = hour % 12 || 12;
    return hour12 + ":" + (minute < 10 ? "0" : "") + minute + " " + suffix;
  }

  function whenText(event, date) {
    var pieces = [];
    if (date) pieces.push(DAYS[date.getDay()] + ", " + MONTHS[date.getMonth()] + " " + date.getDate());
    var start = formatTime(event.start_time);
    var end = formatTime(event.end_time);
    if (start && end) pieces.push(start + " to " + end);
    else if (start) pieces.push(start);
    return pieces.join(" · ");
  }

  function renderEvent(event) {
    var item = el("li", "event");
    var date = parseDate(event.event_date);

    var dateBox = el("div", date ? "date" : "date tba");
    if (date) {
      dateBox.appendChild(el("span", "mon", MONTHS[date.getMonth()]));
      dateBox.appendChild(el("span", "day", String(date.getDate())));
    } else {
      dateBox.appendChild(el("span", "day", "TBA"));
    }
    item.appendChild(dateBox);

    var body = el("div", "event-body");
    var when = whenText(event, date);
    if (when) body.appendChild(el("p", "when", when));
    body.appendChild(el("h3", "", event.title || "Untitled event"));

    var place = [event.place_name, event.place_detail].filter(Boolean).join(", ");
    var meta = [event.club, place].filter(Boolean).join(" · ");
    if (meta) body.appendChild(el("p", "meta", meta));
    if (event.summary) body.appendChild(el("p", "summary", event.summary));

    var tags = el("p", "tags");
    if (event.cost) tags.appendChild(el("span", "tag", event.cost));
    if (event.free_food) tags.appendChild(el("span", "tag food", "🍕 Free food"));
    if (tags.childNodes.length) body.appendChild(tags);

    item.appendChild(body);

    // Show a flyer only if its link points into this project's public flyers bucket.
    var flyerPrefix = config.supabaseUrl + "/storage/v1/object/public/flyers/";
    if (event.flyer_url && String(event.flyer_url).indexOf(flyerPrefix) === 0) {
      var flyer = el("img", "flyer");
      flyer.src = event.flyer_url;
      flyer.alt = "Flyer for " + (event.title || "this event");
      flyer.loading = "lazy";
      item.appendChild(flyer);
    }
    return item;
  }

  function showMessage(text) {
    board.replaceChildren(el("li", "empty", text));
  }

  function renderBoard() {
    var shown = filter === "food" ? events.filter(function (e) { return e.free_food; }) : events;
    if (shown.length === 0) {
      showMessage(filter === "food" ? "No free-food events right now." : "No events yet. Post the first one!");
      return;
    }
    board.replaceChildren.apply(board, shown.map(renderEvent));
  }

  async function loadEvents() {
    if (!client) return;
    refreshButton.disabled = true;
    var response = await client
      .from("events")
      .select(COLUMNS)
      .eq("status", "published")
      .order("event_date", { ascending: true, nullsFirst: false })
      .order("start_time", { ascending: true, nullsFirst: false });
    refreshButton.disabled = false;
    if (response.error) {
      console.error(response.error);
      showMessage("Couldn't load the events. Please try Refresh in a moment.");
      return;
    }
    events = response.data || [];
    renderBoard();
  }

  var LABELS = {
    published: "Posted!",
    waiting: "Waiting for a moderator",
    rejected: "Not posted",
    duplicate: "Already posted",
    error: "Something went wrong",
  };

  function showResult(kind, message, reasons) {
    var box = el("div", "result " + kind);
    box.appendChild(el("p", "result-label", LABELS[kind] || LABELS.error));
    if (message) box.appendChild(el("p", "", message));
    if (reasons && reasons.length) {
      var list = el("ul", "reasons");
      reasons.forEach(function (reason) { list.appendChild(el("li", "", reason)); });
      box.appendChild(list);
    }
    resultBox.replaceChildren(box);
  }

  async function sendPost(event) {
    event.preventDefault();
    var text = textarea.value.trim();
    if (!text) {
      showResult("error", "Please write an announcement first.");
      return;
    }

    var photo = flyerInput.files && flyerInput.files[0];
    if (photo) {
      if (photo.type !== "image/jpeg" && photo.type !== "image/png") {
        showResult("error", "Please choose a JPG or PNG photo.");
        return;
      }
      if (photo.size > MAX_FLYER_BYTES) {
        showResult("error", "That photo is over 5 MB. Please choose a smaller one.");
        return;
      }
    }

    postButton.disabled = true;
    postButton.textContent = "Checking your post…";
    resultBox.replaceChildren();

    try {
      var data = new FormData();
      data.append("announcement", text);
      if (photo) data.append("flyer", photo);
      // The publishable key goes only on the apikey header (no Authorization header).
      var response = await fetch(config.supabaseUrl + "/functions/v1/submit-event", {
        method: "POST",
        headers: { apikey: config.publishableKey },
        body: data,
      });
      var answer = await response.json();

      if (!answer.ok) {
        showResult("error", answer.message || "The agent couldn't take this post.");
      } else {
        var status = LABELS[answer.status] ? answer.status : "error";
        showResult(status, answer.message, answer.reasons);
        if (status === "published" || status === "waiting") {
          textarea.value = "";
          flyerInput.value = "";
        }
        if (status === "published") loadEvents();
      }
    } catch (error) {
      console.error(error);
      showResult("error", "Couldn't reach the agent. Check your internet connection and try again.");
    } finally {
      postButton.disabled = false;
      postButton.textContent = "Post event";
    }
  }

  // ---------- moderator sign-in ----------
  // Visitors can only read published posts. A signed-in moderator can read every post and approve or reject it.

  function showModNote(kind, label, message) {
    var box = el("div", "result " + kind);
    box.appendChild(el("p", "result-label", label));
    if (message) box.appendChild(el("p", "", message));
    return box;
  }

  function renderReview(event) {
    var item = renderEvent(event);
    var review = el("div", "review");
    review.appendChild(el("p", "why", event.status_reason || "Waiting for a moderator."));
    if (event.note_for_moderator) review.appendChild(el("p", "muted", "Note: " + event.note_for_moderator));
    review.appendChild(el("p", "original", event.announcement));

    var actions = el("p", "actions");
    var approve = el("button", "", "Approve");
    var reject = el("button", "ghost", "Reject");
    approve.type = "button";
    reject.type = "button";
    approve.addEventListener("click", function () { decide(event.id, "published", [approve, reject]); });
    reject.addEventListener("click", function () { decide(event.id, "rejected", [approve, reject]); });
    actions.appendChild(approve);
    actions.appendChild(reject);
    review.appendChild(actions);

    item.querySelector(".event-body").appendChild(review);
    return item;
  }

  async function loadWaiting() {
    var response = await client
      .from("events")
      .select("*")
      .eq("status", "waiting")
      .order("created_at", { ascending: true });
    if (response.error) {
      console.error(response.error);
      modBoard.replaceChildren(el("li", "empty", "Couldn't load the waiting posts. Please sign in again."));
      return;
    }
    var rows = response.data || [];
    if (rows.length === 0) {
      modBoard.replaceChildren(el("li", "empty", "Nothing is waiting for review."));
      return;
    }
    modBoard.replaceChildren.apply(modBoard, rows.map(renderReview));
  }

  async function decide(id, status, buttons) {
    buttons.forEach(function (button) { button.disabled = true; });
    modNote.replaceChildren();
    var changes = { status: status, reviewed_at: new Date().toISOString(), reviewed_by: moderatorEmail };
    if (status === "published") changes.status_reason = "";
    var response = await client.from("events").update(changes).eq("id", id).select("id");
    if (response.error || !response.data || response.data.length !== 1) {
      console.error(response.error);
      modNote.replaceChildren(showModNote("error", "Not saved", "Couldn't save that decision. Please sign in again and try once more."));
      buttons.forEach(function (button) { button.disabled = false; });
      return;
    }
    await Promise.all([loadWaiting(), loadEvents()]);
  }

  function showModerator(session) {
    var user = session && session.user ? session.user : null;
    var id = user ? user.id : "";
    if (id === moderatorId) return;
    moderatorId = id;
    moderatorEmail = user ? user.email || "" : "";
    modSignIn.hidden = !!user;
    modPanel.hidden = !user;
    modNote.replaceChildren();
    if (user) {
      modWho.textContent = "Signed in as " + moderatorEmail + ".";
      loadWaiting();
    } else {
      modBoard.replaceChildren();
    }
  }

  async function signIn(event) {
    event.preventDefault();
    modMessage.replaceChildren();
    modSignInButton.disabled = true;
    modSignInButton.textContent = "Signing in…";
    var response = await client.auth.signInWithPassword({
      email: modEmail.value.trim(),
      password: modPassword.value,
    });
    modSignInButton.disabled = false;
    modSignInButton.textContent = "Sign in";
    if (response.error) {
      modMessage.replaceChildren(showModNote("error", "Couldn't sign in", "Check the email and password and try again."));
      return;
    }
    modPassword.value = "";
  }

  function setFilter(event) {
    var chip = event.target.closest("[data-filter]");
    if (!chip) return;
    filter = chip.getAttribute("data-filter");
    filterBar.querySelectorAll("[data-filter]").forEach(function (other) {
      other.setAttribute("aria-pressed", other === chip ? "true" : "false");
    });
    renderBoard();
  }

  function start() {
    if (!config.supabaseUrl || !config.publishableKey) {
      showMessage("This website isn't set up yet: config.js needs the Project URL and the publishable key.");
      postButton.disabled = true;
      return;
    }
    if (!window.supabase || !window.supabase.createClient) {
      showMessage("Couldn't load the events library. Check your internet connection and reload.");
      return;
    }
    client = window.supabase.createClient(config.supabaseUrl, config.publishableKey);
    form.addEventListener("submit", sendPost);
    refreshButton.addEventListener("click", loadEvents);
    filterBar.addEventListener("click", setFilter);
    modForm.addEventListener("submit", signIn);
    modSignOut.addEventListener("click", function () { client.auth.signOut(); });
    // Run the screen update on the next tick: supabase-js asks callbacks not to call it again directly.
    client.auth.onAuthStateChange(function (eventName, session) {
      setTimeout(function () { showModerator(session); }, 0);
    });
    loadEvents();
  }

  start();
})();
