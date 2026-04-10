const supabaseConfig = window.SUPABASE_CONFIG || {};
const supabaseClient = window.supabase?.createClient(
  supabaseConfig.url || "",
  supabaseConfig.anonKey || ""
);

const userNameEl = document.getElementById("userName");
const dashboardFamilyNameEl = document.getElementById("dashboardFamilyName");
const dashboardParentsEl = document.getElementById("dashboardParents");
const childrenGridEl = document.getElementById("childrenGrid");
const freeTicketsEl = document.getElementById("freeTickets");
const recitalListEl = document.getElementById("recitalList");
const recitalRowsEl = document.getElementById("recitalRows");
const recitalModalOverlay = document.getElementById("recitalModalOverlay");
const recitalModalClose = document.getElementById("recitalModalClose");
const recitalModalTitle = document.getElementById("recitalModalTitle");
const recitalModalSubtitle = document.getElementById("recitalModalSubtitle");
const recitalModalSeats = document.getElementById("recitalModalSeats");
const recitalModalEmpty = document.getElementById("recitalModalEmpty");

function safeParseJSON(value) {
  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = String(timeStr).split(":");
  const date = new Date();
  date.setHours(Number(h || 0), Number(m || 0), 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function getRecitalDisplayName(name) {
  const raw = String(name || "").trim();
  if (!raw) return "Recital";

  const match = raw.match(/^(.+?)\s*-\s*\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}\s*(AM|PM)\s*$/i);
  if (match && match[1]) {
    const cleaned = match[1].trim();
    return cleaned || raw;
  }

  return raw;
}

function buildSeatLabel(seat) {
  const section = String(seat.section || "").trim();
  const number = seat.number == null ? "" : String(seat.number).trim();
  const row = seat.row == null ? "" : String(seat.row).trim();
  if (!section || !number) return "";
  return row ? `${section}-${number} #${row}` : `${section}-${number}`;
}

function seatSort(a, b) {
  const sectionA = String(a.section || "").toLowerCase();
  const sectionB = String(b.section || "").toLowerCase();
  if (sectionA !== sectionB) return sectionA.localeCompare(sectionB);
  const numberA = Number(a.number || 0);
  const numberB = Number(b.number || 0);
  if (numberA !== numberB) return numberA - numberB;
  const rowA = Number(a.row || 0);
  const rowB = Number(b.row || 0);
  return rowA - rowB;
}

const recitalState = {
  recitalsById: new Map()
};

const cachedUser = safeParseJSON(localStorage.getItem("aim_user") || "");
const urlParams = new URLSearchParams(window.location.search);
const paramUser = {
  email: urlParams.get("email") || "",
  firstName: urlParams.get("firstName") || "",
  lastName: urlParams.get("lastName") || "",
  familyAccountId: urlParams.get("familyAccountId")
    ? Number(urlParams.get("familyAccountId"))
    : null
};

if (!cachedUser?.email && paramUser.email) {
  localStorage.setItem("aim_user", JSON.stringify(paramUser));
}

if (userNameEl) {
  const cachedName =
    (cachedUser?.fullName && String(cachedUser.fullName).trim()) ||
    [cachedUser?.firstName, cachedUser?.lastName].filter(Boolean).join(" ").trim() ||
    [paramUser?.firstName, paramUser?.lastName].filter(Boolean).join(" ").trim();

  userNameEl.textContent = cachedName || cachedUser?.email || paramUser?.email || "Guest";
}

async function loadUserProfile() {
  if (!userNameEl) return null;
  const emailToLookup = cachedUser?.email || paramUser?.email;
  if (emailToLookup) {
    const { data: userRow, error: userError } = await supabaseClient
      .from("users")
      .select("first_name,last_name,family_account_id,email")
      .eq("email", emailToLookup)
      .single();

    if (!userError && userRow) {
      const fullName = `${userRow.first_name || ""} ${userRow.last_name || ""}`.trim();
      userNameEl.textContent = fullName || userRow.email || "User";
      return userRow;
    }
  }

  return cachedUser || (paramUser.email ? paramUser : null);
}

async function resolveFamilyAccountId(email) {
  const { data, error } = await supabaseClient
    .from("users")
    .select("family_account_id")
    .eq("email", email)
    .single();

  if (error) throw error;
  return data?.family_account_id || null;
}

async function loadDashboard(familyAccountId) {
  const [{ data: familyRow, error: familyError }, { data: users, error: usersError }] =
    await Promise.all([
      supabaseClient
        .from("familyaccount")
        .select("id,family_name")
        .eq("id", familyAccountId)
        .single(),
      supabaseClient
        .from("users")
        .select("first_name,last_name,email")
        .eq("family_account_id", familyAccountId)
        .order("last_name", { ascending: true })
    ]);

  if (familyError) throw familyError;
  if (usersError) throw usersError;

  return { familyRow, users: users || [] };
}

async function loadDancers(familyAccountId) {
  const { data: dancers, error } = await supabaseClient
    .from("dancer")
    .select("id,first_name,last_name,recital_ids")
    .eq("family_account_id", familyAccountId)
    .order("last_name", { ascending: true });

  if (error) throw error;

  const recitalIdSet = new Set();
  (dancers || []).forEach((dancer) => {
    (dancer.recital_ids || []).forEach((id) => recitalIdSet.add(id));
  });

  const recitalIds = Array.from(recitalIdSet);
  let recitalsById = {};

  if (recitalIds.length > 0) {
    const { data: recitals, error: recitalsError } = await supabaseClient
      .from("recital")
      .select("id,name,day,time")
      .in("id", recitalIds);

    if (recitalsError) throw recitalsError;

    recitalsById = (recitals || []).reduce((acc, recital) => {
      acc[recital.id] = recital;
      return acc;
    }, {});
  }

  return { dancers: dancers || [], recitalsById };
}

async function loadTicketsAndRecitals(familyAccountId) {
  const [{ data: familyRow, error: familyError }, { data: tickets, error: ticketError }] =
    await Promise.all([
      supabaseClient
        .from("familyaccount")
        .select("free_tickets_balance")
        .eq("id", familyAccountId)
        .single(),
      supabaseClient
        .from("ticket")
        .select("recital_id,recital(id,name,day,time),seat(section,row,number)")
        .eq("family_account_id", familyAccountId)
    ]);

  if (familyError) throw familyError;
  if (ticketError) throw ticketError;

  const recitalNames = new Set();
  const recitalsMap = new Map();

  (tickets || []).forEach((ticket) => {
    const recitalId = ticket.recital_id || ticket.recital?.id;
    if (!recitalId) return;

    const recitalInfo = ticket.recital || {};
    if (!recitalsMap.has(recitalId)) {
      recitalsMap.set(recitalId, {
        recital: {
          id: recitalId,
          name: recitalInfo.name || "Recital",
          day: recitalInfo.day || null,
          time: recitalInfo.time || null
        },
        seats: []
      });
    }

    if (recitalInfo?.name) recitalNames.add(recitalInfo.name);

    const seat = ticket.seat;
    if (seat && seat.section && seat.number != null) {
      recitalsMap.get(recitalId).seats.push({
        section: seat.section,
        row: seat.row,
        number: seat.number
      });
    }
  });

  const recitals = Array.from(recitalsMap.values()).map((entry) => {
    const uniqueSeats = new Map();
    entry.seats.forEach((seat) => {
      const key = `${seat.section}|${seat.row ?? ""}|${seat.number}`;
      uniqueSeats.set(key, seat);
    });
    const seats = Array.from(uniqueSeats.values()).sort(seatSort).map(buildSeatLabel);
    return {
      ...entry.recital,
      seats
    };
  });

  recitals.sort((a, b) => {
    const dayDiff = String(a.day || "").localeCompare(String(b.day || ""));
    if (dayDiff !== 0) return dayDiff;
    return String(a.time || "").localeCompare(String(b.time || ""));
  });

  return {
    freeTickets: familyRow?.free_tickets_balance ?? 0,
    recitalNames: Array.from(recitalNames),
    recitals
  };
}

function renderDashboard({ familyRow, users }) {
  if (dashboardFamilyNameEl) {
    const familyName = familyRow?.family_name?.trim() || "Family";
    dashboardFamilyNameEl.textContent = `Family: ${familyName}`;
  }

  if (!dashboardParentsEl) return;

  dashboardParentsEl.innerHTML = "";
  if (!users.length) {
    dashboardParentsEl.innerHTML = "<p>No parents linked yet.</p>";
    return;
  }

  users.forEach((user) => {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
    const label = fullName || user.email || "Unnamed";
    const line = document.createElement("p");
    line.textContent = `Parent: ${label}`;
    dashboardParentsEl.appendChild(line);
  });
}

function renderChildren({ dancers, recitalsById }) {
  if (!childrenGridEl) return;
  childrenGridEl.innerHTML = "";

  if (!dancers.length) {
    childrenGridEl.innerHTML = "<p>No dancers linked yet.</p>";
    return;
  }

  dancers.forEach((dancer) => {
    const fullName = [dancer.first_name, dancer.last_name].filter(Boolean).join(" ").trim();
    const nameLabel = fullName || "Unnamed Dancer";
    const recitalIds = dancer.recital_ids || [];
    const recitalNames = recitalIds
      .map((id) => recitalsById[id]?.name)
      .filter(Boolean);

    const recitalLabel = recitalNames.length
      ? recitalNames.join(", ")
      : "Not assigned";

    const card = document.createElement("section");
    card.className = "child-card";

    const avatar = document.createElement("div");
    avatar.className = "avatar";

    const name = document.createElement("p");
    name.textContent = nameLabel;

    const recital = document.createElement("p");
    recital.textContent = `Recital: ${recitalLabel}`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "manage-btn";
    button.textContent = "Manage Profile";

    card.append(avatar, name, recital, button);
    childrenGridEl.appendChild(card);
  });
}

function renderTickets({ freeTickets, recitalNames }) {
  if (freeTicketsEl) {
    freeTicketsEl.textContent = String(freeTickets ?? 0);
  }

  if (!recitalListEl) return;
  recitalListEl.innerHTML = "";

  if (!recitalNames.length) {
    recitalListEl.innerHTML = "<li>No recitals booked yet.</li>";
    return;
  }

  recitalNames.forEach((name) => {
    const item = document.createElement("li");
    item.textContent = name;
    recitalListEl.appendChild(item);
  });
}

function renderRecitals(recitals) {
  if (!recitalRowsEl) return;
  recitalRowsEl.innerHTML = "";
  recitalState.recitalsById = new Map();

  if (!recitals.length) {
    const empty = document.createElement("p");
    empty.className = "recital-empty";
    empty.textContent = "No recitals booked yet.";
    recitalRowsEl.appendChild(empty);
    return;
  }

  recitals.forEach((recital) => {
    recitalState.recitalsById.set(String(recital.id), recital);

    const row = document.createElement("div");
    row.className = "recital-row";

    const name = document.createElement("span");
    name.textContent = getRecitalDisplayName(recital.name);

    const date = document.createElement("span");
    date.textContent = formatDate(recital.day);

    const time = document.createElement("span");
    time.textContent = formatTime(recital.time);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "recital-details-btn";
    button.textContent = "Details";
    button.dataset.recitalId = String(recital.id);

    row.append(name, date, time, button);
    recitalRowsEl.appendChild(row);
  });
}

function openRecitalModal(recitalId) {
  if (!recitalModalOverlay) return;
  const recital = recitalState.recitalsById.get(String(recitalId));
  if (!recital) return;

  if (recitalModalTitle) {
    const recitalName = getRecitalDisplayName(recital.name);
    recitalModalTitle.textContent = recitalName || "Recital Details";
  }
  if (recitalModalSubtitle) {
    const subtitleParts = [formatDate(recital.day), formatTime(recital.time)].filter(Boolean);
    recitalModalSubtitle.textContent = subtitleParts.join(" · ");
  }

  if (recitalModalSeats) {
    recitalModalSeats.innerHTML = "";
    (recital.seats || []).forEach((seatLabel) => {
      const item = document.createElement("li");
      item.textContent = seatLabel;
      recitalModalSeats.appendChild(item);
    });
  }

  if (recitalModalEmpty) {
    recitalModalEmpty.style.display = recital.seats?.length ? "none" : "block";
  }

  recitalModalOverlay.classList.add("is-open");
  recitalModalOverlay.setAttribute("aria-hidden", "false");
}

function closeRecitalModal() {
  if (!recitalModalOverlay) return;
  recitalModalOverlay.classList.remove("is-open");
  recitalModalOverlay.setAttribute("aria-hidden", "true");
}

async function initAccountPage(profile) {
  if (!dashboardFamilyNameEl && !childrenGridEl && !recitalListEl && !recitalRowsEl) return;

  const email = profile?.email || cachedUser?.email || paramUser?.email;
  if (!email) return;

  const familyAccountId = await resolveFamilyAccountId(email);
  if (!familyAccountId) return;

  const dashboard = await loadDashboard(familyAccountId);
  renderDashboard(dashboard);

  const dancers = await loadDancers(familyAccountId);
  renderChildren(dancers);

  const tickets = await loadTicketsAndRecitals(familyAccountId);
  renderTickets(tickets);
  renderRecitals(tickets.recitals || []);
}

async function init() {
  if (!supabaseClient) {
    if (userNameEl) userNameEl.textContent = "Missing Supabase config";
    return;
  }

  try {
    const profile = await loadUserProfile();
    await initAccountPage(profile);
    if (recitalRowsEl) {
      recitalRowsEl.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (!target.classList.contains("recital-details-btn")) return;
        const recitalId = target.dataset.recitalId;
        if (recitalId) openRecitalModal(recitalId);
      });
    }

    if (recitalModalOverlay) {
      recitalModalOverlay.addEventListener("click", (event) => {
        if (event.target === recitalModalOverlay) closeRecitalModal();
      });
    }

    if (recitalModalClose) {
      recitalModalClose.addEventListener("click", closeRecitalModal);
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeRecitalModal();
    });
  } catch (error) {
    if (userNameEl && userNameEl.textContent === "Loading...") {
      userNameEl.textContent = "Guest";
    }
    console.error("User page init failed:", error);
  }
}

init();
