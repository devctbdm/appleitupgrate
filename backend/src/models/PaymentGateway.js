import mongoose from 'mongoose';

const paymentGatewaySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: false },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const PaymentGateway = mongoose.model('PaymentGateway', paymentGatewaySchema);
export default PaymentGateway;
