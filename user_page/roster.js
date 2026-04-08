const rosterSupabaseConfig = window.SUPABASE_CONFIG || {};
const rosterSupabaseClient = window.supabase?.createClient(
  rosterSupabaseConfig.url || "",
  rosterSupabaseConfig.anonKey || ""
);

const rosterRowsEl = document.getElementById("rosterRows");

function rosterSafeParseJSON(value) {
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
  const [h, m] = timeStr.split(":");
  const date = new Date();
  date.setHours(Number(h), Number(m || 0));
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function renderRosterRows(rows) {
  if (!rosterRowsEl) return;
  if (!rows.length) {
    rosterRowsEl.innerHTML = "<div class=\"timing-row\">No recitals found.</div>";
    return;
  }

  rosterRowsEl.innerHTML = rows
    .map((row) => {
      const linkParams = new URLSearchParams({
        recitalId: row.recitalId,
        familyAccountId: row.familyAccountId
      });

      return `
        <div class="timing-row">
          <span>${row.dancerName}</span>
          <span>${row.recitalName}</span>
          <span>${row.recitalDay}</span>
          <span>${row.recitalTime}</span>
          <a href="tickets.html?${linkParams.toString()}" class="link-btn">Link</a>
        </div>
      `;
    })
    .join("");
}

async function loadRosterRows() {
  if (!rosterSupabaseClient || !rosterRowsEl) return;

  const cachedUser = rosterSafeParseJSON(localStorage.getItem("aim_user") || "");
  const urlParams = new URLSearchParams(window.location.search);
  const familyAccountId = cachedUser?.familyAccountId ||
    (urlParams.get("familyAccountId") ? Number(urlParams.get("familyAccountId")) : null);

  if (!familyAccountId) {
    renderRosterRows([]);
    return;
  }

  const { data: dancers, error: dancerError } = await rosterSupabaseClient
    .from("dancer")
    .select("first_name,last_name,recital_ids")
    .eq("family_account_id", familyAccountId);

  if (dancerError || !Array.isArray(dancers) || dancers.length === 0) {
    renderRosterRows([]);
    return;
  }

  const recitalIds = Array.from(
    new Set(dancers.flatMap((d) => d.recital_ids || []))
  );

  if (recitalIds.length === 0) {
    renderRosterRows([]);
    return;
  }

  const { data: recitals, error: recitalError } = await rosterSupabaseClient
    .from("recital")
    .select("id,name,day,time")
    .in("id", recitalIds)
    .order("day", { ascending: true });

  if (recitalError || !Array.isArray(recitals) || recitals.length === 0) {
    renderRosterRows([]);
    return;
  }

  const recitalMap = new Map(recitals.map((recital) => [recital.id, recital]));
  const rows = [];

  dancers.forEach((dancer) => {
    const dancerName = `${dancer.first_name || ""} ${dancer.last_name || ""}`.trim() || "Unnamed";
    const ids = dancer.recital_ids || [];
    ids.forEach((id) => {
      const recital = recitalMap.get(id);
      if (!recital) return;
      rows.push({
        dancerName,
        recitalName: recital.name || "",
        recitalDay: formatDate(recital.day),
        recitalTime: formatTime(recital.time),
        recitalId: recital.id,
        familyAccountId
      });
    });
  });

  renderRosterRows(rows);
}

loadRosterRows().catch((error) => {
  console.error("Roster load failed:", error);
  renderRosterRows([]);
});
