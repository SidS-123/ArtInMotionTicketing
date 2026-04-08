-- Seed seats for every recital using the shared venue layout.
-- Safe to run multiple times (will not duplicate existing seats).

WITH layout(section, row_num, seat_count) AS (
  VALUES
    ('A', 1, 8), ('A', 2, 9), ('A', 3, 10), ('A', 4, 10), ('A', 5, 10),
    ('A', 6, 9), ('A', 7, 9), ('A', 8, 8), ('A', 9, 8), ('A', 10, 7), ('A', 11, 7),
    ('B', 1, 10), ('B', 2, 11), ('B', 3, 12), ('B', 4, 12), ('B', 5, 12),
    ('B', 6, 11), ('B', 7, 11), ('B', 8, 10), ('B', 9, 10), ('B', 10, 9), ('B', 11, 9),
    ('C', 1, 12), ('C', 2, 13), ('C', 3, 14), ('C', 4, 14), ('C', 5, 14),
    ('C', 6, 13), ('C', 7, 13), ('C', 8, 12), ('C', 9, 12), ('C', 10, 11), ('C', 11, 11),
    ('D', 1, 10), ('D', 2, 11), ('D', 3, 12), ('D', 4, 12), ('D', 5, 12),
    ('D', 6, 11), ('D', 7, 11), ('D', 8, 10), ('D', 9, 10), ('D', 10, 9), ('D', 11, 9),
    ('E', 1, 8), ('E', 2, 9), ('E', 3, 10), ('E', 4, 10), ('E', 5, 10),
    ('E', 6, 9), ('E', 7, 9), ('E', 8, 8), ('E', 9, 8), ('E', 10, 7), ('E', 11, 7)
),
recitals AS (
  SELECT id AS recital_id
  FROM recital
),
seat_rows AS (
  SELECT
    r.recital_id,
    l.section,
    l.row_num::text AS row,
    gs AS number
  FROM recitals r
  CROSS JOIN layout l
  CROSS JOIN LATERAL generate_series(1, l.seat_count) gs
)
INSERT INTO seat (recital_id, section, row, number, status)
SELECT
  seat_rows.recital_id,
  seat_rows.section,
  seat_rows.row,
  seat_rows.number,
  'available'
FROM seat_rows
WHERE NOT EXISTS (
  SELECT 1
  FROM seat s
  WHERE s.recital_id = seat_rows.recital_id
    AND s.section = seat_rows.section
    AND s.row = seat_rows.row
    AND s.number = seat_rows.number
);
