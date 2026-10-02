(() => {
  "use strict";
  if (new URLSearchParams(location.search).has("visual-preview")) return;

  const app = window.APP;
  if (!app) throw new Error("The experience layer requires the trip app.");
  const byId = id => document.getElementById(id);
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const icon = paths => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const searchIcon = icon('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>');
  const closeIcon = icon('<path d="m6 6 12 12M18 6 6 18"/>');
  const rail = byId("rail");
  const sheet = byId("sheet");
  const daycard = byId("daycard");
  const bar = byId("bar");
  const top = document.querySelector(".top");
  const phone = matchMedia("(max-width: 899px)").matches;
  const dateLabel = date => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", timeZone: "UTC"
  });

  const tripButton = element("button", "comfort-trip");
  tripButton.type = "button";
  tripButton.setAttribute("aria-haspopup", "dialog");
  tripButton.setAttribute("aria-controls", "trip-overview");
  tripButton.setAttribute("aria-expanded", "false");
  tripButton.innerHTML = '<span class="comfort-trip-copy"><b>Your trip</b><small>All days at a glance</small></span>' +
    icon('<path d="m8 10 4 4 4-4"/>');
  top.insertBefore(tripButton, rail);

  const searchButton = element("button", "ibtn comfort-search");
  searchButton.type = "button";
  searchButton.id = "comfort-search";
  searchButton.title = "Search places (Cmd/Ctrl+K)";
  searchButton.setAttribute("aria-label", "Search places");
  searchButton.setAttribute("aria-haspopup", "dialog");
  searchButton.innerHTML = searchIcon;
  searchButton.onclick = () => byId("btn-place-search").click();
  top.querySelector(".tools").prepend(searchButton);
  byId("btn-sum").setAttribute("aria-label", "Our picks and final plan");
  byId("btn-more").setAttribute("aria-label", "More options and settings");

  const overview = element("dialog", "comfort-overview");
  overview.id = "trip-overview";
  overview.setAttribute("aria-labelledby", "comfort-title");
  overview.setAttribute("aria-describedby", "comfort-subtitle");
  overview.innerHTML = `<div class="dlg">
    <button type="button" class="close" aria-label="Close trip overview">${closeIcon}</button>
    <p class="eyebrow">roameo / Seoul &amp; Busan</p>
    <h2 id="comfort-title">Your trip, at a glance.</h2>
    <p class="sub" id="comfort-subtitle"></p>
    <div class="comfort-actions"></div>
    <h3>Find your day</h3>
    <div class="comfort-days"></div>
    <p class="comfort-help">Choose a day to see its stops. Your shared picks and plan stay just as you left them.</p>
  </div>`;
  document.body.append(overview);
  byId("comfort-subtitle").textContent =
    `${dateLabel(app.days[0].date)} - ${dateLabel(app.days[app.days.length - 1].date)} ${app.days[0].date.slice(0, 4)} / ${app.days.length} days, together.`;
  const closeOverview = () => overview.close();
  overview.querySelector(".close").onclick = closeOverview;
  overview.addEventListener("click", event => {
    if (event.target === overview) closeOverview();
  });
  overview.addEventListener("close", () => tripButton.setAttribute("aria-expanded", "false"));

  const actions = [
    ["Search places", "btn-place-search", searchIcon],
    ["Our picks", "btn-sum", icon('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>')],
    ["Bookings", "btn-book", icon('<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4M16 3v4M4 11h16m-11 5 2 2 4-4"/>')]
  ];
  actions.forEach(([label, target, graphic]) => {
    const button = element("button", "comfort-action");
    button.type = "button";
    button.innerHTML = graphic;
    button.append(element("span", "", label));
    button.onclick = () => {
      closeOverview();
      byId(target).click();
    };
    overview.querySelector(".comfort-actions").append(button);
  });

  const refreshDays = () => {
    const list = overview.querySelector(".comfort-days");
    list.replaceChildren();
    app.days.forEach((day, index) => {
      const button = element("button", "comfort-day");
      button.type = "button";
      button.dataset.day = String(index);
      button.style.setProperty("--c", day.city === "Busan" ? "var(--busan)" : "var(--seoul)");
      button.setAttribute("aria-current", String(app.state.day === index));
      button.append(element("span", "comfort-day-number", String(index + 1).padStart(2, "0")));
      const copy = element("span", "comfort-day-copy");
      copy.append(
        element("small", "", `${dateLabel(day.date)} / ${day.city}`),
        element("b", "", day.title),
        element("span", "", `${day.items.filter(item => !item.removed).length} stops${app.state.day === index ? " / Current day" : ""}`)
      );
      button.append(copy);
      button.setAttribute("aria-label", `Day ${index + 1}, ${day.city}, ${dateLabel(day.date)}: ${day.title}`);
      button.onclick = () => {
        closeOverview();
        rail.querySelector(`[data-i="${index}"]`).click();
        daycard.classList.add("show");
        requestAnimationFrame(() => {
          if (app.state.mode === "day" && app.state.day === index && !document.querySelector("dialog[open]")) {
            daycard.querySelector(".tl button")?.focus({preventScroll: true});
          }
        });
      };
      list.append(button);
    });
  };
  tripButton.onclick = () => {
    refreshDays();
    overview.showModal();
    tripButton.setAttribute("aria-expanded", "true");
  };

  const sheetClose = element("button", "ibtn comfort-sheet-close");
  sheetClose.type = "button";
  sheetClose.setAttribute("aria-label", "Back to the scene");
  sheetClose.innerHTML = closeIcon;
  sheetClose.onclick = () => {
    app.putDown();
    requestAnimationFrame(() => byId("peek-info")?.focus({preventScroll: true}));
  };
  if (phone) sheet.append(sheetClose);

  const mid = bar.querySelector(".mid");
  const refreshContext = () => {
    const day = app.days[app.state.day];
    tripButton.querySelector("b").textContent = day ? `Day ${app.state.day + 1} / ${day.city}` : "Your trip";
    tripButton.querySelector("small").textContent = day ? `${dateLabel(day.date)} / All days` : "All days at a glance";
    tripButton.setAttribute("aria-label", day ? `Trip overview, Day ${app.state.day + 1}, ${day.city}` : "Open trip overview");
    const tappable = mid.classList.contains("tap");
    mid.tabIndex = tappable ? 0 : -1;
    if (tappable) {
      mid.setAttribute("role", "button");
      mid.setAttribute("aria-label", "Show stop details");
      mid.setAttribute("aria-controls", "sheet");
    } else {
      mid.removeAttribute("role");
      mid.removeAttribute("aria-label");
      mid.removeAttribute("aria-controls");
    }
  };
  mid.addEventListener("keydown", event => {
    if (mid.classList.contains("tap") && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      mid.click();
    }
  });
  app.on("move", refreshContext);
  app.on("arrive", refreshContext);
  new MutationObserver(refreshContext).observe(mid, {attributes: true, attributeFilter: ["class"]});

  // Off-screen panels remain in the DOM for their transitions, but not in the tab order.
  [sheet, daycard, bar, byId("peek")].forEach(panel => {
    const refresh = () => { panel.inert = !panel.classList.contains("show"); };
    new MutationObserver(refresh).observe(panel, {attributes: true, attributeFilter: ["class"]});
    refresh();
  });
  const brand = byId("brand");
  const start = byId("start");
  const refreshWelcome = () => {
    top.inert = !brand.hidden;
    start.inert = !brand.hidden || start.hidden;
  };
  [brand, start].forEach(panel => {
    new MutationObserver(refreshWelcome).observe(panel, {attributes: true, attributeFilter: ["hidden"]});
  });

  // Keep the trail's global arrow shortcuts from moving a stop behind an open panel.
  document.addEventListener("keydown", event => {
    const target = event.target;
    const overlay = document.querySelector("dialog[open], .doc.show, .xp.show");
    if (app.state.mode === "pick" && !overlay && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      byId(event.key === "ArrowLeft" ? "pick-prev" : "pick-next").click();
      return;
    }
    if (["ArrowLeft", "ArrowRight"].includes(event.key) &&
        (overlay || target.closest("button, a, input, textarea, select, [contenteditable], [role='button']"))) {
      event.stopPropagation();
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" &&
        !event.altKey && brand.hidden && app.state.mode !== "pick" && !overlay) {
      event.preventDefault();
      searchButton.click();
    }
  }, true);

  rail.querySelectorAll(".chip").forEach((chip, index) => {
    chip.setAttribute("aria-label", `Day ${index + 1}, ${dateLabel(app.days[index].date)}, ${app.days[index].title}`);
  });
  refreshContext();
  refreshWelcome();
  document.documentElement.classList.add("comfort-ui");
})();
