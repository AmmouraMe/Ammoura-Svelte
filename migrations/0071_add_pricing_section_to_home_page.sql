-- Migration: 0071_add_pricing_section_to_home_page
-- Description: Add a Pricing section to the home page with anchorName="pricing" to match the navbar link
-- Also restores the Pricing link in the navbar that was previously removed
-- Rollback: Remove the pricing section from the home page

-- First, restore the pricing link in the navbar if it was removed
UPDATE components
SET config = REPLACE(
  config,
  '{"id":"products-link","type":"button","position":0,"config":{"label":"Products","url":"/#products","variant":"text","size":"medium","fullWidth":{"desktop":false,"tablet":false,"mobile":true}}},{"id":"login-button","type":"button","position":1,',
  '{"id":"products-link","type":"button","position":0,"config":{"label":"Products","url":"/#products","variant":"text","size":"medium","fullWidth":{"desktop":false,"tablet":false,"mobile":true}}},{"id":"pricing-link","type":"button","position":1,"config":{"label":"Pricing","url":"/#pricing","variant":"text","size":"medium","fullWidth":{"desktop":false,"tablet":false,"mobile":true}}},{"id":"login-button","type":"button","position":2,'
)
WHERE name = 'Navigation Bar'
  AND config NOT LIKE '%pricing-link%';

-- Update login-button position to 2 and user-dropdown position to 3
UPDATE components
SET config = REPLACE(
  REPLACE(
    config,
    '"id":"login-button","type":"button","position":1,',
    '"id":"login-button","type":"button","position":2,'
  ),
  '"id":"user-dropdown","type":"dropdown","position":2,',
  '"id":"user-dropdown","type":"dropdown","position":3,'
)
WHERE name = 'Navigation Bar'
  AND config LIKE '%pricing-link%';

-- Add the pricing section to the home page (inserted after home-features, before home-products)
-- We need to add anchorName:"pricing" to the pricing section
UPDATE page_revisions
SET widgets_snapshot = REPLACE(
  widgets_snapshot,
  '{"id":"home-products","type":"container","position":2,"config":{"anchorName":"products",',
  '{"id":"home-pricing","type":"pricing","position":2,"config":{"anchorName":"pricing","backgroundColor":"transparent","containerPadding":{"desktop":{"top":80,"right":24,"bottom":80,"left":24},"tablet":{"top":60,"right":20,"bottom":60,"left":20},"mobile":{"top":48,"right":16,"bottom":48,"left":16}},"containerMargin":{"desktop":{"top":0,"right":0,"bottom":0,"left":0},"tablet":{"top":0,"right":0,"bottom":0,"left":0},"mobile":{"top":0,"right":0,"bottom":0,"left":0}},"containerBackground":"transparent","containerBorderRadius":0,"containerMaxWidth":"100%","containerMinHeight":{"desktop":"auto","tablet":"auto","mobile":"auto"},"containerDisplay":{"desktop":"flex","tablet":"flex","mobile":"flex"},"containerFlexDirection":{"desktop":"column","tablet":"column","mobile":"column"},"containerAlignItems":"center","containerJustifyContent":"center","containerGap":{"desktop":48,"tablet":40,"mobile":32},"visibilityRule":"always","children":[{"id":"pricing-header","type":"container","position":0,"config":{"containerPadding":{"desktop":{"top":0,"right":0,"bottom":0,"left":0}},"containerDisplay":{"desktop":"flex","tablet":"flex","mobile":"flex"},"containerFlexDirection":{"desktop":"column","tablet":"column","mobile":"column"},"containerAlignItems":"center","containerJustifyContent":"center","containerGap":{"desktop":16,"tablet":12,"mobile":8},"containerMaxWidth":"800px","children":[{"id":"pricing-icon","type":"text","position":0,"config":{"text":"🚀","alignment":"center","fontSize":{"desktop":48,"tablet":40,"mobile":36}}},{"id":"pricing-title","type":"heading","position":1,"config":{"heading":"Simple, Transparent Pricing","level":2,"textColor":"#ffffff","alignment":"center","fontSize":{"desktop":48,"tablet":40,"mobile":32},"fontWeight":800}},{"id":"pricing-tagline","type":"text","position":2,"config":{"text":"Zero monthly fees. We only earn when you earn.","alignment":"center","textColor":"#94a3b8","fontSize":{"desktop":20,"tablet":18,"mobile":16},"fontWeight":500}},{"id":"pricing-subtitle","type":"text","position":3,"config":{"text":"Every store gets full access to all features.","alignment":"center","textColor":"#64748b","fontSize":{"desktop":16,"tablet":15,"mobile":14}}}]}},{"id":"pricing-card","type":"container","position":1,"config":{"containerPadding":{"desktop":{"top":32,"right":32,"bottom":32,"left":32},"tablet":{"top":24,"right":24,"bottom":24,"left":24},"mobile":{"top":24,"right":20,"bottom":24,"left":20}},"containerBackground":"rgba(30,41,59,0.6)","containerBorderRadius":16,"containerBorderWidth":1,"containerBorderColor":"rgba(71,85,105,0.5)","containerDisplay":{"desktop":"flex","tablet":"flex","mobile":"flex"},"containerFlexDirection":{"desktop":"column","tablet":"column","mobile":"column"},"containerAlignItems":"center","containerGap":{"desktop":24,"tablet":20,"mobile":16},"containerMaxWidth":"500px","children":[{"id":"price-display","type":"text","position":0,"config":{"text":"3% per transaction","alignment":"center","textColor":"#a78bfa","fontSize":{"desktop":36,"tablet":30,"mobile":24},"typography":{"fontWeight":"bold"}}},{"id":"price-note","type":"text","position":1,"config":{"text":"No monthly fees, no setup costs, no hidden charges","alignment":"center","textColor":"#94a3b8","fontSize":{"desktop":16,"tablet":15,"mobile":14}}},{"id":"pricing-cta","type":"button","position":2,"config":{"label":"Start Selling Today","url":"/auth/login","variant":"primary","size":"large","fullWidth":{"desktop":false,"tablet":false,"mobile":true},"backgroundColor":"#a78bfa","textColor":"#ffffff"}}]}}]}},{"id":"home-products","type":"container","position":3,"config":{"anchorName":"products",'
)
WHERE page_id = 'builtin-home-page';

-- Update home-cta position from 3 to 4
UPDATE page_revisions
SET widgets_snapshot = REPLACE(
  widgets_snapshot,
  '"id":"home-cta","type":"container","position":3,',
  '"id":"home-cta","type":"container","position":4,'
)
WHERE page_id = 'builtin-home-page';
