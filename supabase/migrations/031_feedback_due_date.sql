-- Wires up the "Due date" field that Project Settings > Guest/Member Forms >
-- Fields has offered (as a "SOON" toggle) since the widget field editor
-- shipped — the widget can now collect it, so the column needs to exist.
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS due_date date;
