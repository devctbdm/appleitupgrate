import api from './axios';

export type AuditLog = {
  _id: string;
  actor?: { id?: string; name?: string; role?: string };
  action: string;
  target?: string;
  changes?: { request?: Record<string, unknown>; statusCode?: number } | null;
  ip?: string;
  userAgent?: string;
  createdAt: string;
};

export const auditApi = {
  getAll: (params: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
    status?: string;
  }) =>
    api.get<{
      success: boolean;
      logs: AuditLog[];
      total: number;
      pages: number;
    }>('/audit', { params }),
};

export type Category = {
  _id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  active: boolean;
  productCount?: number;
  imageUrl: string;
  bannerUrl: string;
  featured: boolean;
  sortOrder: number;
  color: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CategoryForm = {
  name: string;
  slug?: string;
  description: string;
  parentId: string | null;
  active: boolean;
  imageUrl: string;
  bannerUrl: string;
  featured: boolean;
  sortOrder: number;
  color: string;
};

function toFormData(
  data: Record<string, any>,
  files?: { image?: File | null; banner?: File | null }
): FormData {
  const fd = new FormData();
  for (const [key, val] of Object.entries(data)) {
    if (val !== null && val !== undefined) {
      fd.append(key, String(val));
    }
  }
  if (files?.image) fd.append('image', files.image);
  if (files?.banner) fd.append('banner', files.banner);
  return fd;
}

export const categoryApi = {
  getAll: () =>
    api.get<{ success: boolean; categories: Category[] }>('/categories'),

  getById: (id: string) =>
    api.get<{ success: boolean; category: Category }>(`/categories/${id}`),

  create: (
    data: CategoryForm,
    files?: { image?: File | null; banner?: File | null }
  ) =>
    api.post<{ success: boolean; category: Category }>(
      '/categories',
      toFormData(data as any, files)
    ),

  update: (
    id: string,
    data: Partial<CategoryForm>,
    files?: { image?: File | null; banner?: File | null }
  ) =>
    api.put<{ success: boolean; category: Category }>(
      `/categories/${id}`,
      toFormData(data as any, files)
    ),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/categories/${id}`),

  reorder: (orders: { id: string; sortOrder: number }[]) =>
    api.put<{ success: boolean; message: string }>('/categories/reorder', {
      orders,
    }),
};

export type SliderType = 'hero' | 'ad_top' | 'ad_bottom';

export type Slider = {
  _id: string;
  title: string;
  description: string;
  image: string;
  link: string;
  type: SliderType;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type HomeSliderText = {
  _id: string;
  text: string;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type HomeSliderTextForm = {
  text: string;
  active: boolean;
  sortOrder: number;
};

export type SliderForm = {
  title: string;
  description: string;
  image: string;
  link: string;
  type: SliderType;
  active: boolean;
  sortOrder: number;
};

export const sliderApi = {
  getAll: (params?: { active?: boolean }) =>
    api.get<{ success: boolean; sliders: Slider[] }>('/sliders', {
      params: params
        ? { active: params.active ? 'true' : undefined }
        : undefined,
    }),

  create: (data: SliderForm, image?: File | null) =>
    api.post<{ success: boolean; slider: Slider }>(
      '/sliders',
      toFormData(data as any, { image })
    ),

  update: (id: string, data: Partial<SliderForm>, image?: File | null) =>
    api.put<{ success: boolean; slider: Slider }>(
      `/sliders/${id}`,
      toFormData(data as any, { image })
    ),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/sliders/${id}`),

  reorder: (orders: { id: string; sortOrder: number }[]) =>
    api.put<{ success: boolean; message: string }>('/sliders/reorder', {
      orders,
    }),
};

export const homeSliderTextApi = {
  getAll: (params?: { active?: boolean }) =>
    api.get<{ success: boolean; texts: HomeSliderText[] }>(
      '/home-slider-texts',
      {
        params: params
          ? { active: params.active ? 'true' : undefined }
          : undefined,
      }
    ),

  create: (data: HomeSliderTextForm) =>
    api.post<{ success: boolean; text: HomeSliderText }>(
      '/home-slider-texts',
      data
    ),

  update: (id: string, data: Partial<HomeSliderTextForm>) =>
    api.put<{ success: boolean; text: HomeSliderText }>(
      `/home-slider-texts/${id}`,
      data
    ),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(
      `/home-slider-texts/${id}`
    ),

  reorder: (orders: { id: string; sortOrder: number }[]) =>
    api.put<{ success: boolean; message: string }>(
      '/home-slider-texts/reorder',
      {
        orders,
      }
    ),
};

