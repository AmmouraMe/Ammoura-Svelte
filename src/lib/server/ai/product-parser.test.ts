import { describe, it, expect } from 'vitest';
import {
  extractJSON,
  parseProductCommand,
  hasProductCommand,
  type ProductCreationData
} from './product-parser';

describe('extractJSON', () => {
  it('extracts JSON from code fence', () => {
    const text = `Here is your product:

\`\`\`json
{
  "action": "create_product",
  "product": {
    "name": "Test Product"
  }
}
\`\`\`

Let me know if you need changes!`;

    const result = extractJSON(text);
    expect(result).toContain('"action": "create_product"');
    expect(result).toContain('"name": "Test Product"');
  });

  it('extracts JSON without code fence', () => {
    const text = `Product ready! {"action": "create_product", "product": {"name": "Wallet"}}`;
    const result = extractJSON(text);
    expect(result).toContain('"action": "create_product"');
  });

  it('returns null when no JSON found', () => {
    const text = 'Just a normal conversation with no JSON';
    expect(extractJSON(text)).toBeNull();
  });

  it('handles multiline JSON with nested objects', () => {
    const text = `\`\`\`json
{
  "action": "create_product",
  "product": {
    "name": "Leather Wallet",
    "seo": {
      "title": "Premium Leather Wallet",
      "keywords": ["wallet", "leather"]
    }
  }
}
\`\`\``;

    const result = extractJSON(text);
    expect(result).not.toBeNull();
    expect(result).toContain('"seo"');
  });
});

describe('parseProductCommand', () => {
  it('parses valid product creation command', () => {
    const response = `\`\`\`json
{
  "action": "create_product",
  "product": {
    "name": "Leather Wallet",
    "description": "Premium handmade leather wallet",
    "price": 45.00,
    "category": "Accessories",
    "type": "physical",
    "stock": 50,
    "tags": ["wallet", "leather", "handmade"]
  }
}
\`\`\``;

    const result = parseProductCommand(response);
    expect(result).not.toBeNull();
    expect(result?.action).toBe('create_product');

    if (result?.action === 'create_product') {
      expect(result.product.name).toBe('Leather Wallet');
      expect(result.product.price).toBe(45.0);
      expect(result.product.tags).toEqual(['wallet', 'leather', 'handmade']);
    }
  });

  it('parses command with optional fields', () => {
    const response = `{
  "action": "create_product",
  "product": {
    "name": "T-Shirt",
    "description": "Cotton t-shirt",
    "price": 19.99,
    "category": "Clothing",
    "type": "physical",
    "stock": 100,
    "tags": ["shirt", "clothing"],
    "image": "https://example.com/shirt.jpg",
    "variants": [
      {
        "name": "Size",
        "options": ["S", "M", "L", "XL"]
      }
    ],
    "seo": {
      "title": "Premium Cotton T-Shirt",
      "description": "High quality cotton t-shirt",
      "keywords": ["shirt", "cotton", "clothing"]
    }
  }
}`;

    const result = parseProductCommand(response) as ProductCreationData;
    expect(result).not.toBeNull();
    expect(result.product.image).toBe('https://example.com/shirt.jpg');
    expect(result.product.variants).toHaveLength(1);
    expect(result.product.variants?.[0].options).toEqual(['S', 'M', 'L', 'XL']);
    expect(result.product.seo?.title).toBe('Premium Cotton T-Shirt');
  });

  it('returns null for invalid JSON', () => {
    const response = 'This is not JSON at all';
    expect(parseProductCommand(response)).toBeNull();
  });

  it('returns null for missing required fields', () => {
    const response = `{
  "action": "create_product",
  "product": {
    "name": "Incomplete Product",
    "price": 10.00
  }
}`;

    expect(parseProductCommand(response)).toBeNull();
  });

  it('returns null for invalid product type', () => {
    const response = `{
  "action": "create_product",
  "product": {
    "name": "Product",
    "description": "Description",
    "price": 10,
    "category": "Category",
    "type": "invalid_type",
    "stock": 10,
    "tags": []
  }
}`;

    expect(parseProductCommand(response)).toBeNull();
  });

  it('parses update command', () => {
    const response = `{
  "action": "update_product",
  "productId": "prod_123",
  "updates": {
    "name": "Updated Product Name",
    "price": 29.99
  }
}`;

    const result = parseProductCommand(response);
    expect(result).not.toBeNull();
    expect(result?.action).toBe('update_product');

    if (result?.action === 'update_product') {
      expect(result.productId).toBe('prod_123');
      expect(result.updates.name).toBe('Updated Product Name');
      expect(result.updates.price).toBe(29.99);
    }
  });

  it('defaults image to empty string when not provided', () => {
    const response = `{
  "action": "create_product",
  "product": {
    "name": "Product",
    "description": "Description",
    "price": 10,
    "category": "Category",
    "type": "physical",
    "stock": 10,
    "tags": ["tag"]
  }
}`;

    const result = parseProductCommand(response) as ProductCreationData;
    expect(result).not.toBeNull();
    expect(result.product.image).toBe('');
  });
});

describe('hasProductCommand', () => {
  it('returns true when product command exists', () => {
    const response = `\`\`\`json
{
  "action": "create_product",
  "product": {
    "name": "Test",
    "description": "Test",
    "price": 10,
    "category": "Test",
    "type": "physical",
    "stock": 10,
    "tags": []
  }
}
\`\`\``;

    expect(hasProductCommand(response)).toBe(true);
  });

  it('returns false when no product command exists', () => {
    const response = 'Just a regular conversation';
    expect(hasProductCommand(response)).toBe(false);
  });

  it('returns false for malformed JSON', () => {
    const response = '```json\n{invalid json}\n```';
    expect(hasProductCommand(response)).toBe(false);
  });
});

describe('parseProductCommand edge cases', () => {
  it('returns null when product field is missing for create', () => {
    const response = `\`\`\`json
{"action": "create_product"}
\`\`\``;
    const result = parseProductCommand(response);
    expect(result).toBeNull();
  });

  it('returns null when productId is missing for update', () => {
    const response = `\`\`\`json
{"action": "update_product", "updates": {"name": "New Name"}}
\`\`\``;
    const result = parseProductCommand(response);
    expect(result).toBeNull();
  });

  it('returns null when updates is missing for update', () => {
    const response = `\`\`\`json
{"action": "update_product", "productId": "123"}
\`\`\``;
    const result = parseProductCommand(response);
    expect(result).toBeNull();
  });

  it('returns valid update when both productId and updates present', () => {
    const response = `\`\`\`json
{"action": "update_product", "productId": "123", "updates": {"name": "Updated"}}
\`\`\``;
    const result = parseProductCommand(response);
    expect(result).not.toBeNull();
    expect(result!.action).toBe('update_product');
  });

  it('returns null for unknown action type', () => {
    const response = `\`\`\`json
{"action": "delete_product", "productId": "123"}
\`\`\``;
    const result = parseProductCommand(response);
    expect(result).toBeNull();
  });

  it('returns null when action is missing', () => {
    const response = `\`\`\`json
{"type": "product", "name": "Test"}
\`\`\``;
    const result = parseProductCommand(response);
    expect(result).toBeNull();
  });

  it('returns null when action is not a string', () => {
    const response = `\`\`\`json
{"action": 123, "name": "Test"}
\`\`\``;
    const result = parseProductCommand(response);
    expect(result).toBeNull();
  });
});
