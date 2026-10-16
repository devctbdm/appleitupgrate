// backend/src/controllers/invoiceController.js

import Invoice from '../models/Invoice.js';
import Order from '../models/Order.js';
import User from '../models/User.js';

const INVOICE_STATUSES = ['paid', 'pending', 'overdue', 'cancelled'];

const formatAddress = (addr) => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  return [addr.street, addr.city, addr.state, addr.postcode, addr.country]
    .filter(Boolean)
    .join(', ');
};

export const buildInvoiceFromOrder = async (order) => {
  let user = null;
  if (order.user && typeof order.user !== 'string') {
    user = order.user;
  } else if (order.user) {
    user = await User.findById(order.user);
  }

  const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount = order.coupon?.discount || 0;
  const base = subtotal - discount;
  const deliveryCharge = Math.max(0, (order.totalAmount || 0) - base);

  const dueDate = new Date(order.createdAt);
  dueDate.setDate(dueDate.getDate() + 30);

  let status = 'pending';
  const payStatus = order.payment?.status;
  if (payStatus === 'paid') {
    status = 'paid';
  } else if (
    payStatus === 'failed' ||
    payStatus === 'cancelled' ||
    order.orderStatus === 'cancelled'
  ) {
    status = 'cancelled';
  } else if (new Date() > dueDate) {
    status = 'overdue';
  }

  return new Invoice({
    order: order._id,
    invoiceNumber: `INV-${order._id.toString().slice(-8).toUpperCase()}`,
    customer: {
      name: user?.name || 'Customer',
      email: user?.email || '',
      phone: user?.phone || '',
      address: formatAddress(user?.address || order.shippingAddress),
    },
    issueDate: order.createdAt,
    dueDate,
    items: order.items.map((i) => ({
      product: i.product,
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.price,
      amount: i.price * i.quantity,
      warranty: '',
      serialNumbers: [],
    })),
    subtotal,
    discount,
    deliveryCharge,
    extraCharge: 0,
    netPayable: order.totalAmount,
    status,
    note: order.note || '',
    salesPerson: 'Apple-it-zone',
  });
};

// @desc    List invoices (admin)
// @route   GET /api/invoices
export const getAllInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (search) {
      const q = search.trim();
      filter.$or = [
        { invoiceNumber: { $regex: q, $options: 'i' } },
        { 'customer.name': { $regex: q, $options: 'i' } },
        { 'customer.email': { $regex: q, $options: 'i' } },
      ];
    }

    const total = await Invoice.countDocuments(filter);
    const invoices = await Invoice.find(filter)
      .populate('preparedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      invoices,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Invoice stats (admin)
// @route   GET /api/invoices/stats
export const getInvoiceStats = async (req, res) => {
  try {
    const invoices = await Invoice.find({}, { status: 1, netPayable: 1 });
    const stats = invoices.reduce(
      (acc, inv) => {
        if (inv.status === 'paid') acc.totalPaid += inv.netPayable;
        if (inv.status === 'pending') acc.totalOutstanding += inv.netPayable;
        if (inv.status === 'overdue') acc.totalOverdue += inv.netPayable;
        if (inv.status === 'cancelled') acc.cancelledCount += 1;
        return acc;
      },
      { totalOutstanding: 0, totalPaid: 0, totalOverdue: 0, cancelledCount: 0 }
    );
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single invoice (admin)
// @route   GET /api/invoices/:id
export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate(
      'preparedBy',
      'name'
    );
    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: 'Invoice not found' });
    }
    res.json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate invoice from an order (admin)
// @route   POST /api/invoices/order/:orderId
export const generateFromOrder = async (req, res) => {
  try {
    const existing = await Invoice.findOne({ order: req.params.orderId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Invoice already exists for this order',
        invoice: existing,
      });
    }
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: 'Order not found' });
    }
    const invoice = await buildInvoiceFromOrder(order);
    invoice.preparedBy = req.user.id;
    await invoice.save();
    res.status(201).json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create invoices for all orders missing one (admin)
// @route   POST /api/invoices/sync
export const syncInvoicesFromOrders = async (req, res) => {
  try {
    const orders = await Order.find({});
    let created = 0;
    for (const order of orders) {
      const existing = await Invoice.findOne({ order: order._id });
      if (existing) continue;
      const invoice = await buildInvoiceFromOrder(order);
      invoice.preparedBy = req.user.id;
      await invoice.save();
      created += 1;
    }
    res.json({ success: true, created });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update invoice fields (admin) - editable everything
// @route   PUT /api/invoices/:id
export const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: 'Invoice not found' });
    }

    const {
      customer,
      items,
      issueDate,
      dueDate,
      status,
      discount,
      deliveryCharge,
      extraCharge,
      note,
      salesPerson,
    } = req.body;

    if (customer) {
      invoice.customer = {
        ...invoice.customer,
        ...customer,
      };
    }
    if (issueDate) invoice.issueDate = issueDate;
    if (dueDate) invoice.dueDate = dueDate;
    if (status && INVOICE_STATUSES.includes(status)) invoice.status = status;
    if (typeof discount === 'number') invoice.discount = discount;
    if (typeof deliveryCharge === 'number') invoice.deliveryCharge = deliveryCharge;
    if (typeof extraCharge === 'number') invoice.extraCharge = extraCharge;
    if (note !== undefined) invoice.note = note;
    if (salesPerson !== undefined) invoice.salesPerson = salesPerson;

    if (items && Array.isArray(items)) {
      invoice.items = items.map((it) => ({
        product: it.product || invoice.items.find((x) => x._id.toString() === it._id)?.product,
        name: it.name,
        quantity: Number(it.quantity) || 0,
        unitPrice: Number(it.unitPrice) || 0,
        amount: (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
        warranty: it.warranty || '',
        serialNumbers: Array.isArray(it.serialNumbers)
          ? it.serialNumbers.filter(Boolean)
          : [],
      }));
    }

    invoice.subtotal = invoice.items.reduce((s, i) => s + i.amount, 0);
    invoice.netPayable =
      invoice.subtotal - invoice.discount + invoice.deliveryCharge + invoice.extraCharge;

    invoice.preparedBy = req.user.id;
    await invoice.save();

    res.json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete invoice (admin)
// @route   DELETE /api/invoices/:id
export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: 'Invoice not found' });
    }
    await invoice.deleteOne();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
