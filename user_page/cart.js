const cartSupabaseConfig = window.SUPABASE_CONFIG || {};
const cartSupabaseClient = window.supabase?.createClient(
  cartSupabaseConfig.url || "",
  cartSupabaseConfig.anonKey || ""
);

const CART_TICKET_KEY = "aimCartTickets";
const TAX_RATE = 0.0931;

const freeTicketCountEl = document.getElementById("freeTicketCount");
const freeTicketAmountEl = document.getElementById("freeTicketAmount");
const regularTicketCountEl = document.getElementById("regularTicketCount");
const regularTicketAmountEl = document.getElementById("regularTicketAmount");
const luxuryTicketCountEl = document.getElementById("luxuryTicketCount");
const luxuryTicketAmountEl = document.getElementById("luxuryTicketAmount");
const productSummaryListEl = document.getElementById("productSummaryList");
const subtotalAmountEl = document.getElementById("subtotalAmount");
const taxAmountEl = document.getElementById("taxAmount");
const totalAmountEl = document.getElementById("totalAmount");
const productsListEl = document.getElementById("productsList");
const productsEmptyStateEl = document.getElementById("productsEmptyState");
const checkoutBtn = document.getElementById("checkoutBtn");
const resetTicketsBtn = document.getElementById("resetTicketsBtn");
const cartStatusEl = document.getElementById("cartStatus");

const cartState = {
  familyAccountId: null,
  ticketSummary: createEmptyTicketSummary(),
  products: [],
  totals: {
    productSubtotal: 0,
    subtotal: 0,
    tax: 0,
    total: 0
  },
  isCheckingOut: false
};

function createEmptyTicketSummary() {
  return {
    recitalId: null,
    freeTickets: 0,
    regularTickets: 0,
    luxuryTickets: 0,
    regularAmount: 0,
    luxuryAmount: 0,
    ticketSubtotal: 0,
    seatIds: {
      reg: [],
      lux: []
    },
    pricing: {
      regPrice: 0,
      luxPrice: 0,
      freeTicketsBalance: 0
    }
  };
}

function safeParseJSON(value) {
  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
}

