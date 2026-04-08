const ticketsSupabaseConfig = window.SUPABASE_CONFIG || {};
const ticketsSupabaseClient = window.supabase?.createClient(
  ticketsSupabaseConfig.url || "",
  ticketsSupabaseConfig.anonKey || ""
);

const recitalSelect = document.getElementById("recitalSelect");
const seatMapEl = document.getElementById("seatMap");
const ticketsLeftCount = document.getElementById("ticketsLeftCount");
const redeemableCount = document.getElementById("redeemableCount");
const redeemableWarning = document.getElementById("redeemableWarning");
const regularCount = document.getElementById("regularCount");
const luxuryCount = document.getElementById("luxuryCount");
const totalAmount = document.getElementById("totalAmount");
const addToCartBtn = document.getElementById("addToCartBtn");

const DEFAULT_REG_PRICE = 5.0;
const DEFAULT_LUX_PRICE = 5.15;

const SECTION_ANGLES = {
  A: [160, 132],
  B: [132, 104],
  C: [104, 76],
  D: [76, 48],
  E: [48, 20]
};

const state = {
  recitalId: null,
  layout: null,
  pricing: { reg: DEFAULT_REG_PRICE, lux: DEFAULT_LUX_PRICE },
  freeTicketsBalance: 0,
  selected: { reg: new Set(), lux: new Set() },
  totalAvailable: 0,
  lastSeatMap: null
};

function safeParseJSON(value) {
  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
}

