-- Migration: 0057_fix_hero_component_type
-- Description: Fix the Hero component type from 'composite' to 'hero' so that reset works correctly
-- The Hero component should use the container-based architecture with proper hero defaults
-- Rollback: UPDATE components SET type = 'composite' WHERE name = 'Hero' AND is_global = 1;

-- Update Hero component type from 'composite' to 'hero'
-- This ensures resetBuiltInComponent uses the correct default config
UPDATE components 
SET type = 'hero',
    config = json_object(
        'containerPadding', json_object(
            'desktop', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0),
            'tablet', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0),
            'mobile', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0)
        ),
        'containerMargin', json_object(
            'desktop', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0),
            'tablet', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0),
            'mobile', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0)
        ),
        'containerBackground', 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        'containerBorderRadius', 0,
        'containerMaxWidth', '100%',
        'containerMinHeight', json_object('desktop', '600px', 'tablet', '500px', 'mobile', '450px'),
        'containerDisplay', json_object('desktop', 'block', 'tablet', 'block', 'mobile', 'block'),
        'containerWidth', json_object('desktop', '100%', 'tablet', '100%', 'mobile', '100%'),
        'visibilityRule', 'always',
        'children', json_array(
            json_object(
                'id', 'hero-main-container',
                'type', 'container',
                'position', 0,
                'config', json_object(
                    'containerPadding', json_object(
                        'desktop', json_object('top', 80, 'right', 24, 'bottom', 80, 'left', 24),
                        'tablet', json_object('top', 60, 'right', 20, 'bottom', 60, 'left', 20),
                        'mobile', json_object('top', 48, 'right', 16, 'bottom', 48, 'left', 16)
                    ),
                    'containerMargin', json_object(
                        'desktop', json_object('top', 0, 'right', 'auto', 'bottom', 0, 'left', 'auto'),
                        'tablet', json_object('top', 0, 'right', 'auto', 'bottom', 0, 'left', 'auto'),
                        'mobile', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0)
                    ),
                    'containerBackground', 'transparent',
                    'containerBorderRadius', 0,
                    'containerMaxWidth', '1200px',
                    'containerDisplay', json_object('desktop', 'flex', 'tablet', 'flex', 'mobile', 'flex'),
                    'containerFlexDirection', json_object('desktop', 'column', 'tablet', 'column', 'mobile', 'column'),
                    'containerAlignItems', 'center',
                    'containerJustifyContent', 'center',
                    'containerWrap', 'nowrap',
                    'containerGap', json_object('desktop', 24, 'tablet', 20, 'mobile', 16),
                    'children', json_array(
                        json_object(
                            'id', 'hero-badge',
                            'type', 'button',
                            'position', 0,
                            'config', json_object(
                                'label', '✨ Start Selling Online Today',
                                'url', '#',
                                'variant', 'outline',
                                'size', 'small',
                                'fullWidth', json_object('desktop', 0, 'tablet', 0, 'mobile', 0),
                                'buttonAlign', 'center',
                                'borderRadius', 999
                            )
                        ),
                        json_object(
                            'id', 'hero-title',
                            'type', 'text',
                            'position', 1,
                            'config', json_object(
                                'text', 'Build Your Online Store',
                                'fontSize', json_object('desktop', 64, 'tablet', 48, 'mobile', 36),
                                'fontWeight', '800',
                                'textAlign', 'center',
                                'color', 'theme:primary-foreground',
                                'fontFamily', 'system-ui, -apple-system, sans-serif',
                                'letterSpacing', '-0.025em',
                                'lineHeight', '1.1',
                                'marginBottom', json_object('desktop', 0, 'tablet', 0, 'mobile', 0)
                            )
                        ),
                        json_object(
                            'id', 'hero-subtitle',
                            'type', 'text',
                            'position', 2,
                            'config', json_object(
                                'text', 'Create beautiful, customizable storefronts with our intuitive WYSIWYG builder. No coding required.',
                                'fontSize', json_object('desktop', 20, 'tablet', 18, 'mobile', 16),
                                'fontWeight', '400',
                                'textAlign', 'center',
                                'color', 'rgba(255, 255, 255, 0.8)',
                                'fontFamily', 'system-ui, -apple-system, sans-serif',
                                'maxWidth', '600px',
                                'lineHeight', '1.6',
                                'marginBottom', json_object('desktop', 16, 'tablet', 12, 'mobile', 8)
                            )
                        ),
                        json_object(
                            'id', 'hero-buttons-container',
                            'type', 'container',
                            'position', 3,
                            'config', json_object(
                                'containerDisplay', json_object('desktop', 'flex', 'tablet', 'flex', 'mobile', 'flex'),
                                'containerFlexDirection', json_object('desktop', 'row', 'tablet', 'row', 'mobile', 'column'),
                                'containerAlignItems', 'center',
                                'containerJustifyContent', 'center',
                                'containerGap', json_object('desktop', 16, 'tablet', 12, 'mobile', 12),
                                'containerPadding', json_object(
                                    'desktop', json_object('top', 8, 'right', 0, 'bottom', 0, 'left', 0),
                                    'tablet', json_object('top', 8, 'right', 0, 'bottom', 0, 'left', 0),
                                    'mobile', json_object('top', 8, 'right', 0, 'bottom', 0, 'left', 0)
                                ),
                                'children', json_array(
                                    json_object(
                                        'id', 'hero-cta-primary',
                                        'type', 'button',
                                        'position', 0,
                                        'config', json_object(
                                            'label', 'Get Started Free',
                                            'url', '/signup',
                                            'variant', 'primary',
                                            'size', 'large',
                                            'fullWidth', json_object('desktop', 0, 'tablet', 0, 'mobile', 1)
                                        )
                                    ),
                                    json_object(
                                        'id', 'hero-cta-secondary',
                                        'type', 'button',
                                        'position', 1,
                                        'config', json_object(
                                            'label', 'Watch Demo',
                                            'url', '/demo',
                                            'variant', 'secondary',
                                            'size', 'large',
                                            'fullWidth', json_object('desktop', 0, 'tablet', 0, 'mobile', 1)
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            )
        )
    )
WHERE name = 'Hero' AND is_global = 1;