function toMoney(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

function setStatus(message, kind = "") {
  if (!cartStatusEl) return;
  cartStatusEl.textContent = message || "";
  cartStatusEl.className = "cart-status";
  if (kind) {
    cartStatusEl.classList.add(`cart-status--${kind}`);
  }
}

function setCheckoutDisabled(disabled) {
  if (!checkoutBtn) return;
  checkoutBtn.disabled = Boolean(disabled);
}

function readIdentityContext() {
  const cachedUser = safeParseJSON(localStorage.getItem("aim_user") || "");
  const urlParams = new URLSearchParams(window.location.search);
  return {
    email: cachedUser?.email || urlParams.get("email") || "",
    familyAccountId: urlParams.get("familyAccountId")
      ? Number(urlParams.get("familyAccountId"))
      : null
  };
}

function loadTicketSummaryFromStorage() {
  const raw = localStorage.getItem(CART_TICKET_KEY);
  cartState.ticketSummary = createEmptyTicketSummary();
  if (!raw) return;

  const parsed = safeParseJSON(raw);
  if (!parsed || !parsed.totals) return;

  cartState.ticketSummary = {
    recitalId: parsed.recitalId ? Number(parsed.recitalId) : null,
    freeTickets: Number(parsed.totals.freeTickets || 0),
    regularTickets: Number(parsed.totals.regularTickets || 0),
    luxuryTickets: Number(parsed.totals.luxuryTickets || 0),
    regularAmount: Number(parsed.totals.regularAmount || 0),
    luxuryAmount: Number(parsed.totals.luxuryAmount || 0),
    ticketSubtotal: Number(parsed.totals.ticketSubtotal || 0),
    seatIds: {
      reg: Array.isArray(parsed.seatIds?.reg) ? parsed.seatIds.reg.map(String) : [],
      lux: Array.isArray(parsed.seatIds?.lux) ? parsed.seatIds.lux.map(String) : []
    },
    pricing: {
      regPrice: Number(parsed.pricing?.regPrice || 0),
      luxPrice: Number(parsed.pricing?.luxPrice || 0),
      freeTicketsBalance: Number(parsed.pricing?.freeTicketsBalance || 0)
    }
  };
}

function calculateTotals() {
  const productSubtotal = cartState.products.reduce(
    (sum, product) => sum + product.inCartQty * product.price,
    0
  );
  const subtotal = cartState.ticketSummary.ticketSubtotal + productSubtotal;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  cartState.totals = {
    productSubtotal,
    subtotal,
    tax,
    total
  };
}

function renderSummary() {
  calculateTotals();

  freeTicketCountEl.textContent = String(cartState.ticketSummary.freeTickets);
  freeTicketAmountEl.textContent = "$0.00";
  regularTicketCountEl.textContent = String(cartState.ticketSummary.regularTickets);
  regularTicketAmountEl.textContent = toMoney(cartState.ticketSummary.regularAmount);
  luxuryTicketCountEl.textContent = String(cartState.ticketSummary.luxuryTickets);
  luxuryTicketAmountEl.textContent = toMoney(cartState.ticketSummary.luxuryAmount);

  if (productSummaryListEl) {
    productSummaryListEl.innerHTML = "";

    cartState.products.forEach((product) => {
      const lineItem = document.createElement("div");
      lineItem.className = "line-item";

      const qtyLabel = document.createElement("span");
      qtyLabel.textContent = `${product.inCartQty}x ${product.name}`;

      const amountLabel = document.createElement("span");
      amountLabel.textContent = toMoney(product.inCartQty * product.price);

      lineItem.append(qtyLabel, amountLabel);
      productSummaryListEl.appendChild(lineItem);
    });
  }

  subtotalAmountEl.textContent = toMoney(cartState.totals.subtotal);
  taxAmountEl.textContent = toMoney(cartState.totals.tax);
  totalAmountEl.textContent = toMoney(cartState.totals.total);
}

function updateProductQuantity(productId, action) {
  const product = cartState.products.find((row) => String(row.id) === String(productId));
  if (!product) return;

  if (action === "increment") {
    product.selectorQty += 1;
  } else {
    product.selectorQty = Math.max(0, product.selectorQty - 1);
  }

  renderProducts();
}

function addSelectedProduct(productId) {
  const product = cartState.products.find((row) => String(row.id) === String(productId));
  if (!product || product.selectorQty <= 0) return;

  product.inCartQty += product.selectorQty;
  product.selectorQty = 0;
  renderProducts();
  renderSummary();
}

function resetProduct(productId) {
  const product = cartState.products.find((row) => String(row.id) === String(productId));
  if (!product) return;

  product.selectorQty = 0;
  product.inCartQty = 0;
  renderProducts();
  renderSummary();
}

function renderProducts() {
  if (!productsListEl || !productsEmptyStateEl) return;

  productsListEl.innerHTML = "";
  const hasProducts = cartState.products.length > 0;
  productsEmptyStateEl.hidden = hasProducts;

  if (!hasProducts) return;

  cartState.products.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.productId = String(product.id);

    const imageBox = document.createElement("div");
    imageBox.className = "img-box";
    imageBox.textContent = "img";

    const nameWrap = document.createElement("div");
    nameWrap.className = "product-copy";

    const name = document.createElement("p");
    name.className = "product-name";
    name.textContent = product.name;

    const price = document.createElement("p");
    price.className = "product-price";
    price.textContent = toMoney(product.price);

    nameWrap.append(name, price);

    const controls = document.createElement("div");
    controls.className = "controls";

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "add-btn";
    addButton.textContent = "Add";
    addButton.addEventListener("click", () => addSelectedProduct(product.id));

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "reset-btn";
    resetButton.textContent = "Reset";
    resetButton.addEventListener("click", () => resetProduct(product.id));

    const qtyRow = document.createElement("div");
    qtyRow.className = "qty-row";

    const decrementBtn = document.createElement("button");
    decrementBtn.type = "button";
    decrementBtn.className = "qty-btn";
    decrementBtn.textContent = "-";
    decrementBtn.addEventListener("click", () => updateProductQuantity(product.id, "decrement"));

    const qtyValue = document.createElement("span");
    qtyValue.className = "qty-value";
    qtyValue.textContent = String(product.selectorQty);

    const incrementBtn = document.createElement("button");
    incrementBtn.type = "button";
    incrementBtn.className = "qty-btn";
    incrementBtn.textContent = "+";
    incrementBtn.addEventListener("click", () => updateProductQuantity(product.id, "increment"));

    qtyRow.append(decrementBtn, qtyValue, incrementBtn);
    controls.append(addButton, resetButton, qtyRow);
    card.append(imageBox, nameWrap, controls);
    productsListEl.appendChild(card);
  });
}