function formatMoney(amount) {
  return `$ ${amount.toFixed(2)}`;
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

function buildSeatKey(section, row, number) {
  return `${section}-${row}-${number}`;
}

function rowToNumber(value) {
  const parsed = Number(String(value || "").trim());
  return Number.isNaN(parsed) ? null : parsed;
}

function isLuxuryRow(rowNumber) {
  return rowNumber !== null && rowNumber <= 3;
}

function updateSummary() {
  const regCount = state.selected.reg.size;
  const luxCount = state.selected.lux.size;
  const selectedCount = regCount + luxCount;
  const redeemableRemaining = Math.max(0, state.freeTicketsBalance - regCount);
  const freeUsed = Math.min(state.freeTicketsBalance, regCount);
  const chargedRegularCount = Math.max(0, regCount - freeUsed);
  const total = chargedRegularCount * state.pricing.reg + luxCount * state.pricing.lux;
  const hasUsedAllRedeemable = redeemableRemaining === 0;

  redeemableCount.textContent = String(redeemableRemaining);
  redeemableWarning.hidden = !hasUsedAllRedeemable;
  regularCount.textContent = String(regCount);
  luxuryCount.textContent = String(luxCount);
  ticketsLeftCount.textContent = String(Math.max(0, state.totalAvailable - selectedCount));
  totalAmount.textContent = formatMoney(total);
}

function resetSelections() {
  state.selected.reg.clear();
  state.selected.lux.clear();
}

function clearSeatMap() {
  if (!seatMapEl) return;
  seatMapEl.innerHTML = "";
}

function renderSeatMap(layout, seatMap, preserveSelections = false) {
  if (!seatMapEl) return;
  clearSeatMap();
  const prevSelectedReg = preserveSelections ? new Set(state.selected.reg) : null;
  const prevSelectedLux = preserveSelections ? new Set(state.selected.lux) : null;
  resetSelections();
  state.lastSeatMap = seatMap;

  const rect = seatMapEl.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height - 20;
  const baseRadius = 120;
  const rowGap = 22;

  let totalSeats = 0;
  let unavailableSeats = 0;

  layout.sections.forEach((section) => {
    const angles = SECTION_ANGLES[section.id] || [150, 30];
    const [startAngle, endAngle] = angles;

    section.rows.forEach((rowDef) => {
      const rowNumber = rowDef.row;
      const seatCount = rowDef.count;
      const radius = baseRadius + (rowNumber - 1) * rowGap;
      const angleStep = seatCount > 1
        ? (endAngle - startAngle) / (seatCount - 1)
        : 0;

      for (let i = 0; i < seatCount; i += 1) {
        const seatNumber = i + 1;
        const angleDeg = startAngle + angleStep * i;
        const angleRad = (angleDeg * Math.PI) / 180;
        const x = centerX + radius * Math.cos(angleRad);
        const y = centerY - radius * Math.sin(angleRad);

        const key = buildSeatKey(section.id, rowNumber, seatNumber);
        const seatRow = seatMap.get(key);
        const seatId = seatRow ? String(seatRow.id) : "";
        const status = seatRow?.status || "missing";
        const luxury = isLuxuryRow(rowNumber);

        const button = document.createElement("button");
        button.type = "button";
        button.className = "seat-dot";
        button.classList.add(luxury ? "seat-dot--lux" : "seat-dot--reg");
        button.style.left = `${Math.round(x - 7)}px`;
        button.style.top = `${Math.round(y - 7)}px`;
        button.setAttribute(
          "aria-label",
          `${section.id}${rowNumber}-${seatNumber} ${luxury ? "Luxury" : "Regular"}`
        );
        button.setAttribute("aria-pressed", "false");

        if (!seatId || status !== "available") {
          button.disabled = true;
          button.classList.add("seat-dot--disabled");
          unavailableSeats += 1;
        }

        if (seatId && preserveSelections) {
          const selectedSet = luxury ? prevSelectedLux : prevSelectedReg;
          if (selectedSet && selectedSet.has(seatId)) {
            const set = luxury ? state.selected.lux : state.selected.reg;
            set.add(seatId);
            button.classList.add("seat-dot--chosen");
            button.setAttribute("aria-pressed", "true");
          }
        }

        button.addEventListener("click", () => {
          if (!seatId) return;
          const set = luxury ? state.selected.lux : state.selected.reg;
          if (set.has(seatId)) {
            set.delete(seatId);
            button.classList.remove("seat-dot--chosen");
            button.setAttribute("aria-pressed", "false");
          } else {
            set.add(seatId);
            button.classList.add("seat-dot--chosen");
            button.setAttribute("aria-pressed", "true");
          }
          updateSummary();
        });

        seatMapEl.appendChild(button);
        totalSeats += 1;
      }
    });
  });

  state.totalAvailable = Math.max(0, totalSeats - unavailableSeats);
  updateSummary();
}

async function resolveFamilyAccountId(email, paramFamilyAccountId) {
  if (paramFamilyAccountId) return paramFamilyAccountId;
  if (!email) return null;

  const { data, error } = await ticketsSupabaseClient
    .from("users")
    .select("family_account_id")
    .eq("email", email)
    .single();

  if (error) throw error;
  return data?.family_account_id || null;
}

async function loadRecitals() {
  const { data, error } = await ticketsSupabaseClient
    .from("recital")
    .select("id,name,day,time")
    .order("day", { ascending: true })
    .order("time", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function loadSeatsForRecital(recitalId) {
  const { data, error } = await ticketsSupabaseClient
    .from("seat")
    .select("id,section,row,number,status")
    .eq("recital_id", recitalId);

  if (error) throw error;
  return data || [];
}

async function loadPricing() {
  const { data, error } = await ticketsSupabaseClient
    .from("tickettype")
    .select("name,price");

  if (error || !Array.isArray(data)) {
    return { reg: DEFAULT_REG_PRICE, lux: DEFAULT_LUX_PRICE };
  }

  let reg = DEFAULT_REG_PRICE;
  let lux = DEFAULT_LUX_PRICE;

  data.forEach((row) => {
    const name = String(row.name || "").toLowerCase();
    if (name.includes("regular")) reg = Number(row.price || reg);
    if (name.includes("lux")) lux = Number(row.price || lux);
  });

  return { reg, lux };
}

async function loadFreeTicketsBalance(familyAccountId) {
  if (!familyAccountId) return 0;
  const { data, error } = await ticketsSupabaseClient
    .from("familyaccount")
    .select("free_tickets_balance")
    .eq("id", familyAccountId)
    .single();

  if (error) throw error;
  return data?.free_tickets_balance ?? 0;
}

async function loadSeatLayout() {
  const response = await fetch("seat_layout.json");
  if (!response.ok) throw new Error("Failed to load seat layout");
  return response.json();
}

function setRecitalOptions(recitals, preselectedId) {
  if (!recitalSelect) return null;
  recitalSelect.innerHTML = "";

  if (!recitals.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No recitals available";
    recitalSelect.appendChild(option);
    return null;
  }

  recitals.forEach((recital) => {
    const option = document.createElement("option");
    option.value = recital.id;
    const label = `${recital.name || "Recital"} — ${formatDate(recital.day)} @ ${formatTime(
      recital.time
    )}`.trim();
    option.textContent = label;
    recitalSelect.appendChild(option);
  });

  const hasPreselected = recitals.some((r) => String(r.id) === String(preselectedId));
  const chosenId = hasPreselected ? preselectedId : recitals[0].id;
  recitalSelect.value = String(chosenId);
  return chosenId;
}

async function refreshRecital(recitalId) {
  if (!recitalId || !state.layout) return;
  state.recitalId = recitalId;
  const seats = await loadSeatsForRecital(recitalId);
  const seatMap = new Map();

  seats.forEach((seat) => {
    const rowNumber = rowToNumber(seat.row);
    const key = buildSeatKey(seat.section, rowNumber, seat.number);
    seatMap.set(key, {
      id: seat.id,
      status: seat.status || "available"
    });
  });

  renderSeatMap(state.layout, seatMap);
}

function buildCartPayload() {
  const regCount = state.selected.reg.size;
  const luxCount = state.selected.lux.size;
  const freeTickets = Math.min(state.freeTicketsBalance, regCount);
  const chargedRegularCount = Math.max(0, regCount - freeTickets);
  const regularAmount = chargedRegularCount * state.pricing.reg;
  const luxuryAmount = luxCount * state.pricing.lux;

  return {
    savedAt: new Date().toISOString(),
    recitalId: state.recitalId,
    seatIds: {
      reg: Array.from(state.selected.reg),
      lux: Array.from(state.selected.lux)
    },
    seatTypeBreakdown: {
      reg: regCount,
      lux: luxCount
    },
    pricing: {
      regPrice: state.pricing.reg,
      luxPrice: state.pricing.lux,
      freeTicketsBalance: state.freeTicketsBalance
    },
    totals: {
      freeTickets,
      regularTickets: chargedRegularCount,
      luxuryTickets: luxCount,
      regularAmount,
      luxuryAmount,
      ticketSubtotal: regularAmount + luxuryAmount
    }
  };
}

async function initTicketsPage() {
  if (!ticketsSupabaseClient || !recitalSelect || !seatMapEl) return;

  const cachedUser = safeParseJSON(localStorage.getItem("aim_user") || "");
  const urlParams = new URLSearchParams(window.location.search);
  const email = cachedUser?.email || urlParams.get("email") || "";
  const paramFamilyAccountId = urlParams.get("familyAccountId")
    ? Number(urlParams.get("familyAccountId"))
    : null;
  const preselectedRecitalId = urlParams.get("recitalId");

  const familyAccountId = await resolveFamilyAccountId(email, paramFamilyAccountId);
  state.pricing = await loadPricing();
  state.freeTicketsBalance = await loadFreeTicketsBalance(familyAccountId);
  state.layout = await loadSeatLayout();

  const recitals = await loadRecitals();
  const chosenRecitalId = setRecitalOptions(recitals, preselectedRecitalId);
  if (chosenRecitalId) {
    await refreshRecital(chosenRecitalId);
  }

  recitalSelect.addEventListener("change", async (event) => {
    const nextId = event.target.value;
    await refreshRecital(nextId);
  });

  addToCartBtn.addEventListener("click", () => {
    const payload = buildCartPayload();
    localStorage.setItem("aimCartTickets", JSON.stringify(payload));
    window.location.href = "cart.html";
  });

  window.addEventListener("resize", () => {
    if (state.layout && state.lastSeatMap) {
      renderSeatMap(state.layout, state.lastSeatMap, true);
    }
  });
}

initTicketsPage().catch((error) => {
  console.error("Tickets page init failed:", error);
  if (recitalSelect) {
    recitalSelect.innerHTML = "<option value=\"\">Failed to load recitals</option>";
  }
});
