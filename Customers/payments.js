const data = require('../dataSchema/data');
const { Readable } = require('stream');
const mongoose=require('mongoose');
const cloudinary = require('../dataSchema/cloudTheImg');
const Order=require('../dataSchema/Order');
const Payment=require('../dataSchema/PaymentSchema');
const WalletTransaction=require('../dataSchema/WalletTransaction');
const Wallet=require('../dataSchema/Wallet');
const User=require('../dataSchema/User');
const Restaurant=require('../dataSchema/Restaurant');
const { ORDER_STATUSES,WALLET_TRANSACTION_SOURCES,WALLET_TRANSACTION_TYPES } = require('../dataSchema/enums');

const ChatRoom=require('../dataSchema/ChatRoom');

/**
 * @param {number} customerId
 * @param {number} amount
 * @param {string} paymentMethod
 * @param {number} order_id
 * @param {object} imgPay
 * @returns {object}
 */
const processPayment = async (customerId, amount, paymentMethod, orderId, imgPay) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const existingPayment = await Payment.findOne({ order: orderId }).session(session);
        if (existingPayment) {
            await session.abortTransaction();
            session.endSession();
            return { success: false, message: 'Payment already exists for this order', data: existingPayment };
        }

        if (!imgPay || imgPay.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return { success: false, message: 'Payment proof image is required' };
        }

        if (!['vodafone_cash', 'instapay'].includes(paymentMethod)) {
            await session.abortTransaction();
            session.endSession();
            return { success: false, message: "Invalid payment method. Use 'vodafone_cash' or 'instapay'" };
        }

        const file = Array.isArray(imgPay) ? imgPay[0] : imgPay;

        if (!file || !file.buffer) {
            await session.abortTransaction();
            session.endSession();
            return { success: false, message: 'Invalid payment proof image' };
        }

        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: "payimg" },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            Readable.from(file.buffer).pipe(stream);
        });
        const imgPayUrl = uploadResult.secure_url;

        const newPayment = new Payment({
            order: orderId,
            amount: amount,
            method: paymentMethod,
            proofImage: imgPayUrl,
            status: 'pending'
        });
        await newPayment.save({ session });

        await Order.findByIdAndUpdate(
            orderId,
            { payment: newPayment._id },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        return {
            success: true,
            message: 'Payment proof uploaded successfully. Waiting for confirmation.',
            data: {
                paymentId: newPayment._id,
                orderId: orderId,
                amount: amount,
                paymentMethod: paymentMethod,
                payment_proof: imgPayUrl,
                status: 'pending'
            }
        };

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error processing payment:", err.message);
        return { success: false, message: err.message };
    }
};

 const uploadPaymentProof = async (req, res) => {
    try {
        const customerId = req.user.id;
        const { orderId, payment_method } = req.body;
        const imgpayment = req.files;

        const order = await Order.findOne({ _id: orderId, customer: customerId });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        if (order.status !== 'pending') {
            return res.status(400).json({ error: "Payment already submitted or order is not in pending status" });
        }

        const totalAmount = Number(order.totalAmount);

        const result = await processPayment(
            customerId,
            totalAmount,
            payment_method,
            orderId,
            imgpayment
        );

        if (result.success) {
            return res.status(201).json(result);
        } else {
            return res.status(400).json({ error: result.message });
        }

    } catch (err) {
        console.error("Error uploading payment proof:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

 const confirmPayment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { paymentId } = req.body;

        const payment = await Payment.findById(paymentId).session(session);

        if (!payment) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: "Payment not found" });
        }

        if (payment.status !== 'pending') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: "Payment already processed" });
        }

        payment.status = 'confirmed';
        await payment.save({ session });

        const order = await Order.findById(payment.order).session(session);
        if (!order) {
            throw new Error("Associated order not found");
        }

        const userId = order.customer;
        const restaurantId = order.restaurant;

        const paymentAmount = Number(payment.amount);
        const wallet = await Wallet.findOneAndUpdate(
            { user: userId },
            { $inc: { balance: paymentAmount } },
            { new: true, upsert: true, session }
        );

        await ChatRoom.create([{
            order: order._id,
            customer: userId,
            restaurant: restaurantId
        }], { session });

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            message: "Payment confirmed successfully and order marked as paid, wallet updated, and chat room created",
            orderId: order._id,
            newStatus: 'paid', 
            userId: userId,
            Wallet: Number(wallet.balance)
        });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error confirming payment:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

 const rejectPayment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { paymentId } = req.body;

        const payment = await Payment.findById(paymentId).session(session);

        if (!payment) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: "Payment not found" });
        }

        if (payment.status !== 'pending') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: "Payment already processed" });
        }

        payment.status = 'rejected';
        await payment.save({ session });

        await Order.findByIdAndUpdate(
            payment.order,
            { $unset: { payment: 1 } },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            message: "Payment rejected",
            reason: "Payment proof was not valid",
            orderId: payment.order
        });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error rejecting payment:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

 const getPaymentStatus = async (req, res) => {
    try {
        const customerId = req.user.id;
        const { orderId } = req.body;

        const order = await Order.findOne({ _id: orderId, customer: customerId })
            .populate('payment') 
            .select('status totalAmount payment');

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        return res.status(200).json({
            orderId: order._id,
            totalAmount: order.totalAmount,
            orderStatus: order.status,
            payment: order.payment ? {
                id: order.payment._id,
                status: order.payment.status,
                method: order.payment.method,
                date: order.payment.createdAt
            } : null
        });

    } catch (err) {
        console.error("Error getting payment status:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

 const getPaymentStatusForOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        
        const order = await Order.findById(orderId).populate('payment', 'status');
        
        if (!order || !order.payment) {
            return res.status(404).json({ error: "No payment found for this order" });
        }

        return res.status(200).json({ paymentStatus: order.payment.status });

    } catch (err) {
        console.error("Error getting payment status for order:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

 const getAllOrderPaymentProofs = async (req, res) => {
    try {
        const payments = await Payment.find({ proofImage: { $ne: null } })
            .populate({
                path: 'order',
                populate: {
                    path: 'customer',
                    select: 'name phone'
                }
            })
            .sort({ createdAt: -1 });

        const paymentProofs = payments.map(p => ({
            payment_id: p._id,
            amount: p.amount,
            payment_method: p.method,
            payment_proof: p.proofImage,
            created_at: p.createdAt,
            customer_name: p.order?.customer?.name || 'Unknown',
            customer_phone: p.order?.customer?.phone || 'Unknown'
        }));

        return res.status(200).json({ paymentProofs });

    } catch (err) {
        console.error("Error getting payment proofs for orders:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

 const getPendingPayments = async (req, res) => {
    try {
        const payments = await Payment.find({ status: 'pending' })
            .populate({
                path: 'order',
                populate: {
                    path: 'customer',
                    select: 'name phone'
                }
            })
            .sort({ createdAt: 1 });

        const pendingPayments = payments.map(p => ({
            payment_id: p._id,
            amount: p.amount,
            payment_method: p.method,
            payment_proof: p.proofImage,
            created_at: p.createdAt,
            order_id: p.order?._id,
            location: p.order?.deliveryAddress?.label,
            is_reservation: p.order?.isReservation,
            reservation_date: p.order?.reservationDate,
            customer_name: p.order?.customer?.name || 'Unknown',
            customer_phone: p.order?.customer?.phone || 'Unknown'
        }));

        return res.status(200).json({
            count: pendingPayments.length,
            pendingPayments
        });

    } catch (err) {
        console.error("Error getting pending payments:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

 const getBalanceAtWallet = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const wallet = await Wallet.findOne({ user: userId });
        
        if (!wallet) {
            return res.status(404).json({ error: "Wallet not found for this user" });
        }

        return res.status(200).json({ balance: Number(wallet.balance) });

    } catch (err) {
        console.error("Error getting balance at wallet:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = {
    processPayment,
    uploadPaymentProof,
    confirmPayment,
    rejectPayment,
    getPaymentStatus,
    getPendingPayments,
    getPaymentStatusForOrder,
    getBalanceAtWallet,
    getAllOrderPaymentProofs
};