async function resolveFamilyAccountId(email, paramFamilyAccountId) {
  if (paramFamilyAccountId) return paramFamilyAccountId;
  if (!email) return null;

  const { data, error } = await cartSupabaseClient
    .from("users")
    .select("family_account_id")
    .eq("email", email)
    .single();

  if (error) throw error;
  return data?.family_account_id || null;
}

async function loadProducts() {
  const { data, error } = await cartSupabaseClient
    .from("product")
    .select("id,name,price,active")
    .eq("active", true)
    .order("id", { ascending: true });

  if (error) throw error;

  cartState.products = (data || []).map((product) => ({
    id: product.id,
    name: product.name || "Product",
    price: Number(product.price || 0),
    active: Boolean(product.active),
    selectorQty: 0,
    inCartQty: 0
  }));
}

async function loadFamilyFreeTicketsBalance(familyAccountId) {
  if (!familyAccountId) return 0;

  const { data, error } = await cartSupabaseClient
    .from("familyaccount")
    .select("free_tickets_balance")
    .eq("id", familyAccountId)
    .single();

  if (error) throw error;
  return Number(data?.free_tickets_balance || 0);
}

function reconcileTicketSummaryWithBalance(freeTicketsBalance) {
  const regularSeatCount = cartState.ticketSummary.seatIds.reg.length;
  const luxurySeatCount = cartState.ticketSummary.seatIds.lux.length;
  const freeTickets = Math.min(Math.max(0, Number(freeTicketsBalance || 0)), regularSeatCount);
  const regularTickets = Math.max(0, regularSeatCount - freeTickets);
  const regularAmount = regularTickets * Number(cartState.ticketSummary.pricing.regPrice || 0);
  const luxuryAmount = luxurySeatCount * Number(cartState.ticketSummary.pricing.luxPrice || 0);

  cartState.ticketSummary = {
    ...cartState.ticketSummary,
    freeTickets,
    regularTickets,
    luxuryTickets: luxurySeatCount,
    regularAmount,
    luxuryAmount,
    ticketSubtotal: regularAmount + luxuryAmount,
    pricing: {
      ...cartState.ticketSummary.pricing,
      freeTicketsBalance: Number(freeTicketsBalance || 0)
    }
  };
}

async function loadTicketTypes() {
  const { data, error } = await cartSupabaseClient
    .from("tickettype")
    .select("id,name,price");

  if (error) throw error;
  return data || [];
}

function resolveTicketTypeIds(ticketTypes) {
  let regularTicketTypeId = null;
  let luxuryTicketTypeId = null;

  ticketTypes.forEach((ticketType) => {
    const normalizedName = String(ticketType.name || "").toLowerCase();
    if (!regularTicketTypeId && normalizedName.includes("regular")) {
      regularTicketTypeId = ticketType.id;
    }
    if (!luxuryTicketTypeId && normalizedName.includes("lux")) {
      luxuryTicketTypeId = ticketType.id;
    }
  });

  return { regularTicketTypeId, luxuryTicketTypeId };
}

function buildProductPurchaseItems(purchaseId) {
  const purchaseItems = [];

  cartState.products.forEach((product) => {
    for (let i = 0; i < product.inCartQty; i += 1) {
      purchaseItems.push({
        purchase_id: purchaseId,
        item_type: "product",
        reference_id: product.id,
        price: product.price
      });
    }
  });

  return purchaseItems;
}

