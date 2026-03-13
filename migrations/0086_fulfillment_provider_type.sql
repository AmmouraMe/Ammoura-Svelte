-- Migration: 0086_fulfillment_provider_type
-- Description: Add provider_type and config columns to fulfillment_providers.
--              provider_type identifies the integration (manual, printful, etc.)
--              config stores provider-specific settings as encrypted JSON.
-- Rollback: ALTER TABLE fulfillment_providers DROP COLUMN provider_type;
--           ALTER TABLE fulfillment_providers DROP COLUMN config;

-- Add provider_type column (defaults to 'manual' for existing providers)
ALTER TABLE fulfillment_providers
ADD COLUMN provider_type TEXT NOT NULL DEFAULT 'manual';

-- Add config column for provider-specific settings (JSON, encrypted at app layer)
ALTER TABLE fulfillment_providers
ADD COLUMN config TEXT;

-- Index for filtering by provider type
CREATE INDEX IF NOT EXISTS idx_fulfillment_providers_type ON fulfillment_providers(site_id, provider_type);
