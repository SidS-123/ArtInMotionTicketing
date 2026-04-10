const ticketsSupabaseConfig = window.SUPABASE_CONFIG || {};
const ticketsSupabaseClient = window.supabase?.createClient(
  ticketsSupabaseConfig.url || "",
  ticketsSupabaseConfig.anonKey || ""
);

const CART_TICKET_KEY = "aimCartTickets";
const DEFAULT_REG_PRICE = 5.0;
const DEFAULT_LUX_PRICE = 5.15;

const recitalSelect = document.getElementById("recitalSelect");
const seatOverlay = document.getElementById("seatOverlay");
const ticketsLeftCount = document.getElementById("ticketsLeftCount");
const redeemableCount = document.getElementById("redeemableCount");
const redeemableWarning = document.getElementById("redeemableWarning");
const regularCount = document.getElementById("regularCount");
const luxuryCount = document.getElementById("luxuryCount");
const blueCount = document.getElementById("blueCount");
const totalAmount = document.getElementById("totalAmount");
const selectedSeatsEl = document.getElementById("selectedSeats");
const addToCartBtn = document.getElementById("addToCartBtn");
const ticketsStatusEl = document.getElementById("ticketsStatus");

const state = {
  familyAccountId: null,
  visualSeats: [],
  recitals: [],
  currentRecitalId: null,
  currentRecitalName: "",
  pricing: {
    reg: DEFAULT_REG_PRICE,
    lux: DEFAULT_LUX_PRICE
  },
  freeTicketsBalance: 0,
  selectedSeatIds: new Set(),
  selectedSeatMetaById: new Map(),
  seatRowsByKey: new Map(),
  soldSeatIds: new Set(),
  availableSeatCount: 0
};

