-- Migration: 0066_navbar_position_static
-- Description: Set navbar position to static instead of sticky by default
-- The navbar should not be sticky by default - users can enable it in the builder if they want
-- Rollback: UPDATE components SET config = json_set(config, '$.position', json('{"desktop":{"type":"sticky","top":"0"},"tablet":{"type":"sticky","top":"0"},"mobile":{"type":"sticky","top":"0"}}')) WHERE type = 'navbar' AND is_global = 1;

-- Update all global navbar components to set position to static
UPDATE components 
SET 
  config = json_set(config, '$.position', json('{"desktop":{"type":"static"},"tablet":{"type":"static"},"mobile":{"type":"static"}}')),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'navbar' 
  AND is_global = 1;
