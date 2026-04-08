const {
  buildSeatIdentityKey,
  loadVisualSeatMap,
  resolveSupabaseConfig,
  restFetch
} = require("./supabase_test_utils");

async function fetchAll(baseUrl, anonKey, table, query) {
  const result = await restFetch(baseUrl, anonKey, table, query);
  if (!result.ok) {
    throw new Error(`${table} query failed with HTTP ${result.status}: ${JSON.stringify(result.data)}`);
  }
  return Array.isArray(result.data) ? result.data : [];
}

function summarizeSeatCoverage(recitals, seatsByRecital, visualSeatKeys) {
  const expectedCount = visualSeatKeys.size;

  return recitals.map((recital) => {
    const rows = seatsByRecital.get(recital.id) || [];
    const dbKeys = new Set(
      rows
        .map((row) => buildSeatIdentityKey(row.section, row.row, row.number))
        .filter(Boolean)
    );
    const matchingCount = [...dbKeys].filter((key) => visualSeatKeys.has(key)).length;
    const extraCount = [...dbKeys].filter((key) => !visualSeatKeys.has(key)).length;
    const missingCount = [...visualSeatKeys].filter((key) => !dbKeys.has(key)).length;

    return {
      recitalId: recital.id,
      recitalName: recital.name || "Recital",
      seatRows: rows.length,
      expectedSeatRows: expectedCount,
      matchingVisualLabels: matchingCount,
      extraDbLabels: extraCount,
      missingVisualLabels: missingCount
    };
  });
}

async function main() {
  const { url, anonKey, rootDir } = resolveSupabaseConfig();
  if (!url || !anonKey) {
    throw new Error("Missing Supabase URL or anon key.");
  }

  const visualSeatMap = loadVisualSeatMap(rootDir);
  const visualSeatKeys = new Set(
    visualSeatMap.map((seat) => seat.dbKey).filter(Boolean)
  );

  const [recitals, ticketTypes, families, users, dancers, seats, tickets] = await Promise.all([
    fetchAll(url, anonKey, "recital", "select=id,name,day,time&order=day.asc,time.asc"),
    fetchAll(url, anonKey, "tickettype", "select=id,name,price&order=id.asc"),
    fetchAll(url, anonKey, "familyaccount", "select=id,family_name,free_tickets_balance&order=id.asc"),
    fetchAll(url, anonKey, "users", "select=id,email,family_account_id&order=id.asc"),
    fetchAll(url, anonKey, "dancer", "select=id,family_account_id,recital_ids&order=id.asc"),
    fetchAll(url, anonKey, "seat", "select=id,recital_id,section,row,number,status&order=recital_id.asc,id.asc"),
    fetchAll(url, anonKey, "ticket", "select=id,recital_id,seat_id,family_account_id&order=id.asc")
  ]);

  const seatsByRecital = new Map();
  seats.forEach((seat) => {
    const key = seat.recital_id;
    if (!seatsByRecital.has(key)) {
      seatsByRecital.set(key, []);
    }
    seatsByRecital.get(key).push(seat);
  });

  const familiesWithDancerRecitals = dancers
    .map((dancer) => ({
      familyAccountId: dancer.family_account_id,
      recitalIds: Array.isArray(dancer.recital_ids) ? dancer.recital_ids.filter(Boolean) : []
    }))
    .filter((row) => row.familyAccountId && row.recitalIds.length > 0);

  const regularTicketType = ticketTypes.find((row) =>
    String(row.name || "").toLowerCase().includes("regular")
  );
  const luxuryTicketType = ticketTypes.find((row) =>
    String(row.name || "").toLowerCase().includes("lux")
  );

  const duplicateSeatLabels = visualSeatMap.filter((seat) => seat.duplicateCount > 1).length;
  const seatCoverageFixed = summarizeSeatCoverage(recitals, seatsByRecital, visualSeatKeys);
  const recitalsWithFullVisualCoverage = seatCoverageFixed.filter(
    (row) => row.missingVisualLabels === 0 && row.extraDbLabels === 0
  ).length;

  const report = {
    checkedAt: new Date().toISOString(),
    sourceOfTruth: {
      visualSeatFile: "user_page/final-seatmap.json",
      visualSeatCount: visualSeatMap.length,
      duplicatedVisualSeatEntries: duplicateSeatLabels
    },
    counts: {
      recitals: recitals.length,
      ticketTypes: ticketTypes.length,
      families: families.length,
      users: users.length,
      dancers: dancers.length,
      seats: seats.length,
      tickets: tickets.length
    },
    assumptions: {
      hasRegularTicketType: Boolean(regularTicketType),
      hasLuxuryTicketType: Boolean(luxuryTicketType),
      hasFamiliesWithDancerRecitals: familiesWithDancerRecitals.length > 0,
      hasRecitals: recitals.length > 0,
      hasSeatsForEveryRecital: recitals.every((recital) => (seatsByRecital.get(recital.id) || []).length > 0),
      recitalsMatchVisualSeatMap: recitals.length > 0 && recitalsWithFullVisualCoverage === recitals.length
    },
    familyRecitalExamples: familiesWithDancerRecitals.slice(0, 5),
    seatCoverage: seatCoverageFixed
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
