-- Unify CEFR micro-level codes to plain ASCII across both modules so the CEFR
-- stage (CefrLevel) and VITAL (VitalLevel) share one scale. Renames existing
-- rows in place (FKs are by id, so mappings/recommendations are unaffected); the
-- seed then upserts the now-plain codes and adds the new micro-levels.

-- CEFR stage: superscript minus/plus -> plain hyphen/plus.
UPDATE "CefrLevel"
SET "code"  = replace(replace("code",  U&'\207B', '-'), U&'\207A', '+'),
    "label" = replace(replace("label", U&'\207B', '-'), U&'\207A', '+');

-- VITAL: U+2212 minus sign -> plain hyphen (the plus is already ASCII).
UPDATE "VitalLevel"
SET "code"  = replace("code",  U&'\2212', '-'),
    "label" = replace("label", U&'\2212', '-');
