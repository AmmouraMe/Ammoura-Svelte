-- Migration: 0038_remove_flex_component
-- Description: Remove the Flex Box primitive component
-- The Container component already supports both flex and grid layouts
-- Rollback: Re-run migrations 0033-0035 to recreate the flex component

-- Remove Flex Box component from the components table
DELETE FROM components WHERE type = 'flex' AND is_global = 1;

-- Also remove any site-specific flex components that are primitive
DELETE FROM components WHERE type = 'flex' AND is_primitive = 1;
