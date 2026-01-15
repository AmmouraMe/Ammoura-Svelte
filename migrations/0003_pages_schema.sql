-- Pages table for custom page content management
-- Each page can have a custom URL and is editable via WYSIWYG editor
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL, -- URL path like '/about' or '/item/product-slug'
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  content TEXT, -- Optional legacy HTML/markdown content
  color_theme TEXT DEFAULT NULL, -- Page-specific color theme override (null = use site theme)
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  UNIQUE(site_id, slug)
);

-- Page widgets table for storing widget configurations on pages
-- Widgets are UI components like product displays, lists, etc.
CREATE TABLE IF NOT EXISTS page_widgets (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('single_product', 'product_list', 'text', 'image')),
  config TEXT NOT NULL, -- JSON configuration for the widget
  position INTEGER NOT NULL DEFAULT 0, -- Order of widget on page
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pages_site_id ON pages(site_id);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(site_id, slug);
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);
CREATE INDEX IF NOT EXISTS idx_page_widgets_page_id ON page_widgets(page_id);
CREATE INDEX IF NOT EXISTS idx_page_widgets_position ON page_widgets(page_id, position);
