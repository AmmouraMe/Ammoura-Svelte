-- Migration: 0061_sync_pricing_component_with_defaults
-- Description: Sync Pricing component with the defaults from componentDefaults.ts
-- This ensures the database Pricing component matches exactly what resetBuiltInComponent produces.
-- Rollback: See previous component migrations for restoration

-- Update Pricing component
UPDATE components
SET
  config = '{
  "backgroundColor": "transparent",
  "containerPadding": {
    "desktop": {
      "top": 80,
      "right": 24,
      "bottom": 80,
      "left": 24
    },
    "tablet": {
      "top": 60,
      "right": 20,
      "bottom": 60,
      "left": 20
    },
    "mobile": {
      "top": 48,
      "right": 16,
      "bottom": 48,
      "left": 16
    }
  },
  "containerMargin": {
    "desktop": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    },
    "tablet": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    },
    "mobile": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    }
  },
  "containerBackground": "transparent",
  "containerBorderRadius": 0,
  "containerMaxWidth": "100%",
  "containerMinHeight": {
    "desktop": "auto",
    "tablet": "auto",
    "mobile": "auto"
  },
  "containerDisplay": {
    "desktop": "flex",
    "tablet": "flex",
    "mobile": "flex"
  },
  "containerFlexDirection": {
    "desktop": "column",
    "tablet": "column",
    "mobile": "column"
  },
  "containerAlignItems": "center",
  "containerJustifyContent": "center",
  "containerGap": {
    "desktop": 48,
    "tablet": 40,
    "mobile": 32
  },
  "visibilityRule": "always",
  "children": [
    {
      "id": "pricing-header",
      "type": "container",
      "position": 0,
      "config": {
        "containerPadding": {
          "desktop": {
            "top": 0,
            "right": 0,
            "bottom": 0,
            "left": 0
          }
        },
        "containerDisplay": {
          "desktop": "flex",
          "tablet": "flex",
          "mobile": "flex"
        },
        "containerFlexDirection": {
          "desktop": "column",
          "tablet": "column",
          "mobile": "column"
        },
        "containerAlignItems": "center",
        "containerJustifyContent": "center",
        "containerGap": {
          "desktop": 16,
          "tablet": 12,
          "mobile": 8
        },
        "containerMaxWidth": "800px",
        "children": [
          {
            "id": "pricing-icon",
            "type": "text",
            "position": 0,
            "config": {
              "text": "🚀",
              "alignment": "center",
              "fontSize": {
                "desktop": 48,
                "tablet": 40,
                "mobile": 36
              }
            }
          },
          {
            "id": "pricing-title",
            "type": "heading",
            "position": 1,
            "config": {
              "heading": "Hermes eCommerce Pricing",
              "level": 2,
              "textColor": "theme:text",
              "alignment": "center",
              "fontSize": {
                "desktop": 48,
                "tablet": 40,
                "mobile": 32
              },
              "fontWeight": 800
            }
          },
          {
            "id": "pricing-tagline",
            "type": "text",
            "position": 2,
            "config": {
              "text": "Zero monthly fees. We win when you win.",
              "alignment": "center",
              "color": "theme:textSecondary",
              "fontSize": {
                "desktop": 20,
                "tablet": 18,
                "mobile": 16
              },
              "fontWeight": 500
            }
          },
          {
            "id": "pricing-subtitle",
            "type": "text",
            "position": 3,
            "config": {
              "text": "Every store gets full access — we only earn a small % per sale.",
              "alignment": "center",
              "color": "theme:textSecondary",
              "fontSize": {
                "desktop": 16,
                "tablet": 15,
                "mobile": 14
              }
            }
          }
        ]
      }
    },
    {
      "id": "pricing-cards",
      "type": "container",
      "position": 1,
      "config": {
        "containerPadding": {
          "desktop": {
            "top": 0,
            "right": 0,
            "bottom": 0,
            "left": 0
          }
        },
        "containerDisplay": {
          "desktop": "grid",
          "tablet": "grid",
          "mobile": "flex"
        },
        "containerGridCols": {
          "desktop": 2,
          "tablet": 2,
          "mobile": 1
        },
        "containerFlexDirection": {
          "desktop": "row",
          "tablet": "row",
          "mobile": "column"
        },
        "containerGap": {
          "desktop": 32,
          "tablet": 24,
          "mobile": 24
        },
        "containerMaxWidth": "1200px",
        "containerWidth": {
          "desktop": "100%",
          "tablet": "100%",
          "mobile": "100%"
        },
        "children": [
          {
            "id": "features-card",
            "type": "container",
            "position": 0,
            "config": {
              "containerPadding": {
                "desktop": {
                  "top": 32,
                  "right": 32,
                  "bottom": 32,
                  "left": 32
                },
                "tablet": {
                  "top": 24,
                  "right": 24,
                  "bottom": 24,
                  "left": 24
                },
                "mobile": {
                  "top": 24,
                  "right": 20,
                  "bottom": 24,
                  "left": 20
                }
              },
              "containerBackground": "theme:surface",
              "containerBorderRadius": 16,
              "containerBorderWidth": 1,
              "containerBorderColor": "theme:border",
              "containerDisplay": {
                "desktop": "flex",
                "tablet": "flex",
                "mobile": "flex"
              },
              "containerFlexDirection": {
                "desktop": "column",
                "tablet": "column",
                "mobile": "column"
              },
              "containerGap": {
                "desktop": 24,
                "tablet": 20,
                "mobile": 16
              },
              "children": [
                {
                  "id": "features-header",
                  "type": "container",
                  "position": 0,
                  "config": {
                    "containerDisplay": {
                      "desktop": "flex",
                      "tablet": "flex",
                      "mobile": "flex"
                    },
                    "containerFlexDirection": {
                      "desktop": "column",
                      "tablet": "column",
                      "mobile": "column"
                    },
                    "containerAlignItems": "center",
                    "containerGap": {
                      "desktop": 8,
                      "tablet": 8,
                      "mobile": 6
                    },
                    "children": [
                      {
                        "id": "features-icon",
                        "type": "text",
                        "position": 0,
                        "config": {
                          "text": "💰",
                          "alignment": "center",
                          "fontSize": {
                            "desktop": 40,
                            "tablet": 36,
                            "mobile": 32
                          }
                        }
                      },
                      {
                        "id": "features-title",
                        "type": "heading",
                        "position": 1,
                        "config": {
                          "heading": "Pay-as-You-Grow",
                          "level": 3,
                          "textColor": "theme:text",
                          "alignment": "center",
                          "fontSize": {
                            "desktop": 24,
                            "tablet": 22,
                            "mobile": 20
                          },
                          "fontWeight": 700
                        }
                      },
                      {
                        "id": "features-subtitle",
                        "type": "text",
                        "position": 2,
                        "config": {
                          "text": "All features included, always.",
                          "alignment": "center",
                          "color": "theme:textSecondary",
                          "fontSize": {
                            "desktop": 15,
                            "tablet": 14,
                            "mobile": 14
                          }
                        }
                      }
                    ]
                  }
                },
                {
                  "id": "features-list",
                  "type": "container",
                  "position": 1,
                  "config": {
                    "containerDisplay": {
                      "desktop": "flex",
                      "tablet": "flex",
                      "mobile": "flex"
                    },
                    "containerFlexDirection": {
                      "desktop": "column",
                      "tablet": "column",
                      "mobile": "column"
                    },
                    "containerGap": {
                      "desktop": 0,
                      "tablet": 0,
                      "mobile": 0
                    },
                    "children": [
                      {
                        "id": "feature-1",
                        "type": "text",
                        "position": 0,
                        "config": {
                          "text": "✓ Unlimited products",
                          "color": "theme:text",
                          "fontSize": {
                            "desktop": 15,
                            "tablet": 14,
                            "mobile": 14
                          },
                          "padding": {
                            "desktop": {
                              "top": 16,
                              "right": 0,
                              "bottom": 16,
                              "left": 0
                            }
                          },
                          "borderBottom": "1px solid theme:border"
                        }
                      },
                      {
                        "id": "feature-2",
                        "type": "text",
                        "position": 1,
                        "config": {
                          "text": "✓ Free custom domain (optional)",
                          "color": "theme:text",
                          "fontSize": {
                            "desktop": 15,
                            "tablet": 14,
                            "mobile": 14
                          },
                          "padding": {
                            "desktop": {
                              "top": 16,
                              "right": 0,
                              "bottom": 16,
                              "left": 0
                            }
                          },
                          "borderBottom": "1px solid theme:border"
                        }
                      },
                      {
                        "id": "feature-3",
                        "type": "text",
                        "position": 2,
                        "config": {
                          "text": "✓ AI-powered builder (voice + text)",
                          "color": "theme:text",
                          "fontSize": {
                            "desktop": 15,
                            "tablet": 14,
                            "mobile": 14
                          },
                          "padding": {
                            "desktop": {
                              "top": 16,
                              "right": 0,
                              "bottom": 16,
                              "left": 0
                            }
                          },
                          "borderBottom": "1px solid theme:border"
                        }
                      },
                      {
                        "id": "feature-4",
                        "type": "text",
                        "position": 3,
                        "config": {
                          "text": "✓ Real-time analytics",
                          "color": "theme:text",
                          "fontSize": {
                            "desktop": 15,
                            "tablet": 14,
                            "mobile": 14
                          },
                          "padding": {
                            "desktop": {
                              "top": 16,
                              "right": 0,
                              "bottom": 16,
                              "left": 0
                            }
                          },
                          "borderBottom": "1px solid theme:border"
                        }
                      },
                      {
                        "id": "feature-5",
                        "type": "text",
                        "position": 4,
                        "config": {
                          "text": "✓ Secure checkout (credit card/crypto)",
                          "color": "theme:text",
                          "fontSize": {
                            "desktop": 15,
                            "tablet": 14,
                            "mobile": 14
                          },
                          "padding": {
                            "desktop": {
                              "top": 16,
                              "right": 0,
                              "bottom": 16,
                              "left": 0
                            }
                          },
                          "borderBottom": "1px solid theme:border"
                        }
                      },
                      {
                        "id": "feature-6",
                        "type": "text",
                        "position": 5,
                        "config": {
                          "text": "✓ AI product video generator",
                          "color": "theme:text",
                          "fontSize": {
                            "desktop": 15,
                            "tablet": 14,
                            "mobile": 14
                          },
                          "padding": {
                            "desktop": {
                              "top": 16,
                              "right": 0,
                              "bottom": 16,
                              "left": 0
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            "id": "tiers-card",
            "type": "container",
            "position": 1,
            "config": {
              "containerPadding": {
                "desktop": {
                  "top": 32,
                  "right": 32,
                  "bottom": 32,
                  "left": 32
                },
                "tablet": {
                  "top": 24,
                  "right": 24,
                  "bottom": 24,
                  "left": 24
                },
                "mobile": {
                  "top": 24,
                  "right": 20,
                  "bottom": 24,
                  "left": 20
                }
              },
              "containerBackground": "theme:surface",
              "containerBorderRadius": 16,
              "containerBorderWidth": 1,
              "containerBorderColor": "theme:border",
              "containerDisplay": {
                "desktop": "flex",
                "tablet": "flex",
                "mobile": "flex"
              },
              "containerFlexDirection": {
                "desktop": "column",
                "tablet": "column",
                "mobile": "column"
              },
              "containerGap": {
                "desktop": 24,
                "tablet": 20,
                "mobile": 16
              },
              "children": [
                {
                  "id": "tiers-header",
                  "type": "container",
                  "position": 0,
                  "config": {
                    "containerDisplay": {
                      "desktop": "flex",
                      "tablet": "flex",
                      "mobile": "flex"
                    },
                    "containerFlexDirection": {
                      "desktop": "column",
                      "tablet": "column",
                      "mobile": "column"
                    },
                    "containerAlignItems": "center",
                    "containerGap": {
                      "desktop": 8,
                      "tablet": 8,
                      "mobile": 6
                    },
                    "children": [
                      {
                        "id": "tiers-icon",
                        "type": "text",
                        "position": 0,
                        "config": {
                          "text": "💎",
                          "alignment": "center",
                          "fontSize": {
                            "desktop": 40,
                            "tablet": 36,
                            "mobile": 32
                          }
                        }
                      },
                      {
                        "id": "tiers-title",
                        "type": "heading",
                        "position": 1,
                        "config": {
                          "heading": "Revenue Share",
                          "level": 3,
                          "textColor": "theme:text",
                          "alignment": "center",
                          "fontSize": {
                            "desktop": 24,
                            "tablet": 22,
                            "mobile": 20
                          },
                          "fontWeight": 700
                        }
                      },
                      {
                        "id": "tiers-subtitle",
                        "type": "text",
                        "position": 2,
                        "config": {
                          "text": "Includes payment processor fees",
                          "alignment": "center",
                          "color": "theme:textSecondary",
                          "fontSize": {
                            "desktop": 15,
                            "tablet": 14,
                            "mobile": 14
                          }
                        }
                      }
                    ]
                  }
                },
                {
                  "id": "tiers-table",
                  "type": "container",
                  "position": 1,
                  "config": {
                    "containerDisplay": {
                      "desktop": "flex",
                      "tablet": "flex",
                      "mobile": "flex"
                    },
                    "containerFlexDirection": {
                      "desktop": "column",
                      "tablet": "column",
                      "mobile": "column"
                    },
                    "containerGap": {
                      "desktop": 8,
                      "tablet": 6,
                      "mobile": 6
                    },
                    "children": [
                      {
                        "id": "table-header",
                        "type": "container",
                        "position": 0,
                        "config": {
                          "containerDisplay": {
                            "desktop": "flex",
                            "tablet": "flex",
                            "mobile": "flex"
                          },
                          "containerFlexDirection": {
                            "desktop": "row",
                            "tablet": "row",
                            "mobile": "row"
                          },
                          "containerJustifyContent": "space-between",
                          "containerPadding": {
                            "desktop": {
                              "top": 8,
                              "right": 16,
                              "bottom": 8,
                              "left": 16
                            }
                          },
                          "children": [
                            {
                              "id": "header-sales",
                              "type": "text",
                              "position": 0,
                              "config": {
                                "text": "MONTHLY SALES",
                                "color": "theme:textSecondary",
                                "fontSize": {
                                  "desktop": 11,
                                  "tablet": 10,
                                  "mobile": 10
                                },
                                "fontWeight": 600,
                                "letterSpacing": "0.05em"
                              }
                            },
                            {
                              "id": "header-fee",
                              "type": "text",
                              "position": 1,
                              "config": {
                                "text": "FEE",
                                "color": "theme:textSecondary",
                                "fontSize": {
                                  "desktop": 11,
                                  "tablet": 10,
                                  "mobile": 10
                                },
                                "fontWeight": 600,
                                "letterSpacing": "0.05em"
                              }
                            }
                          ]
                        }
                      },
                      {
                        "id": "tier-1",
                        "type": "container",
                        "position": 1,
                        "config": {
                          "containerDisplay": {
                            "desktop": "flex",
                            "tablet": "flex",
                            "mobile": "flex"
                          },
                          "containerFlexDirection": {
                            "desktop": "row",
                            "tablet": "row",
                            "mobile": "row"
                          },
                          "containerJustifyContent": "space-between",
                          "containerAlignItems": "center",
                          "containerPadding": {
                            "desktop": {
                              "top": 16,
                              "right": 20,
                              "bottom": 16,
                              "left": 20
                            }
                          },
                          "containerBackground": "theme:surface",
                          "containerBorderRadius": 12,
                          "containerBorderWidth": 1,
                          "containerBorderColor": "theme:border",
                          "children": [
                            {
                              "id": "tier-1-info",
                              "type": "container",
                              "position": 0,
                              "config": {
                                "containerDisplay": {
                                  "desktop": "flex",
                                  "tablet": "flex",
                                  "mobile": "flex"
                                },
                                "containerFlexDirection": {
                                  "desktop": "column",
                                  "tablet": "column",
                                  "mobile": "column"
                                },
                                "containerGap": {
                                  "desktop": 4,
                                  "tablet": 4,
                                  "mobile": 2
                                },
                                "children": [
                                  {
                                    "id": "tier-1-range",
                                    "type": "text",
                                    "position": 0,
                                    "config": {
                                      "text": "$0 – $1,000",
                                      "color": "theme:text",
                                      "fontSize": {
                                        "desktop": 16,
                                        "tablet": 15,
                                        "mobile": 14
                                      },
                                      "fontWeight": 600
                                    }
                                  },
                                  {
                                    "id": "tier-1-desc",
                                    "type": "text",
                                    "position": 1,
                                    "config": {
                                      "text": "Perfect for getting started",
                                      "color": "theme:textSecondary",
                                      "fontSize": {
                                        "desktop": 14,
                                        "tablet": 13,
                                        "mobile": 12
                                      }
                                    }
                                  }
                                ]
                              }
                            },
                            {
                              "id": "tier-1-fee",
                              "type": "text",
                              "position": 1,
                              "config": {
                                "text": "8%",
                                "color": "theme:accent",
                                "fontSize": {
                                  "desktop": 28,
                                  "tablet": 24,
                                  "mobile": 22
                                },
                                "fontWeight": 700
                              }
                            }
                          ]
                        }
                      },
                      {
                        "id": "tier-2",
                        "type": "container",
                        "position": 2,
                        "config": {
                          "containerDisplay": {
                            "desktop": "flex",
                            "tablet": "flex",
                            "mobile": "flex"
                          },
                          "containerFlexDirection": {
                            "desktop": "row",
                            "tablet": "row",
                            "mobile": "row"
                          },
                          "containerJustifyContent": "space-between",
                          "containerAlignItems": "center",
                          "containerPadding": {
                            "desktop": {
                              "top": 16,
                              "right": 20,
                              "bottom": 16,
                              "left": 20
                            }
                          },
                          "containerBackground": "theme:surface",
                          "containerBorderRadius": 12,
                          "containerBorderWidth": 1,
                          "containerBorderColor": "theme:border",
                          "children": [
                            {
                              "id": "tier-2-info",
                              "type": "container",
                              "position": 0,
                              "config": {
                                "containerDisplay": {
                                  "desktop": "flex",
                                  "tablet": "flex",
                                  "mobile": "flex"
                                },
                                "containerFlexDirection": {
                                  "desktop": "column",
                                  "tablet": "column",
                                  "mobile": "column"
                                },
                                "containerGap": {
                                  "desktop": 4,
                                  "tablet": 4,
                                  "mobile": 2
                                },
                                "children": [
                                  {
                                    "id": "tier-2-range",
                                    "type": "text",
                                    "position": 0,
                                    "config": {
                                      "text": "$1,001 – $5,000",
                                      "color": "theme:text",
                                      "fontSize": {
                                        "desktop": 16,
                                        "tablet": 15,
                                        "mobile": 14
                                      },
                                      "fontWeight": 600
                                    }
                                  },
                                  {
                                    "id": "tier-2-desc",
                                    "type": "text",
                                    "position": 1,
                                    "config": {
                                      "text": "Growing your business",
                                      "color": "theme:textSecondary",
                                      "fontSize": {
                                        "desktop": 14,
                                        "tablet": 13,
                                        "mobile": 12
                                      }
                                    }
                                  }
                                ]
                              }
                            },
                            {
                              "id": "tier-2-fee",
                              "type": "text",
                              "position": 1,
                              "config": {
                                "text": "6%",
                                "color": "theme:accent",
                                "fontSize": {
                                  "desktop": 28,
                                  "tablet": 24,
                                  "mobile": 22
                                },
                                "fontWeight": 700
                              }
                            }
                          ]
                        }
                      },
                      {
                        "id": "tier-3",
                        "type": "container",
                        "position": 3,
                        "config": {
                          "containerDisplay": {
                            "desktop": "flex",
                            "tablet": "flex",
                            "mobile": "flex"
                          },
                          "containerFlexDirection": {
                            "desktop": "row",
                            "tablet": "row",
                            "mobile": "row"
                          },
                          "containerJustifyContent": "space-between",
                          "containerAlignItems": "center",
                          "containerPadding": {
                            "desktop": {
                              "top": 16,
                              "right": 20,
                              "bottom": 16,
                              "left": 20
                            }
                          },
                          "containerBackground": "theme:surface",
                          "containerBorderRadius": 12,
                          "containerBorderWidth": 1,
                          "containerBorderColor": "theme:border",
                          "children": [
                            {
                              "id": "tier-3-info",
                              "type": "container",
                              "position": 0,
                              "config": {
                                "containerDisplay": {
                                  "desktop": "flex",
                                  "tablet": "flex",
                                  "mobile": "flex"
                                },
                                "containerFlexDirection": {
                                  "desktop": "column",
                                  "tablet": "column",
                                  "mobile": "column"
                                },
                                "containerGap": {
                                  "desktop": 4,
                                  "tablet": 4,
                                  "mobile": 2
                                },
                                "children": [
                                  {
                                    "id": "tier-3-range",
                                    "type": "text",
                                    "position": 0,
                                    "config": {
                                      "text": "$5,001 – $20,000",
                                      "color": "theme:text",
                                      "fontSize": {
                                        "desktop": 16,
                                        "tablet": 15,
                                        "mobile": 14
                                      },
                                      "fontWeight": 600
                                    }
                                  },
                                  {
                                    "id": "tier-3-desc",
                                    "type": "text",
                                    "position": 1,
                                    "config": {
                                      "text": "Established sales",
                                      "color": "theme:textSecondary",
                                      "fontSize": {
                                        "desktop": 14,
                                        "tablet": 13,
                                        "mobile": 12
                                      }
                                    }
                                  }
                                ]
                              }
                            },
                            {
                              "id": "tier-3-fee",
                              "type": "text",
                              "position": 1,
                              "config": {
                                "text": "4%",
                                "color": "theme:accent",
                                "fontSize": {
                                  "desktop": 28,
                                  "tablet": 24,
                                  "mobile": 22
                                },
                                "fontWeight": 700
                              }
                            }
                          ]
                        }
                      },
                      {
                        "id": "tier-4",
                        "type": "container",
                        "position": 4,
                        "config": {
                          "containerDisplay": {
                            "desktop": "flex",
                            "tablet": "flex",
                            "mobile": "flex"
                          },
                          "containerFlexDirection": {
                            "desktop": "row",
                            "tablet": "row",
                            "mobile": "row"
                          },
                          "containerJustifyContent": "space-between",
                          "containerAlignItems": "center",
                          "containerPadding": {
                            "desktop": {
                              "top": 16,
                              "right": 20,
                              "bottom": 16,
                              "left": 20
                            }
                          },
                          "containerBackground": "theme:surface",
                          "containerBorderRadius": 12,
                          "containerBorderWidth": 2,
                          "containerBorderColor": "theme:accent",
                          "children": [
                            {
                              "id": "tier-4-info",
                              "type": "container",
                              "position": 0,
                              "config": {
                                "containerDisplay": {
                                  "desktop": "flex",
                                  "tablet": "flex",
                                  "mobile": "flex"
                                },
                                "containerFlexDirection": {
                                  "desktop": "column",
                                  "tablet": "column",
                                  "mobile": "column"
                                },
                                "containerGap": {
                                  "desktop": 4,
                                  "tablet": 4,
                                  "mobile": 2
                                },
                                "children": [
                                  {
                                    "id": "tier-4-range",
                                    "type": "text",
                                    "position": 0,
                                    "config": {
                                      "text": "$20,001+",
                                      "color": "theme:text",
                                      "fontSize": {
                                        "desktop": 16,
                                        "tablet": 15,
                                        "mobile": 14
                                      },
                                      "fontWeight": 600
                                    }
                                  },
                                  {
                                    "id": "tier-4-desc",
                                    "type": "text",
                                    "position": 1,
                                    "config": {
                                      "text": "High volume discounts",
                                      "color": "theme:textSecondary",
                                      "fontSize": {
                                        "desktop": 14,
                                        "tablet": 13,
                                        "mobile": 12
                                      }
                                    }
                                  }
                                ]
                              }
                            },
                            {
                              "id": "tier-4-fee",
                              "type": "text",
                              "position": 1,
                              "config": {
                                "text": "3%",
                                "color": "theme:accent",
                                "fontSize": {
                                  "desktop": 28,
                                  "tablet": 24,
                                  "mobile": 22
                                },
                                "fontWeight": 700
                              }
                            }
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    },
    {
      "id": "pricing-cta",
      "type": "container",
      "position": 2,
      "config": {
        "containerPadding": {
          "desktop": {
            "top": 0,
            "right": 0,
            "bottom": 0,
            "left": 0
          }
        },
        "containerDisplay": {
          "desktop": "flex",
          "tablet": "flex",
          "mobile": "flex"
        },
        "containerFlexDirection": {
          "desktop": "column",
          "tablet": "column",
          "mobile": "column"
        },
        "containerAlignItems": "center",
        "containerGap": {
          "desktop": 16,
          "tablet": 12,
          "mobile": 8
        },
        "children": [
          {
            "id": "cta-button",
            "type": "button",
            "position": 0,
            "config": {
              "label": "Get Started Free →",
              "url": "#",
              "variant": "filled",
              "size": "large",
              "fullWidth": {
                "desktop": false,
                "tablet": false,
                "mobile": true
              },
              "borderRadius": 12,
              "backgroundColor": "theme:accent",
              "textColor": "theme:text",
              "padding": {
                "desktop": {
                  "top": 16,
                  "right": 40,
                  "bottom": 16,
                  "left": 40
                }
              },
              "fontSize": {
                "desktop": 18,
                "tablet": 16,
                "mobile": 16
              },
              "fontWeight": 600
            }
          }
        ]
      }
    }
  ]
}',
  type = 'pricing',
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'Pricing' AND is_global = 1;
