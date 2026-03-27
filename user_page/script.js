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

function safeParseJSON(value) {
  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
}

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
        .select("recital_id,recital(name)")
        .eq("family_account_id", familyAccountId)
    ]);

  if (familyError) throw familyError;
  if (ticketError) throw ticketError;

  const recitalNames = new Set();
  (tickets || []).forEach((ticket) => {
    if (ticket.recital?.name) recitalNames.add(ticket.recital.name);
  });

  return {
    freeTickets: familyRow?.free_tickets_balance ?? 0,
    recitalNames: Array.from(recitalNames)
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

async function initAccountPage(profile) {
  if (!dashboardFamilyNameEl && !childrenGridEl && !recitalListEl) return;

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
}

async function init() {
  if (!supabaseClient) {
    if (userNameEl) userNameEl.textContent = "Missing Supabase config";
    return;
  }

  try {
    const profile = await loadUserProfile();
    await initAccountPage(profile);
  } catch (error) {
    if (userNameEl && userNameEl.textContent === "Loading...") {
      userNameEl.textContent = "Guest";
    }
    console.error("User page init failed:", error);
  }
}

init();
