-- Migration: 0056_rename_hero_section_to_hero
-- Description: Rename "Hero Section" to "Hero" for consistency with other built-in components
-- Also updates the Hero component to use container-based architecture like Navbar and Footer
-- Rollback: UPDATE components SET name = 'Hero Section' WHERE name = 'Hero' AND is_global = 1 AND type = 'hero';

-- Rename the built-in Hero Section component to just Hero
UPDATE components 
SET name = 'Hero' 
WHERE name = 'Hero Section' AND is_global = 1 AND type = 'hero';
