const { resolveSupabaseConfig, restFetch } = require("./supabase_test_utils");

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

async function main() {
  const { url, anonKey } = resolveSupabaseConfig();
  if (!url || !anonKey) {
    throw new Error("Missing Supabase URL or anon key.");
  }

  const ticketTypes = await fetchAll(url, anonKey, "tickettype", "select=id,name,price&order=id.asc");
  const existingNames = new Set(ticketTypes.map((row) => String(row.name || "").toLowerCase()));
  const inserts = [];

  if (![...existingNames].some((name) => name.includes("regular"))) {
    inserts.push({ name: "Regular Ticket", price: 5.0 });
  }

  if (![...existingNames].some((name) => name.includes("lux"))) {
    inserts.push({ name: "Luxury Ticket", price: 5.15 });
  }

  const result = await insertRows(url, anonKey, "tickettype", inserts);
  console.log(
    JSON.stringify(
      {
        changed: result.inserted > 0,
        insertedTicketTypes: result.inserted,
        existingTicketTypeCount: ticketTypes.length
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
