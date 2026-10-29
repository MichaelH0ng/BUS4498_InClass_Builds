// Club Event Radar: the website.
// Reads published events with supabase-js and sends new posts to the AI agent (the submit-event Edge Function).
(function () {
  "use strict";

  var config = window.EVENT_RADAR_CONFIG || {};
  var board = document.getElementById("board");
  var form = document.getElementById("post-form");
  var textarea = document.getElementById("announcement");
  var postButton = document.getElementById("post-button");
  var resultBox = document.getElementById("result");
  var refreshButton = document.getElementById("refresh");
  var filterBar = document.getElementById("filters");

  // Only these columns are granted to visitors (see the Stage 4 migration).
  var COLUMNS = "id, created_at, status, title, club, event_date, start_time, end_time, place_name, place_detail, cost, free_food, summary";

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  var events = [];
  var filter = "all";
  var client = null;

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

    postButton.disabled = true;
    postButton.textContent = "Checking your post…";
    resultBox.replaceChildren();

    try {
      var data = new FormData();
      data.append("announcement", text);
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
        if (status === "published" || status === "waiting") textarea.value = "";
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
    loadEvents();
  }

  start();
})();
