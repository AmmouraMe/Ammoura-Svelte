export type ProductType = 'physical' | 'service' | 'digital';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  type: ProductType;
  tags: string[];
  fulfillmentOptions?: Array<{
    providerId: string;
    providerName: string;
    cost: number;
    stockQuantity: number;
    sortOrder: number;
  }>;
  shippingOptions?: Array<{
    shippingOptionId: string;
    optionName: string;
    isDefault: boolean;
    priceOverride?: number | null;
    thresholdOverride?: number | null;
  }>;
}

export interface CartItem extends Product {
  quantity: number;
}

// Re-export checkout types
export type {
  ShippingAddress,
  BillingAddress,
  PaymentMethod,
  OrderItem,
  Order,
  CheckoutFormData,
  CheckoutValidationErrors
} from './checkout';

// Re-export page types
export type {
  PageStatus,
  ComponentType,
  WidgetType, // @deprecated - use ComponentType
  Page,
  PageComponent,
  PageWidget, // @deprecated - use PageComponent
  ComponentConfig,
  WidgetConfig, // @deprecated - use ComponentConfig
  PageWithComponents,
  PageWithWidgets, // @deprecated - use PageWithComponents
  PageFormData,
  ComponentFormData,
  WidgetFormData, // @deprecated - use ComponentFormData
  LayoutComponent,
  LayoutWidget, // @deprecated - use LayoutComponent
  ChildComponent,
  ComponentWidget, // @deprecated - use ChildComponent
  ComponentWithChildren,
  ComponentWithWidgets // @deprecated - use ComponentWithChildren
} from './pages';

// Re-export media types
export type { MediaType, ProductMedia, MediaLibraryItem, MediaUploadResult } from './media';

// Re-export role and permission types
export type {
  Permission,
  Role,
  RolePermission,
  RoleWithPermissions,
  CreateRoleData,
  UpdateRoleData,
  PermissionCategory
} from './roles';

// Re-export activity log types
export type {
  ActivityLog,
  ActivityLogMetadata,
  CreateActivityLogData,
  ActivityLogFilter,
  EntityType
} from './activity-logs';

// Re-export notification types
export type {
  Notification,
  NotificationMetadata,
  CreateNotificationData,
  NotificationType
} from './notifications';

// Re-export fulfillment types
export type {
  FulfillmentProvider,
  DBFulfillmentProvider,
  CreateFulfillmentProviderData,
  UpdateFulfillmentProviderData,
  ProductFulfillmentOption,
  DBProductFulfillmentOption,
  CreateProductFulfillmentOptionData
} from './fulfillment';

// Re-export shipping types
export type {
  ShippingOption,
  ProductShippingOption,
  CategoryShippingOption,
  CreateShippingOptionData,
  UpdateShippingOptionData,
  ProductShippingAssignment,
  CategoryShippingAssignment,
  AvailableShippingOption
} from './shipping';

// Re-export OAuth types
export type { OAuthProvider, OAuthProviderConfig, OAuthUserProfile } from './oauth';
