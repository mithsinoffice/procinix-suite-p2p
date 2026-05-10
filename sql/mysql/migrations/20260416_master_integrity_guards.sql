-- Master integrity guards
-- 1) remove legacy duplicate entity rows that have NULL approval state when a canonical row exists
-- 2) enforce unique entity code
-- 3) enforce one active pending approval per source object

DELETE dup
FROM `entity_master`.`entity_master` dup
JOIN `entity_master`.`entity_master` canonical
  ON canonical.record_code = dup.record_code
 AND canonical.id <> dup.id
 AND canonical.approval_status IS NOT NULL
WHERE dup.approval_status IS NULL;

ALTER TABLE `entity_master`.`entity_master`
  ADD UNIQUE INDEX uq_entity_master_record_code (record_code);

ALTER TABLE approvals
  ADD COLUMN pending_dedupe_key VARCHAR(255)
    GENERATED ALWAYS AS (
      CASE
        WHEN status = 'pending' THEN CONCAT(module, '::', reference_id)
        ELSE NULL
      END
    ) STORED,
  ADD UNIQUE INDEX uq_approvals_pending_dedupe (pending_dedupe_key);