export type HomeContent = {
  _id: string | null;
  content: string;
  enabled: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export const homeContentApi = {
  get: () =>
    api.get<{ success: boolean; homeContent: HomeContent }>('/home-content'),

  update: (data: { content: string; enabled: boolean }) =>
    api.put<{ success: boolean; homeContent: HomeContent }>(
      '/home-content',
      data
    ),

  delete: () =>
    api.delete<{ success: boolean; message: string }>('/home-content'),
};

export type PopupOffer = {
  _id: string | null;
  image: string;
  enabled: boolean;
  delaySeconds: number;
  maxShowsPerDay: number;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export const popupOfferApi = {
  get: () =>
    api.get<{ success: boolean; popupOffer: PopupOffer }>('/popup-offer'),

  update: (data: FormData) =>
    api.put<{ success: boolean; popupOffer: PopupOffer }>('/popup-offer', data),
};

export type AdminUser = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedResponse<T> = {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  users: T[];
};

export const userApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }) => api.get<PaginatedResponse<AdminUser>>('/users', { params }),

  getById: (id: string) =>
    api.get<{ success: boolean; user: AdminUser }>(`/users/${id}`),

  create: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role?: string;
    status?: string;
  }) => api.post<{ success: boolean; user: AdminUser }>('/users', data),

  update: (
    id: string,
    data: Partial<{
      name: string;
      email: string;
      phone: string;
      role: string;
      status: string;
      password: string;
    }>
  ) => api.put<{ success: boolean; user: AdminUser }>(`/users/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/users/${id}`),
};

export type Customer = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  status: string | null;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
};

export type CustomerPaginatedResponse = {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  customers: Customer[];
};