function safeParseJSON(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function setStatus(message, kind = "") {
  if (!ticketsStatusEl) return;
  ticketsStatusEl.textContent = message || "";
  ticketsStatusEl.className = "tickets-status";
  if (kind) {
    ticketsStatusEl.classList.add(`tickets-status--${kind}`);
  }
}

function formatMoney(amount) {
  return `$ ${Number(amount || 0).toFixed(2)}`;
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

function parseVisualSeatId(seatId) {
  const normalized = String(seatId || "").trim();
  const match = normalized.match(/^(.+)-(\d+)$/);
  if (!match) return null;

  return {
    label: normalized,
    section: match[1],
    number: Number(match[2])
  };
}

function buildSeatIdentityKey(section, row, number) {
  const normalizedSection = String(section || "").trim();
  const normalizedRow = row == null ? "" : String(row).trim();
  const normalizedNumber = Number(number);

  if (!normalizedSection || Number.isNaN(normalizedNumber)) {
    return "";
  }

  return `${normalizedSection}|${normalizedRow}|${normalizedNumber}`;
}

function decorateVisualSeats(rawSeats) {
  const totalsByLabel = new Map();
  const seenByLabel = new Map();

  rawSeats.forEach((seat) => {
    const label = String(seat.id || "").trim();
    totalsByLabel.set(label, (totalsByLabel.get(label) || 0) + 1);
  });

  const resolveTicketType = (seatType) => {
    const normalized = String(seatType || "").trim().toLowerCase();
    if (normalized === "lux" || normalized === "luxury" || normalized.includes("lux")) return "lux";
    if (normalized === "blue" || normalized === "blu" || normalized.includes("blue")) return "blue";
    return "reg";
  };

  const hasBlueId = (seatIdLabel) => String(seatIdLabel || "").toUpperCase().includes("BLUE");

  return rawSeats
    .map((seat, index) => {
      const parsed = parseVisualSeatId(seat.id);
      if (!parsed) return null;

      const label = parsed.label;
      const occurrence = (seenByLabel.get(label) || 0) + 1;
      seenByLabel.set(label, occurrence);

      const duplicateCount = totalsByLabel.get(label) || 1;
      const dbRow = duplicateCount > 1 ? String(occurrence) : null;

      return {
        ...seat,
        index,
        label,
        parsed,
        occurrence,
        duplicateCount,
        dbRow,
        dbKey: buildSeatIdentityKey(parsed.section, dbRow, parsed.number),
        ticketType: hasBlueId(seat.id) ? "blue" : resolveTicketType(seat.type)
      };
    })
    .filter(Boolean);
}

function getSelectedSeatLabels() {
  return [...state.selectedSeatMetaById.values()]
    .sort((a, b) => a.visualIndex - b.visualIndex)
    .map((seat) => {
      if (seat.duplicateCount > 1) {
        return `${seat.label} #${seat.occurrence}`;
      }
      return seat.label;
    });
}

function updateSummary() {
  const selectedSeats = [...state.selectedSeatMetaById.values()];
  const regularSelected = selectedSeats.filter((seat) => seat.ticketType === "reg").length;
  const luxurySelected = selectedSeats.filter((seat) => seat.ticketType === "lux").length;
  const blueSelected = selectedSeats.filter((seat) => seat.ticketType === "blue").length;
  const freeTicketsUsed = Math.min(state.freeTicketsBalance, regularSelected);
  const redeemableRemaining = Math.max(0, state.freeTicketsBalance - regularSelected);
  const chargedRegularCount = Math.max(0, regularSelected - freeTicketsUsed);
  const chargedBlueCount = blueSelected;
  const total =
    (chargedRegularCount + chargedBlueCount) * state.pricing.reg +
    luxurySelected * state.pricing.lux;

  redeemableCount.textContent = String(redeemableRemaining);
  redeemableWarning.hidden = redeemableRemaining !== 0;
  regularCount.textContent = String(regularSelected);
  luxuryCount.textContent = String(luxurySelected);
  if (blueCount) blueCount.textContent = String(blueSelected);
  ticketsLeftCount.textContent = String(Math.max(0, state.availableSeatCount - selectedSeats.length));
  totalAmount.textContent = formatMoney(total);
  selectedSeatsEl.textContent = getSelectedSeatLabels().join(", ") || "None";
}

function readIdentityContext() {
  const cachedUser = safeParseJSON(localStorage.getItem("aim_user") || "");
  const urlParams = new URLSearchParams(window.location.search);

  return {
    email: cachedUser?.email || urlParams.get("email") || "",
    familyAccountId: cachedUser?.familyAccountId ||
      (urlParams.get("familyAccountId") ? Number(urlParams.get("familyAccountId")) : null),
    recitalId: urlParams.get("recitalId") ? Number(urlParams.get("recitalId")) : null
  };
}

function readStoredCart() {
  return safeParseJSON(localStorage.getItem(CART_TICKET_KEY) || "");
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

async function loadRecitalsForFamily(familyAccountId, preselectedRecitalId) {
  if (!familyAccountId) {
    if (!preselectedRecitalId) return [];

    const { data, error } = await ticketsSupabaseClient
      .from("recital")
      .select("id,name,day,time")
      .eq("id", preselectedRecitalId)
      .order("day", { ascending: true })
      .order("time", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  const { data: dancers, error: dancerError } = await ticketsSupabaseClient
    .from("dancer")
    .select("recital_ids")
    .eq("family_account_id", familyAccountId);

  if (dancerError) throw dancerError;

  const recitalIds = Array.from(
    new Set((dancers || []).flatMap((dancer) => dancer.recital_ids || []))
  );

  if (!recitalIds.length) {
    return [];
  }

  const { data: recitals, error: recitalError } = await ticketsSupabaseClient
    .from("recital")
    .select("id,name,day,time")
    .in("id", recitalIds)
    .order("day", { ascending: true })
    .order("time", { ascending: true });

  if (recitalError) throw recitalError;
  return recitals || [];
}

async function loadPricing() {
  const { data, error } = await ticketsSupabaseClient
    .from("tickettype")
    .select("name,price");

  if (error || !Array.isArray(data)) {
    return {
      reg: DEFAULT_REG_PRICE,
      lux: DEFAULT_LUX_PRICE
    };
  }

  let reg = DEFAULT_REG_PRICE;
  let lux = DEFAULT_LUX_PRICE;

  data.forEach((row) => {
    const normalizedName = String(row.name || "").toLowerCase();
    if (normalizedName.includes("regular")) {
      reg = Number(row.price || reg);
    }
    if (normalizedName.includes("lux")) {
      lux = Number(row.price || lux);
    }
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
  return Number(data?.free_tickets_balance || 0);
}

async function loadVisualSeatMap() {
  const response = await fetch("./final-seatmap.json");
  if (!response.ok) {
    throw new Error(`Seat map failed to load (HTTP ${response.status}).`);
  }

  const raw = await response.json();
  if (!Array.isArray(raw) || !raw.length) {
    throw new Error("Seat map file is empty.");
  }

  return decorateVisualSeats(raw);
}

function buildRecitalOptionLabel(recital) {
  return `${recital.name || "Recital"} - ${formatDate(recital.day)} @ ${formatTime(recital.time)}`;
}

function populateRecitalSelect(preselectedRecitalId) {
  recitalSelect.innerHTML = "";

  if (!state.recitals.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No recitals available";
    recitalSelect.appendChild(option);
    recitalSelect.disabled = true;
    return null;
  }

  recitalSelect.disabled = false;
  state.recitals.forEach((recital) => {
    const option = document.createElement("option");
    option.value = String(recital.id);
    option.textContent = buildRecitalOptionLabel(recital);
    recitalSelect.appendChild(option);
  });

  const allowedPreselected = state.recitals.find(
    (recital) => String(recital.id) === String(preselectedRecitalId || "")
  );
  const chosenRecital = allowedPreselected || state.recitals[0];
  recitalSelect.value = String(chosenRecital.id);
  return chosenRecital.id;
}

async function loadSeatAvailability(recitalId) {
  const [seatResult, soldResult] = await Promise.all([
    ticketsSupabaseClient
      .from("seat")
      .select("id,section,row,number,status")
      .eq("recital_id", recitalId)
      .order("id", { ascending: true }),
    ticketsSupabaseClient
      .from("ticket")
      .select("seat_id")
      .eq("recital_id", recitalId)
  ]);

  if (seatResult.error) throw seatResult.error;
  if (soldResult.error) throw soldResult.error;

  state.seatRowsByKey = new Map();
  (seatResult.data || []).forEach((seat) => {
    const key = buildSeatIdentityKey(seat.section, seat.row, seat.number);
    state.seatRowsByKey.set(key, seat);
  });

  state.soldSeatIds = new Set((soldResult.data || []).map((ticket) => String(ticket.seat_id)));
}

function setSelectedState(nextIds) {
  state.selectedSeatIds = new Set(nextIds);
  state.selectedSeatMetaById = new Map();
}

function renderSeatButtons() {
  seatOverlay.innerHTML = "";
  state.availableSeatCount = 0;

  const desiredSelection = new Set(state.selectedSeatIds);
  state.selectedSeatMetaById = new Map();

  state.visualSeats.forEach((visualSeat) => {
    const seatRow = state.seatRowsByKey.get(visualSeat.dbKey) || null;
    const seatId = seatRow ? String(seatRow.id) : "";
    const isUnavailable =
      !seatRow ||
      String(seatRow.status || "available").toLowerCase() !== "available" ||
      state.soldSeatIds.has(seatId);

    const button = document.createElement("button");
    button.type = "button";
    button.className = `seat seat--${visualSeat.ticketType}`;
    button.style.left = `${visualSeat.x}%`;
    button.style.top = `${visualSeat.y}%`;
    button.dataset.seatId = seatId;
    button.dataset.dbKey = visualSeat.dbKey;
    const seatLabel = `${visualSeat.label}${visualSeat.duplicateCount > 1 ? ` seat ${visualSeat.occurrence}` : ""}`;

    if (isUnavailable) {
      button.classList.add("seat--unavailable");
      button.dataset.tooltip = "Unavailable";
      button.title = `${seatLabel} - Unavailable`;
      button.setAttribute("aria-label", `${seatLabel} unavailable`);
      button.setAttribute("aria-disabled", "true");
    } else {
      button.title = `${seatLabel} - Available`;
      button.setAttribute("aria-label", `${seatLabel} available`);
      button.setAttribute("aria-disabled", "false");
      state.availableSeatCount += 1;
    }

    if (!isUnavailable && desiredSelection.has(seatId)) {
      button.classList.add("seat--chosen");
      state.selectedSeatMetaById.set(seatId, {
        seatId,
        label: visualSeat.label,
        ticketType: visualSeat.ticketType,
        visualIndex: visualSeat.index,
        occurrence: visualSeat.occurrence,
        duplicateCount: visualSeat.duplicateCount
      });
    }

    button.addEventListener("click", () => {
      if (!seatId || isUnavailable) return;

      if (state.selectedSeatIds.has(seatId)) {
        state.selectedSeatIds.delete(seatId);
        state.selectedSeatMetaById.delete(seatId);
        button.classList.remove("seat--chosen");
      } else {
        state.selectedSeatIds.add(seatId);
        state.selectedSeatMetaById.set(seatId, {
          seatId,
          label: visualSeat.label,
          ticketType: visualSeat.ticketType,
          visualIndex: visualSeat.index,
          occurrence: visualSeat.occurrence,
          duplicateCount: visualSeat.duplicateCount
        });
        button.classList.add("seat--chosen");
      }

      updateSummary();
    });

    seatOverlay.appendChild(button);
  });

  state.selectedSeatIds = new Set(state.selectedSeatMetaById.keys());
  updateSummary();
}

function restoreSelectionForRecital(recitalId) {
  const storedCart = readStoredCart();
  if (!storedCart || String(storedCart.recitalId || "") !== String(recitalId)) {
    setSelectedState([]);
    return;
  }

  const regIds = Array.isArray(storedCart.seatIds?.reg)
    ? storedCart.seatIds.reg.map(String)
    : [];
  const luxIds = Array.isArray(storedCart.seatIds?.lux)
    ? storedCart.seatIds.lux.map(String)
    : [];
  const blueIds = Array.isArray(storedCart.seatIds?.blue)
    ? storedCart.seatIds.blue.map(String)
    : [];

  setSelectedState([...new Set([...regIds, ...luxIds, ...blueIds])]);
}

async function refreshRecital(recitalId) {
  const nextRecital = state.recitals.find((recital) => String(recital.id) === String(recitalId || ""));
  if (!nextRecital) {
    state.currentRecitalId = null;
    state.currentRecitalName = "";
    setSelectedState([]);
    seatOverlay.innerHTML = "";
    updateSummary();
    return;
  }

  state.currentRecitalId = nextRecital.id;
  state.currentRecitalName = nextRecital.name || "Recital";
  restoreSelectionForRecital(nextRecital.id);
  await loadSeatAvailability(nextRecital.id);
  renderSeatButtons();
  setStatus("");
}

function buildCartPayload() {
  const selectedSeats = [...state.selectedSeatMetaById.values()];
  const regularSeatIds = selectedSeats
    .filter((seat) => seat.ticketType === "reg")
    .map((seat) => Number(seat.seatId));
  const blueSeatIds = selectedSeats
    .filter((seat) => seat.ticketType === "blue")
    .map((seat) => Number(seat.seatId));
  const luxurySeatIds = selectedSeats
    .filter((seat) => seat.ticketType === "lux")
    .map((seat) => Number(seat.seatId));
  const freeTickets = Math.min(state.freeTicketsBalance, regularSeatIds.length);
  const paidRegularTickets = Math.max(0, regularSeatIds.length - freeTickets);
  const blueTickets = blueSeatIds.length;
  const regularTickets = paidRegularTickets + blueTickets;
  const regularAmount = regularTickets * state.pricing.reg;
  const luxuryAmount = luxurySeatIds.length * state.pricing.lux;

  return {
    savedAt: new Date().toISOString(),
    recitalId: state.currentRecitalId,
    recitalName: state.currentRecitalName,
    seatIds: {
      reg: regularSeatIds,
      blue: blueSeatIds,
      lux: luxurySeatIds
    },
    selectedSeats: selectedSeats.map((seat) => ({
      seatId: Number(seat.seatId),
      label: seat.label,
      occurrence: seat.occurrence,
      ticketType: seat.ticketType
    })),
    pricing: {
      regPrice: state.pricing.reg,
      luxPrice: state.pricing.lux,
      freeTicketsBalance: state.freeTicketsBalance
    },
    totals: {
      freeTickets,
      regularTickets,
      blueTickets,
      luxuryTickets: luxurySeatIds.length,
      regularAmount,
      luxuryAmount,
      ticketSubtotal: regularAmount + luxuryAmount
    }
  };
}

function attachEvents() {
  recitalSelect.addEventListener("change", async (event) => {
    setStatus("Loading seat availability...", "info");
    await refreshRecital(event.target.value);
  });

  addToCartBtn.addEventListener("click", () => {
    if (!state.currentRecitalId) {
      setStatus("Choose a recital before saving tickets.", "error");
      return;
    }

    if (!state.selectedSeatMetaById.size) {
      setStatus("Select at least one available seat before saving to cart.", "error");
      return;
    }

    localStorage.setItem(CART_TICKET_KEY, JSON.stringify(buildCartPayload()));
    window.location.href = "cart.html";
  });
}

async function initTicketsPage() {
  if (!ticketsSupabaseClient || !recitalSelect || !seatOverlay) {
    return;
  }

  setStatus("Loading recital ticketing...", "info");

  const identity = readIdentityContext();
  state.familyAccountId = await resolveFamilyAccountId(identity.email, identity.familyAccountId);
  state.pricing = await loadPricing();
  state.freeTicketsBalance = await loadFreeTicketsBalance(state.familyAccountId);
  state.visualSeats = await loadVisualSeatMap();
  state.recitals = await loadRecitalsForFamily(state.familyAccountId, identity.recitalId);

  const recitalId = populateRecitalSelect(identity.recitalId);
  attachEvents();

  if (!recitalId) {
    setSelectedState([]);
    updateSummary();
    setStatus("No family recitals are linked yet.", "info");
    return;
  }

  await refreshRecital(recitalId);
}

initTicketsPage().catch((error) => {
  console.error("Tickets page init failed:", error);
  setStatus(error?.message || "Tickets page failed to load.", "error");
  if (recitalSelect) {
    recitalSelect.innerHTML = "<option value=\"\">Failed to load recitals</option>";
    recitalSelect.disabled = true;
  }
});
