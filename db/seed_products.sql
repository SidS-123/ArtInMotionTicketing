-- Seed product catalog entries.
-- Safe to run multiple times.

BEGIN;

INSERT INTO product (name, price, active)
SELECT v.name, v.price, true
FROM (
  VALUES
    ('T-Shirt', 0.00::numeric),
    ('Flowers', 0.00::numeric),
    ('Bracelet', 0.00::numeric)
) AS v(name, price)
WHERE NOT EXISTS (
  SELECT 1
  FROM product p
  WHERE LOWER(TRIM(COALESCE(p.name, ''))) = LOWER(v.name)
);

-- Ensure these products are active if they already existed.
UPDATE product p
SET active = true
WHERE LOWER(TRIM(COALESCE(p.name, ''))) IN ('t-shirt', 'flowers', 'bracelet')
  AND COALESCE(p.active, false) = false;

COMMIT;

-- Quick verification
SELECT id, name, price, active
FROM product
WHERE LOWER(TRIM(COALESCE(name, ''))) IN ('t-shirt', 'flowers', 'bracelet')
ORDER BY name, id;