export const customerApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) => api.get<CustomerPaginatedResponse>('/customers', { params }),

  getById: (id: string) =>
    api.get<{ success: boolean; customer: Customer }>(`/customers/${id}`),

  remove: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/customers/${id}`),
};

export type TeamMember = {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'super_admin';
  active: boolean;
  password?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
};

export type TeamMemberPayload = {
  name?: string;
  email?: string;
  role?: string;
  active?: boolean;
  password?: string;
};

export const teamApi = {
  getAll: () => api.get<{ success: boolean; members: TeamMember[] }>('/team'),

  create: (data: {
    name: string;
    email: string;
    role: string;
    password?: string;
    active?: boolean;
  }) => api.post<{ success: boolean; member: TeamMember }>('/team', data),

  update: (id: string, data: TeamMemberPayload) =>
    api.put<{ success: boolean; member: TeamMember }>(`/team/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/team/${id}`),
};

export type Session = {
  _id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
};

export type StoreSettings = {
  _id: string;
  storeName: string;
  storeUrl: string;
  email: string;
  phone: string;
  description: string;
  logoUrl: string;
  currency: string;
  timezone: string;
  address: string;
};

export const storeApi = {
  get: () => api.get<{ success: boolean; settings: StoreSettings }>('/store'),
  getPublic: () =>
    api.get<{ success: boolean; settings: StoreSettings }>('/store/public'),
  update: (data: Partial<StoreSettings>) =>
    api.put<{ success: boolean; settings: StoreSettings }>('/store', data),
};

export type PaymentGateway = {
  _id: string;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
};

export const paymentSettingsApi = {
  getAll: () =>
    api.get<{ success: boolean; gateways: PaymentGateway[] }>(
      '/payment-settings'
    ),
  getActive: () =>
    api.get<{ success: boolean; gateways: ActivePaymentGateway[] }>(
      '/payment-settings/active'
    ),
  update: (
    id: string,
    data: { enabled?: boolean; config?: Record<string, any> }
  ) =>
    api.put<{ success: boolean; gateway: PaymentGateway }>(
      `/payment-settings/${id}`,
      data
    ),
};

export type ActivePaymentGateway = {
  name: string;
  label: string;
  description: string;
};

export const paymentApi = {
  initiate: (data: {
    orderId: string;
    amount: number;
    customer: {
      name: string;
      email: string;
      phone: string;
      address?: string;
      address2?: string;
      city?: string;
      state?: string;
      postcode?: string;
    };
    advance?: boolean;
  }) =>
    api.post<{
      success: boolean;
      gatewayUrl: string;
      tran_id: string;
      advance?: boolean;
      message?: string;
    }>('/payment/initiate', data),
  validate: (data: {
    tran_id: string;
    val_id?: string;
    status?: string;
    amount?: number;
    card_type?: string;
  }) =>
    api.post<{
      success: boolean;
      valid: boolean;
      advance?: boolean;
      order?: string;
    }>('/payment/validate', data),
  queryTransaction: (tran_id: string) =>
    api.get<{
      success: boolean;
      gatewayStatus?: string;
      paymentStatus?: string;
      advancePaid?: number;
      updated?: boolean;
      order?: string;
    }>(`/payment/transaction/${tran_id}`),
  cancel: (data: { tran_id: string }) =>
    api.post<{ success: boolean; message: string }>('/payment/cancel', data),
};

export type ActiveTeamMember = {
  _id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
};

export type AuthMe = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
};

export type SavedAddress = {
  _id: string;
  label: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  deliveryArea?: string;
  isDefault: boolean;
};

export const authApi = {
  getMe: () => api.get<{ success: boolean; user: AuthMe }>('/auth/me'),

  updateProfile: (data: {
    name?: string;
    phone?: string;
    address?: Partial<AuthMe['address']>;
  }) => api.put<{ success: boolean; user: AuthMe }>('/auth/me', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put<{ success: boolean; message: string }>('/auth/me/password', data),

  getSessions: () =>
    api.get<{ success: boolean; sessions: Session[] }>('/auth/me/sessions'),

  revokeSession: (id: string) =>
    api.delete<{ success: boolean; message: string }>(
      `/auth/me/sessions/${id}`
    ),

  getAddresses: () =>
    api.get<{ success: boolean; addresses: SavedAddress[] }>(
      '/auth/me/addresses'
    ),

  addAddress: (data: Partial<SavedAddress>) =>
    api.post<{ success: boolean; addresses: SavedAddress[] }>(
      '/auth/me/addresses',
      data
    ),

  updateAddress: (id: string, data: Partial<SavedAddress>) =>
    api.put<{ success: boolean; addresses: SavedAddress[] }>(
      `/auth/me/addresses/${id}`,
      data
    ),

  deleteAddress: (id: string) =>
    api.delete<{ success: boolean; addresses: SavedAddress[] }>(
      `/auth/me/addresses/${id}`
    ),

  setDefaultAddress: (id: string) =>
    api.put<{ success: boolean; addresses: SavedAddress[] }>(
      `/auth/me/addresses/${id}/default`
    ),

  verifyOtp: (data: { pendingToken: string; otp: string }) =>
    api.post<{
      success: boolean;
      token?: string;
      user?: AuthMe;
      message?: string;
    }>('/auth/verify-otp', data),
};

export type LoginResponse = {
  success: boolean;
  token?: string;
  user?: AuthMe;
  twoFactorRequired?: boolean;
  pendingToken?: string;
  expiresIn?: number;
  message?: string;
};

export type OrderStatus =
  'pending' | 'processing' | 'confirmed' | 'send_courier' | 'cancelled';

export type OrderItem = {
  product: string | { _id: string; name: string };
  name: string;
  price: number;
  quantity: number;
  image: string;
};

export type Order = {
  _id: string;
  orderNumber?: string;
  user: string | { _id: string; name: string; email: string; phone?: string };
  items: OrderItem[];
  shippingAddress: {
    fullName?: string;
    phone?: string;
    street: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  totalAmount: number;
  coupon?: {
    code: string;
    discount: number;
  };
  payment: {
    method: string;
    status: string;
    tran_id?: string;
    amount?: number;
    val_id?: string;
    card_type?: string;
    paidAt?: string;
  };
  orderStatus: OrderStatus;
  note?: string;
  advanceAmount?: number;
  advancePaid?: number;
  advanceReference?: string;
  createdAt: string;
  updatedAt: string;
};

export type OrderStats = {
  total: number;
  pending: number;
  processing: number;
  confirmed: number;
  send_courier: number;
  cancelled: number;
};

export const orderApi = {
  getMyOrders: () =>
    api.get<{ success: boolean; orders: Order[] }>('/orders/my-orders'),

  getById: (id: string) =>
    api.get<{ success: boolean; order: Order }>(`/orders/${id}`),
  getAllOrders: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) =>
    api.get<{
      success: boolean;
      total: number;
      page: number;
      pages: number;
      orders: Order[];
    }>('/orders', { params }),

  getStats: () =>
    api.get<{ success: boolean; stats: OrderStats }>('/orders/stats'),

  updateStatus: (id: string, status: OrderStatus) =>
    api.put<{ success: boolean; order: Order }>(`/orders/${id}/status`, {
      status,
    }),

  updatePaymentStatus: (
    id: string,
    status: 'pending' | 'paid' | 'failed' | 'cancelled'
  ) =>
    api.put<{ success: boolean; order: Order }>(
      `/orders/${id}/payment-status`,
      { status }
    ),

  updateAdvance: (
    id: string,
    data: {
      advanceAmount?: number;
      advancePaid?: number;
      advanceReference?: string;
    }
  ) =>
    api.put<{ success: boolean; order: Order }>(`/orders/${id}/advance`, data),

  create: (data: {
    items: { product: string; quantity: number }[];
    shippingAddress: Order['shippingAddress'];
    paymentMethod: string;
    note?: string;
    couponCode?: string;
  }) => api.post<{ success: boolean; order: Order }>('/orders', data),
};

export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'cancelled';

export type InvoiceItem = {
  _id: string;
  product: string;
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  warranty: string;
  serialNumbers: string[];
};

export type Invoice = {
  _id: string;
  order: string;
  invoiceNumber: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  extraCharge: number;
  netPayable: number;
  status: InvoiceStatus;
  note: string;
  salesPerson: string;
  preparedBy?: { _id: string; name: string } | string | null;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceStats = {
  totalOutstanding: number;
  totalPaid: number;
  totalOverdue: number;
  cancelledCount: number;
};

export const invoiceApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) =>
    api.get<{
      success: boolean;
      total: number;
      page: number;
      pages: number;
      invoices: Invoice[];
    }>('/invoices', { params }),

  getStats: () =>
    api.get<{ success: boolean; stats: InvoiceStats }>('/invoices/stats'),

  get: (id: string) =>
    api.get<{ success: boolean; invoice: Invoice }>(`/invoices/${id}`),

  update: (id: string, data: Record<string, unknown>) =>
    api.put<{ success: boolean; invoice: Invoice }>(`/invoices/${id}`, data),

  remove: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/invoices/${id}`),

  generateFromOrder: (orderId: string) =>
    api.post<{ success: boolean; invoice: Invoice }>(
      `/invoices/order/${orderId}`
    ),

  syncFromOrders: () =>
    api.post<{ success: boolean; created: number }>('/invoices/sync'),
};

