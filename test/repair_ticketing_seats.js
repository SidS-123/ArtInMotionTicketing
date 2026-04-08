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

async function insertRows(baseUrl, anonKey, table, rows) {
  if (!rows.length) {
    return { inserted: 0 };
  }

  const result = await restFetch(baseUrl, anonKey, table, "", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(rows)
  });

  if (!result.ok) {
    throw new Error(`${table} insert failed with HTTP ${result.status}: ${JSON.stringify(result.data)}`);
  }

  return {
    inserted: Array.isArray(result.data) ? result.data.length : rows.length
  };
}

async function deleteAllSeats(baseUrl, anonKey) {
  const result = await restFetch(baseUrl, anonKey, "seat", "id=gt.0", {
    method: "DELETE",
    headers: {
      Prefer: "return=minimal"
    }
  });

  if (!result.ok) {
    throw new Error(`seat delete failed with HTTP ${result.status}: ${JSON.stringify(result.data)}`);
  }
}

async function main() {
  const { url, anonKey, rootDir } = resolveSupabaseConfig();
  if (!url || !anonKey) {
    throw new Error("Missing Supabase URL or anon key.");
  }

  const visualSeatMap = loadVisualSeatMap(rootDir);
  const visualSeats = visualSeatMap.filter((seat) => seat.parsed && seat.dbKey);

  const [recitals, tickets, seats] = await Promise.all([
    fetchAll(url, anonKey, "recital", "select=id,name&order=id.asc"),
    fetchAll(url, anonKey, "ticket", "select=id&limit=1"),
    fetchAll(url, anonKey, "seat", "select=id,recital_id,section,row,number,status")
  ]);

  if (!recitals.length) {
    console.log(JSON.stringify({ changed: false, reason: "No recitals found." }, null, 2));
    return;
  }

  if (tickets.length > 0) {
    console.log(
      JSON.stringify(
        {
          changed: false,
          reason: "Existing ticket rows found. Repair script refuses to mutate seats once tickets exist."
        },
        null,
        2
      )
    );
    return;
  }

  const seatsByRecital = new Map();
  seats.forEach((seat) => {
    const recitalId = seat.recital_id;
    if (!seatsByRecital.has(recitalId)) {
      seatsByRecital.set(recitalId, []);
    }
    seatsByRecital.get(recitalId).push(seat);
  });

  const existingLabelsByRecital = new Map();
  seatsByRecital.forEach((rows, recitalId) => {
    existingLabelsByRecital.set(
      recitalId,
      new Set(
        rows
          .map((row) => buildSeatIdentityKey(row.section, row.row, row.number))
          .filter(Boolean)
      )
    );
  });

  const needsReset = recitals.some((recital) => {
    const existingKeys = existingLabelsByRecital.get(recital.id) || new Set();
    if (existingKeys.size !== visualSeats.length) {
      return true;
    }
    return visualSeats.some((seat) => !existingKeys.has(seat.dbKey));
  });

  if (needsReset && seats.length > 0) {
    await deleteAllSeats(url, anonKey);
  }

  const inserts = [];
  const coverage = [];

  recitals.forEach((recital) => {
    const existingLabels = needsReset ? new Set() : existingLabelsByRecital.get(recital.id) || new Set();
    let missingCount = 0;

    visualSeats.forEach((seat) => {
      if (existingLabels.has(seat.dbKey)) {
        return;
      }

      missingCount += 1;
      inserts.push({
        recital_id: recital.id,
        section: seat.parsed.section,
        row: seat.dbRow,
        number: seat.parsed.number,
        status: "available"
      });
    });

    coverage.push({
      recitalId: recital.id,
      recitalName: recital.name || "Recital",
      existingSeatLabels: existingLabels.size,
      missingVisualSeatLabels: missingCount
    });
  });

  const result = await insertRows(url, anonKey, "seat", inserts);
  console.log(
    JSON.stringify(
      {
        changed: result.inserted > 0,
        resetExistingSeats: needsReset && seats.length > 0,
        insertedSeatRows: result.inserted,
        visualSeatCountPerRecital: visualSeats.length,
        recitalCoverage: coverage
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
