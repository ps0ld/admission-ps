-- Phase 2 (F): branch rules for Lateral courses.
-- Run once on the Neon database (Neon console > SQL Editor). Safe to run more than once.
-- Adds one nullable column. Existing rows and the live site (main branch) are not affected.
ALTER TABLE courses ADD COLUMN IF NOT EXISTS allowed_branches VARCHAR(500);
