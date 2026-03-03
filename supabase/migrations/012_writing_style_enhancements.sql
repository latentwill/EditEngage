-- Enhanced writing style model: add structural_template, vocabulary_level,
-- point_of_view, and anti_patterns columns to writing_styles table.
-- All columns are nullable to preserve backward compatibility.

ALTER TABLE writing_styles ADD COLUMN structural_template text;
ALTER TABLE writing_styles ADD COLUMN vocabulary_level text;
ALTER TABLE writing_styles ADD COLUMN point_of_view text;
ALTER TABLE writing_styles ADD COLUMN anti_patterns jsonb DEFAULT '[]'::jsonb;