function buildTicketRows(familyAccountId, regularTicketTypeId, luxuryTicketTypeId) {
  const rows = [];
  const recitalId = cartState.ticketSummary.recitalId;

  cartState.ticketSummary.seatIds.reg.forEach((seatId) => {
    rows.push({
      ticket_type_id: regularTicketTypeId,
      recital_id: recitalId,
      seat_id: Number(seatId),
      family_account_id: familyAccountId,
      dancer_id: null
    });
  });

  cartState.ticketSummary.seatIds.lux.forEach((seatId) => {
    rows.push({
      ticket_type_id: luxuryTicketTypeId,
      recital_id: recitalId,
      seat_id: Number(seatId),
      family_account_id: familyAccountId,
      dancer_id: null
    });
  });

  return rows;
}

function buildTicketPurchaseItems(purchaseId, insertedTickets) {
  const regularSeatIds = new Set(cartState.ticketSummary.seatIds.reg.map((seatId) => Number(seatId)));
  const freeRegularCount = Math.min(
    cartState.ticketSummary.freeTickets,
    cartState.ticketSummary.seatIds.reg.length
  );

  const regularTickets = [];
  const luxuryTickets = [];

  insertedTickets.forEach((ticket) => {
    if (regularSeatIds.has(Number(ticket.seat_id))) {
      regularTickets.push(ticket);
    } else {
      luxuryTickets.push(ticket);
    }
  });

  regularTickets.sort((a, b) => Number(a.seat_id) - Number(b.seat_id));
  luxuryTickets.sort((a, b) => Number(a.seat_id) - Number(b.seat_id));

  const purchaseItems = [];

  regularTickets.forEach((ticket, index) => {
    purchaseItems.push({
      purchase_id: purchaseId,
      item_type: "ticket",
      reference_id: ticket.id,
      price: index < freeRegularCount ? 0 : Number(cartState.ticketSummary.pricing.regPrice || 0)
    });
  });

  luxuryTickets.forEach((ticket) => {
    purchaseItems.push({
      purchase_id: purchaseId,
      item_type: "ticket",
      reference_id: ticket.id,
      price: Number(cartState.ticketSummary.pricing.luxPrice || 0)
    });
  });

  return purchaseItems;
}

function resetTicketSummary() {
  cartState.ticketSummary = createEmptyTicketSummary();
  localStorage.removeItem(CART_TICKET_KEY);
  renderSummary();
}

function clearProductSelections() {
  cartState.products = cartState.products.map((product) => ({
    ...product,
    selectorQty: 0,
    inCartQty: 0
  }));
  renderProducts();
  renderSummary();
}

function hasAnythingToCheckout() {
  const hasTickets =
    cartState.ticketSummary.seatIds.reg.length > 0 || cartState.ticketSummary.seatIds.lux.length > 0;
  const hasProducts = cartState.products.some((product) => product.inCartQty > 0);
  return hasTickets || hasProducts;
}