export type DashboardStats = {
  revenue: number;
  orders: number;
  customers: number;
  productsSold: number;
  products: number;
  ordersByStatus: {
    processing: number;
    pending: number;
    confirmed: number;
    send_courier: number;
    cancelled: number;
  };
  recentOrders: Order[];
  topProducts: {
    _id: string;
    name: string;
    image: string;
    sales: number;
    revenue: number;
  }[];
  salesByCategory: { name: string; value: number }[];
  monthlyRevenue: { label: string; value: number }[];
};

export const dashboardApi = {
  getStats: () =>
    api.get<{ success: boolean; stats: DashboardStats }>('/dashboard'),
};

export type AnalyticsPoint = {
  month: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
};

export type AnalyticsStats = {
  stats: {
    revenue: number;
    orders: number;
    customers: number;
    products: number;
    productsSold: number;
    avgOrderValue: number;
    avgItemsPerOrder: number;
    repeatCustomerRate: number;
    ordersByStatus: {
      processing: number;
      pending: number;
      confirmed: number;
      send_courier: number;
      cancelled: number;
    };
  };
  monthly: AnalyticsPoint[];
  daily: AnalyticsPoint[];
  topProducts: {
    _id: string;
    name: string;
    image: string;
    price: number;
    sku?: string;
    productCode?: string;
    unitsSold: number;
    revenue: number;
  }[];
  categories: {
    name: string;
    revenue: number;
    orders: number;
    percentage: number;
  }[];
};

export const analyticsApi = {
  getStats: () =>
    api.get<{ success: boolean; data: AnalyticsStats }>('/analytics'),
};

