-- Migration: 0044_fix_layout_component_references
-- Description: Change Default Layout to use component_ref type instead of navbar/footer with componentId
-- This makes it clear that the layout references the Navigation Bar and Footer components
-- instead of having its own navbar/footer widgets that happen to inherit component config.
-- Rollback: UPDATE layout_widgets SET type = 'navbar' WHERE type = 'component_ref' AND config LIKE '%"componentId":1%'; UPDATE layout_widgets SET type = 'footer' WHERE type = 'component_ref' AND config LIKE '%"componentId":2%';

-- Update navbar widget to component_ref type
UPDATE layout_widgets
SET type = 'component_ref'
WHERE type = 'navbar'
  AND config LIKE '%"componentId":%';

-- Update footer widget to component_ref type  
UPDATE layout_widgets
SET type = 'component_ref'
WHERE type = 'footer'
  AND config LIKE '%"componentId":%';