async function handleCheckout() {
  if (cartState.isCheckingOut) return;
  setStatus("");

  if (!cartSupabaseClient) {
    setStatus("Missing Supabase config.", "error");
    return;
  }

  if (!cartState.familyAccountId) {
    setStatus("Unable to resolve the family account for checkout.", "error");
    return;
  }

  if (!hasAnythingToCheckout()) {
    setStatus("Your cart is empty.", "error");
    return;
  }

  const hasTickets =
    cartState.ticketSummary.seatIds.reg.length > 0 || cartState.ticketSummary.seatIds.lux.length > 0;

  cartState.isCheckingOut = true;
  setCheckoutDisabled(true);
  setStatus("Saving your cart to the database...", "info");

  try {
    const currentFreeTicketsBalance = await loadFamilyFreeTicketsBalance(cartState.familyAccountId);
    reconcileTicketSummaryWithBalance(currentFreeTicketsBalance);
    renderSummary();

    let regularTicketTypeId = null;
    let luxuryTicketTypeId = null;

    if (hasTickets) {
      const ticketTypes = await loadTicketTypes();
      const resolvedIds = resolveTicketTypeIds(ticketTypes);
      regularTicketTypeId = resolvedIds.regularTicketTypeId;
      luxuryTicketTypeId = resolvedIds.luxuryTicketTypeId;

      if (cartState.ticketSummary.seatIds.reg.length > 0 && !regularTicketTypeId) {
        throw new Error("Regular ticket type is missing.");
      }

      if (cartState.ticketSummary.seatIds.lux.length > 0 && !luxuryTicketTypeId) {
        throw new Error("Luxury ticket type is missing.");
      }
    }

    const { data: purchaseRow, error: purchaseError } = await cartSupabaseClient
      .from("purchase")
      .insert({
        family_account_id: cartState.familyAccountId,
        total_amount: cartState.totals.total
      })
      .select("id")
      .single();

    if (purchaseError || !purchaseRow) {
      throw purchaseError || new Error("Failed to create purchase.");
    }

    let insertedTickets = [];
    if (hasTickets) {
      const ticketRows = buildTicketRows(
        cartState.familyAccountId,
        regularTicketTypeId,
        luxuryTicketTypeId
      );
      const { data: ticketData, error: ticketError } = await cartSupabaseClient
        .from("ticket")
        .insert(ticketRows)
        .select("id,seat_id");

      if (ticketError) {
        throw ticketError;
      }
      insertedTickets = ticketData || [];
    }

    const purchaseItems = [
      ...buildProductPurchaseItems(purchaseRow.id),
      ...buildTicketPurchaseItems(purchaseRow.id, insertedTickets)
    ];

    if (purchaseItems.length > 0) {
      const { error: purchaseItemError } = await cartSupabaseClient
        .from("purchaseitem")
        .insert(purchaseItems);

      if (purchaseItemError) {
        throw purchaseItemError;
      }
    }

    if (cartState.ticketSummary.freeTickets > 0) {
      const nextFreeTicketBalance = Math.max(
        0,
        currentFreeTicketsBalance - cartState.ticketSummary.freeTickets
      );

      const { error: familyUpdateError } = await cartSupabaseClient
        .from("familyaccount")
        .update({ free_tickets_balance: nextFreeTicketBalance })
        .eq("id", cartState.familyAccountId);

      if (familyUpdateError) {
        throw familyUpdateError;
      }
    }

    resetTicketSummary();
    clearProductSelections();
    setStatus("Cart saved to the database.", "success");
  } catch (error) {
    console.error("Cart checkout failed:", error);
    if (String(error?.message || "").toLowerCase().includes("duplicate")) {
      setStatus("One or more selected seats are no longer available.", "error");
    } else {
      setStatus(error?.message || "Checkout failed.", "error");
    }
  } finally {
    cartState.isCheckingOut = false;
    setCheckoutDisabled(!cartState.familyAccountId);
  }
}

async function initCartPage() {
  loadTicketSummaryFromStorage();
  renderSummary();
  setCheckoutDisabled(true);

  if (!cartSupabaseClient || !productsListEl) {
    setStatus("Missing Supabase config.", "error");
    return;
  }

  try {
    const identity = readIdentityContext();
    cartState.familyAccountId = await resolveFamilyAccountId(
      identity.email,
      identity.familyAccountId
    );
    await loadProducts();
    renderProducts();
    renderSummary();

    if (!cartState.familyAccountId) {
      setStatus("Loaded products, but no family account was found for checkout.", "error");
    } else if (!cartState.products.length) {
      setStatus("No active products are available right now.", "info");
    } else {
      setStatus("");
    }
  } catch (error) {
    console.error("Cart page init failed:", error);
    setStatus("Failed to load cart products from the database.", "error");
  } finally {
    setCheckoutDisabled(!cartState.familyAccountId);
  }
}

resetTicketsBtn?.addEventListener("click", () => {
  resetTicketSummary();
  setStatus("Ticket selections were cleared.", "info");
});

checkoutBtn?.addEventListener("click", handleCheckout);

initCartPage();