export type VisitorOverview = {
  days: number;
  summary: {
    activeUsers: number;
    newUsers: number;
    sessions: number;
    pageViews: number;
    engagementRate: number;
  };
  daily: { date: string; activeUsers: number; sessions: number }[];
  devices: { device: string; activeUsers: number; sessions: number }[];
  topPages: {
    title: string;
    path: string;
    pageViews: number;
    activeUsers: number;
  }[];
};

export const visitorApi = {
  getOverview: (days: 7 | 30 | 90 = 30) =>
    api.get<{ success: boolean; data: VisitorOverview }>('/visitors/overview', {
      params: { days },
    }),
};

export type ProductFormData = {
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  category: string;
  stock: number;
  status: string;
  featured: boolean;
  holiday: boolean;
  specifications?: Record<string, any>;
  images?: string[];
};

export const productApi = {
  create: (data: FormData) =>
    api.post<{ success: boolean; product: any }>('/products', data),

  getAll: (params?: Record<string, any>) =>
    api.get<{ success: boolean; products: any[] }>('/products', { params }),

  getById: (id: string) =>
    api.get<{ success: boolean; product: any }>(`/products/${id}`),

  getBySlug: (slug: string) =>
    api.get<{ success: boolean; product: any }>(`/products/slug/${slug}`),

  addRating: (id: string, data: { rating: number; comment?: string }) =>
    api.post<{ success: boolean; product: any }>(
      `/products/${id}/ratings`,
      data
    ),

  update: (id: string, data: FormData) =>
    api.put<{ success: boolean; product: any }>(`/products/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/products/${id}`),

  getPcParts: (params?: Record<string, string>) =>
    api.get<PcPartsResponse>('/products/pc-parts', { params }),
};

export type PcPartType =
  | 'cpu'
  | 'cpu_cooler'
  | 'motherboard'
  | 'ram'
  | 'storage'
  | 'gpu'
  | 'psu'
  | 'casing'
  | 'monitor'
  | 'casing_cooler'
  | 'keyboard'
  | 'mouse'
  | 'speaker'
  | 'headphone'
  | 'wifi_adapter'
  | 'antivirus'
  | 'ups';

export type PcPartInfo = {
  enabled: boolean;
  type: PcPartType | '';
  socket?: string;
  platform?: string;
  formFactor?: string;
  wattage?: number;
};

export type PcPart = {
  _id: string;
  name: string;
  slug: string;
  price: number;
  discountPrice?: number;
  images?: string[];
  image?: string;
  brand?: string;
  stock?: number;
  pcPart: PcPartInfo;
};

export type PcPartsResponse = {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  products: PcPart[];
};

export const pcPartsApi = {
  list: (params?: Record<string, string>) =>
    api.get<PcPartsResponse>('/products/pc-parts', { params }),
};

export type SavedComponent = {
  product: string; // product _id
  name: string;
  image: string;
  price: number;
  wattage: number;
};

export type SavedBuild = {
  _id: string;
  name: string;
  components: Record<string, SavedComponent>;
  createdAt?: string;
  updatedAt?: string;
};

export const pcBuilderApi = {
  getMyBuilds: () =>
    api.get<{ success: boolean; builds: SavedBuild[] }>('/pc-builder/builds'),
  save: (data: {
    name?: string;
    components: Record<string, { product: string }>;
  }) =>
    api.post<{ success: boolean; build: SavedBuild }>(
      '/pc-builder/builds',
      data
    ),
  remove: (id: string) =>
    api.delete<{ success: boolean; message: string }>(
      `/pc-builder/builds/${id}`
    ),
};

export type Review = {
  _id: string;
  rating: number;
  comment: string;
  status: 'approved' | 'pending' | 'rejected';
  featured: boolean;
  createdAt: string;
  user: { _id: string; name: string } | null;
  product: { _id: string; name: string; slug: string; image: string } | null;
};

export type ReviewStats = {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  featured: number;
  averageRating: number;
  distribution: { rating: number; count: number }[];
};

export type ReviewPaginatedResponse = {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  reviews: Review[];
};

export const reviewApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    rating?: string;
    featured?: string;
  }) => api.get<ReviewPaginatedResponse>('/reviews', { params }),

  getStats: () =>
    api.get<{ success: boolean; stats: ReviewStats }>('/reviews/stats'),

  update: (id: string, data: { status?: string; featured?: boolean }) =>
    api.patch<{ success: boolean; review: Review }>(`/reviews/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/reviews/${id}`),
};

export type Question = {
  _id: string;
  question: string;
  answer: string;
  status: 'pending' | 'answered' | 'rejected';
  featured: boolean;
  createdAt: string;
  answeredAt: string | null;
  product: { _id: string; name: string; slug: string; image: string } | null;
  user: { _id: string; name: string } | null;
  answeredBy: { _id: string; name: string } | null;
};

export type QuestionStats = {
  total: number;
  pending: number;
  answered: number;
  rejected: number;
  featured: number;
};

export type QuestionPaginatedResponse = {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  questions: Question[];
};

export const questionApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    featured?: string;
    productId?: string;
  }) => api.get<QuestionPaginatedResponse>('/questions', { params }),

  getStats: () =>
    api.get<{ success: boolean; stats: QuestionStats }>('/questions/stats'),

  getByProduct: (productId: string) =>
    api.get<{ success: boolean; count: number; questions: Question[] }>(
      `/questions/product/${productId}`
    ),

  ask: (productId: string, question: string) =>
    api.post<{ success: boolean; question: Question }>('/questions', {
      productId,
      question,
    }),

  update: (
    id: string,
    data: { answer?: string; status?: string; featured?: boolean }
  ) =>
    api.patch<{ success: boolean; question: Question }>(
      `/questions/${id}`,
      data
    ),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/questions/${id}`),
};

export type PromoCode = {
  _id: string;
  code: string;
  description: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  minOrder: number;
  maxDiscount: number;
  maxUses: number;
  perUserLimit: number;
  usageCount: number;
  startDate: string | null;
  endDate: string | null;
  status: 'active' | 'inactive';
  categories?: string[];
  createdAt: string;
  updatedAt: string;
};

export type PromoStats = {
  total: number;
  active: number;
  inactive: number;
  totalRedemptions: number;
  expiringSoon: number;
};

export type PromoPaginatedResponse = {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  promos: PromoCode[];
};

export type PromoFormData = {
  code: string;
  description: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  minOrder: number;
  maxDiscount: number;
  maxUses: number;
  perUserLimit: number;
  startDate: string | null;
  endDate: string | null;
  status: 'active' | 'inactive';
  categories?: string[];
};

export const promoApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    type?: string;
  }) => api.get<PromoPaginatedResponse>('/promo', { params }),

  getStats: () =>
    api.get<{ success: boolean; stats: PromoStats }>('/promo/stats'),

  create: (data: PromoFormData) =>
    api.post<{ success: boolean; promo: PromoCode }>('/promo', data),

  update: (id: string, data: Partial<PromoFormData>) =>
    api.put<{ success: boolean; promo: PromoCode }>(`/promo/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/promo/${id}`),

  validate: (
    code: string,
    subtotal: number,
    items?: { product: string; quantity: number }[]
  ) =>
    api.post<{
      success: boolean;
      promo: Partial<PromoCode>;
      discount: number;
      matchingSubtotal?: number;
    }>('/promo/validate', {
      code,
      subtotal,
      items,
    }),
};

export type MaintenanceStatus = {
  enabled: boolean;
  message: string;
  endAt: string | null;
  contactEmail: string;
  contactPhone: string;
};

export const maintenanceApi = {
  getStatus: () =>
    api.get<{ success: boolean; maintenance: MaintenanceStatus }>(
      '/maintenance/status'
    ),

  update: (data: Partial<MaintenanceStatus>) =>
    api.put<{ success: boolean; maintenance: MaintenanceStatus }>(
      '/maintenance',
      data
    ),
};

export type SmsSettings = {
  provider?: 'bulksmsbd' | 'rtcom';
  apiKey: string;
  gatewayUrl?: string;
  gatewayApiKey?: string;
  gatewayApiKeyVariable?: string;
  gatewaySmsType?: 'url';
  senderId: string;
  signature: string;
  enabled: boolean;
  twoFactorEnabled?: boolean;
  otpExpirySeconds?: number;
};

export type SmsBalance = {
  success: boolean;
  balance: number | null;
  raw?: Record<string, unknown>;
};

export type SmsLog = {
  _id: string;
  to: string[];
  message: string;
  segments: number;
  status: 'sent' | 'failed';
  providerStatus: string;
  providerMessage: string;
  errorCode: string;
  createdAt: string;
};

export const smsApi = {
  getSettings: () =>
    api.get<{ success: boolean; settings: SmsSettings }>('/sms/settings'),

  updateSettings: (data: Partial<SmsSettings>) =>
    api.put<{ success: boolean; settings: SmsSettings }>('/sms/settings', data),

  getBalance: () => api.get<SmsBalance>('/sms/balance'),

  send: (data: { numbers: string; message: string; senderId?: string }) =>
    api.post<{
      success: boolean;
      log: SmsLog;
      provider: Record<string, any>;
      providerMessage: string;
      numbers: string[];
    }>('/sms/send', data),

  getLogs: (params?: { page?: number; limit?: number }) =>
    api.get<{
      success: boolean;
      logs: SmsLog[];
      total: number;
      page: number;
      pages: number;
    }>('/sms/logs', { params }),
};

export type MetaCatalogStatus = {
  success: boolean;
  connected: boolean;
  enabled: boolean;
  message: string;
  catalog?: {
    id: string;
    name: string;
    productCount: number | null;
  };
};

export const metaApi = {
  getStatus: () => api.get<MetaCatalogStatus>('/meta/status'),
};

export type HealthService = {
  status: 'healthy' | 'unhealthy' | 'disabled';
  message: string;
  host?: string;
  name?: string;
};

export type HealthStatus = {
  success: boolean;
  status: 'healthy' | 'unhealthy';
  checkedAt: string;
  uptimeSeconds: number;
  memory: { usedMb: number; heapUsedMb: number };
  nodeVersion: string;
  services: Record<'api' | 'database' | 'redis', HealthService>;
};

export const healthApi = {
  getStatus: () => api.get<HealthStatus>('/health'),
};

// ---------------- Offers ----------------
export type Offer = {
  _id: string;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  image: string;
  startDate?: string;
  endDate?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export const offerApi = {
  getAll: (params?: Record<string, any>) =>
    api.get<{ success: boolean; offers: Offer[] }>('/offers', { params }),

  getById: (id: string) =>
    api.get<{ success: boolean; offer: Offer }>(`/offers/${id}`),

  getBySlug: (slug: string) =>
    api.get<{ success: boolean; offer: Offer }>(`/offers/slug/${slug}`),

  create: (data: FormData) =>
    api.post<{ success: boolean; offer: Offer }>('/offers', data),

  update: (id: string, data: FormData) =>
    api.put<{ success: boolean; offer: Offer }>(`/offers/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/offers/${id}`),
};

export type HolidayConfig = {
  _id?: string;
  heroBadge?: string;
  title?: string;
  subtitle?: string;
  discountPercent?: number;
  endDate?: string | null;
  couponCode?: string;
  couponDescription?: string;
  topDealsTitle?: string;
  topDealsSubtitle?: string;
  active?: boolean;
};

export const holidayApi = {
  getConfig: () =>
    api.get<{ success: boolean; config: HolidayConfig }>('/holiday'),

  updateConfig: (data: Partial<HolidayConfig>) =>
    api.put<{ success: boolean; config: HolidayConfig }>('/holiday', data),
};

export type AdminNotificationCategory =
  'order' | 'delivery' | 'rider' | 'payment' | 'system';

export type AdminNotification = {
  _id: string;
  title: string;
  description: string;
  category: AdminNotificationCategory;
  read: boolean;
  link?: string;
  createdAt?: string;
  updatedAt?: string;
};

export const notificationApi = {
  // Fetch a paginated list of notifications. Returns the list plus the
  // running unread count so the UI can stay in sync with new events.
  list: (params?: {
    page?: number;
    limit?: number;
    read?: boolean;
    category?: string;
  }) =>
    api.get<{
      success: boolean;
      notifications: AdminNotification[];
      total: number;
      unreadCount: number;
      page: number;
      pages: number;
    }>('/notifications', { params }),

  unreadCount: () =>
    api.get<{ success: boolean; unreadCount: number }>(
      '/notifications/unread-count'
    ),

  markRead: (id: string) =>
    api.patch<{ success: boolean; notification: AdminNotification }>(
      `/notifications/${id}/read`
    ),

  markAllRead: () =>
    api.post<{ success: boolean; message: string }>('/notifications/read-all'),
};
