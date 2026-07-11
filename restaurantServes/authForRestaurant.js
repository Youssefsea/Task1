const data = require("../dataSchema/data");
const bcryptJs = require("bcryptjs");
const { createToken } = require("../middelware/jwtmake");
const crypto = require("crypto");
 const { Resend } = require("resend");
const {redisClient}=require('../middelware/redisClient')
const Dish=require('../dataSchema/Dish');
const User=require('../dataSchema/User');
const Restaurant=require('../dataSchema/Restaurant');
const Wallet=require('../dataSchema/Wallet');
const Order=require('../dataSchema/Order');
const Payment=require('../dataSchema/PaymentSchema');
const Cart=require('../dataSchema/Cart');
const ChatRoom=require('../dataSchema/ChatRoom');

const resend = new Resend(process.env.RESEND_API_KEY);


const sendRestaurantEmail = async (email, otp) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'noreply@httpsfood-front-rho.me',
      to: email,
      subject: 'Your Login Code',
        html: `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:2rem 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;">

        <tr>
          <td style="background:#E8502A;padding:1.5rem 2rem;">
            <table width="100%">
              <tr>
                <td>
                  <div style="width:48px;height:48px;background:rgba(255,255,255,0.15);border-radius:10px;display:inline-flex;align-items:center;justify-content:center;font-size:24px;margin-left:12px;">🍽️</div>
                  <div style="display:inline-block;">
                    <div style="color:#fff;font-size:18px;font-weight:bold;">انضم لعائلة أكلي</div>
                    <div style="color:rgba(255,255,255,0.75);font-size:12px;">بوابة المطاعم الشريكة</div>
                  </div>
                </td>
                <td align="left" style="font-size:28px;">🍕</td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:1.75rem 2rem 1.25rem;text-align:center;">
            <p style="font-size:16px;color:#111;font-weight:bold;margin:0 0 6px;">أهلاً بمطعمك في أكلي 👨‍🍳</p>
            <p style="font-size:13px;color:#666;margin:0 0 1.5rem;line-height:1.7;">
              شكراً لاهتمامك بالانضمام لمنصة أكلي.<br>
              استخدم كود التحقق التالي لإتمام تسجيل مطعمك.
            </p>

            <div style="background:#FDF1EE;border-radius:12px;padding:1.25rem 1.5rem;display:inline-block;margin-bottom:1.5rem;">
              <div style="font-size:12px;color:#993C1D;font-weight:bold;margin-bottom:8px;">كود تفعيل الحساب</div>
              <div style="font-size:36px;font-weight:bold;color:#E8502A;letter-spacing:12px;">${otp}</div>
              <div style="font-size:11px;color:#993C1D;margin-top:6px;">⏱️ صالح لمدة دقيقة واحدة فقط</div>
            </div>

            <p style="font-size:11px;color:#999;line-height:1.7;margin:0;">
              إذا لم تقم بهذا الطلب، يمكنك تجاهل هذا الإيميل بأمان.
            </p>
          </td>
        </tr>

        <tr>
          <td style="border-top:1px solid #eee;padding:0.85rem 2rem;text-align:center;">
            <span style="font-size:11px;color:#999;">📍 أكلي — نوصّل أكلك المفضل لحد الباب</span>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
`,
    });
 
    if (error) {
      console.error(error);
      throw new Error("Failed to send restaurant email");
    }
 
    return data;
  } catch (err) {
    console.error("Restaurant Email Error:", err.message);
    throw err;
  }
};
 
const sendOTPEmail = async (req, res) => {
  try {
    const { email, phone } = req.body;
 
    if (!email || !phone) {
      return res.status(400).json({ error: "Email and phone are required" });
    }
 
    const lockExists = await redisClient.get(`otp_lock:${email}`);
    if (lockExists) {
      return res.status(429).json({ error: "OTP already sent. Please wait." });
    }
 
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(409).json({ error: "Email or phone already exists" });
    }
 
    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcryptJs.hash(otp, 10);
 
    await redisClient.set(`otp:${email}`, hashedOtp, { ex: 60 });
    await redisClient.set(`otp_lock:${email}`, "1", { ex: 60 });
 
    await sendRestaurantEmail(email, otp);
 
    return res.status(200).json({ message: "OTP sent to your email successfully" });
  } catch (err) {
    console.error("Send OTP Error:", err);
    return res.status(500).json({ error: "Failed to send OTP" });
  }
};
 
const AddInfoRestaurant = async (req, res) => {
  const session = await mongoose.startSession();
 
  try {
    const {
      name, email, password, phone, description, location,
      allowed_radius_km, open_time, close_time, area_name,
      can_deliver, can_reserve, delivery_area, otp,
    } = req.body;
 
    if (
      !name || !email || !password || !phone || !description || !location ||
      !allowed_radius_km || !open_time || !close_time || !area_name ||
      can_deliver === undefined || can_reserve === undefined ||
      !delivery_area || !otp
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }
 
    const storedHash = await redisClient.get(`otp:${email}`);
    if (!storedHash) {
      return res.status(400).json({ error: "OTP expired or not found" });
    }
 
    const isValid = await bcryptJs.compare(otp, storedHash);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid OTP" });
    }
 
    await redisClient.del(`otp:${email}`);
    await redisClient.del(`otp_lock:${email}`);
 
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(409).json({ error: "Email or phone already exists" });
    }
 
    const hashPassword = await bcryptJs.hash(password, 11);
 
    session.startTransaction();
 
    const [newUser] = await User.create(
      [{ name, email, password: hashPassword, role: "restaurant", phone }],
      { session }
    );
 
    await Restaurant.create(
      [
        {
          owner: newUser._id,
          description,
          location,
          allowedRadiusKm: allowed_radius_km,
          openTime: open_time,
          closeTime: close_time,
          deliveryAreas: [
            {
              name: area_name,
              canDeliver: can_deliver,
              canReserve: can_reserve,
              area: {
                type: "Polygon",
                coordinates: [delivery_area],
              },
            },
          ],
        },
      ],
      { session }
    );
 
    await session.commitTransaction();
 
    return res.status(201).json({ message: "Restaurant registered successfully" });
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    if (err.code === 11000) {
      return res.status(409).json({ error: "Email or phone already exists" });
    }
    console.error("Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    session.endSession();
  }
};
 
const loginForRestaurant = async (req, res) => {
  try {
    const { email, password } = req.body;
 
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }
    if (user.role !== 'restaurant') {
      return res.status(403).json({ error: "Access denied. Not a restaurant account." });
    }
    const isPasswordValid = await bcryptJs.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid email or password" });
    }
 
    const token = createToken({ id: user._id, role: user.role, name: user.name, email: user.email });
 
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });
 
    return res.status(200).json({
      message: "Login successful",
      restaurant: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        token
      }
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
 
const restaurantProfile = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantProfileId;
 
    const restaurant = await Restaurant.findById(restaurantId).populate('owner', 'name email phone');
    if (!restaurant) {
      return res.status(400).json({ error: "Restaurant profile not found" });
    }
 
    const dishes = await Dish.find({ restaurant: restaurantId });
 
    return res.status(200).json({
      restaurantProfile: {
        name: restaurant.owner?.name,
        email: restaurant.owner?.email,
        phone: restaurant.owner?.phone,
        description: restaurant.description,
        location: restaurant.location,
        allowed_radius_km: restaurant.allowedRadiusKm,
        open_time: restaurant.openTime,
        close_time: restaurant.closeTime,
        delivery_fees: restaurant.deliveryFees,
      },
      dishes,
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
 
const changeResturantinfo = async (req, res) => {
  const session = await mongoose.startSession();
 
  try {
    const restaurantId = req.user.restaurantProfileId;
    const { description, location, allowed_radius_km, open_time, close_time, name, email, phone, delivery_fees } = req.body;
 
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(400).json({ error: "Restaurant profile not found" });
    }
 
    const existingUser = await User.findOne({
      _id: { $ne: restaurant.owner },
      $or: [{ email }, { phone }],
    });
    if (existingUser) {
      return res.status(400).json({ error: "Another user with this email or phone already exists" });
    }
 
    session.startTransaction();
 
    await Restaurant.updateOne(
      { _id: restaurantId },
      {
        description,
        location,
        allowedRadiusKm: allowed_radius_km,
        openTime: open_time,
        closeTime: close_time,
        deliveryFees: delivery_fees,
      },
      { session }
    );
 
    await User.updateOne(
      { _id: restaurant.owner },
      { name, email, phone },
      { session }
    );
 
    await session.commitTransaction();
 
    return res.status(200).json({ message: "Restaurant information updated successfully" });
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    session.endSession();
  }
};
 
const updateRestaurantLocation = async (req, res) => {
  const session = await mongoose.startSession();
 
  try {
    const restaurantId = req.user.restaurantProfileId;
    const {
      allowed_radius_km,
      delivery_area,
      area_name,
      can_deliver,
      can_reserve,
      location
    } = req.body;
 
    session.startTransaction();
 
    await Restaurant.updateOne(
      { _id: restaurantId },
      {
        location,
        allowedRadiusKm: allowed_radius_km,
        deliveryAreas: [
          {
            name: area_name,
            canDeliver: can_deliver,
            canReserve: can_reserve,
            area: {
              type: "Polygon",
              coordinates: [delivery_area],
            },
          },
        ],
      },
      { session }
    );
 
    await session.commitTransaction();
 
    return res.status(200).json({
      message: "Location and delivery area updated successfully"
    });
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("Error updating location:", err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    session.endSession();
  }
};
 
const changeRestaurantPassword = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantProfileId;
    const { oldPassword, newPassword } = req.body;
 
    const restaurant = await Restaurant.findById(restaurantId).populate({
      path: 'owner',
      select: '+password',
    });
 
    if (!restaurant || !restaurant.owner) {
      return res.status(400).json({ error: "Restaurant profile not found" });
    }
 
    const isOldPasswordValid = await bcryptJs.compare(oldPassword, restaurant.owner.password);
    if (!isOldPasswordValid) {
      return res.status(400).json({ error: "Old password is incorrect" });
    }
 
    const hashNewPassword = await bcryptJs.hash(newPassword, 11);
    await User.updateOne({ _id: restaurant.owner._id }, { password: hashNewPassword });
 
    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
 
const changeDeliveryFee = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantProfileId;
    const { delivery_fees } = req.body;
 
    await Restaurant.updateOne({ _id: restaurantId }, { deliveryFees: delivery_fees });
 
    return res.status(200).json({ message: "Delivery fees updated successfully" });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
 
const restaurantProfileStatus = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantProfileId;
    const restaurant = await Restaurant.findById(restaurantId).select('isOpen');
 
    if (!restaurant) {
      return res.status(400).json({ error: "Restaurant profile not found" });
    }
 
    return res.status(200).json({ is_open: restaurant.isOpen });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
 
const openOrCloseRestaurant = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantProfileId;
    const restaurant = await Restaurant.findById(restaurantId).select('isOpen');
 
    if (!restaurant) {
      return res.status(400).json({ error: "Restaurant profile not found" });
    }
 
    const newStatus = !restaurant.isOpen;
 
    await Restaurant.updateOne({ _id: restaurantId }, { isOpen: newStatus });
 
    return res.status(200).json({ message: "Restaurant status updated successfully", is_open: newStatus });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
 
const getDashboardStats = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantProfileId;
    const restaurantObjId = new mongoose.Types.ObjectId(restaurantId);
 
    const restaurant = await Restaurant.findById(restaurantId).populate('owner', 'name email phone');
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }
 
    const totalDishes = await Dish.countDocuments({ restaurant: restaurantId });
    const availableDishes = await Dish.countDocuments({ restaurant: restaurantId, isAvailable: true });
 
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
 
    const [todayStats] = await Order.aggregate([
      { $match: { restaurant: restaurantObjId, createdAt: { $gte: startOfDay, $lte: endOfDay } } },
      {
        $group: {
          _id: null,
          today_orders: { $sum: 1 },
          today_revenue: { $sum: { $toDouble: '$totalAmount' } },
        },
      },
    ]);
 
    const pendingOrders = await Order.countDocuments({ restaurant: restaurantId, status: 'pending' });
 
    const [totalStats] = await Order.aggregate([
      { $match: { restaurant: restaurantObjId } },
      {
        $group: {
          _id: null,
          total_orders: { $sum: 1 },
          total_revenue: { $sum: { $toDouble: '$totalAmount' } },
        },
      },
    ]);
 
    const recentOrdersDocs = await Order.find({ restaurant: restaurantId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('customer', 'name phone');
 
    const recentOrders = recentOrdersDocs.map((order) => ({
      id: order._id,
      total_amount: order.totalAmount,
      status: order.status,
      created_at: order.createdAt,
      customer_name: order.customer?.name,
      customer_phone: order.customer?.phone,
    }));
 
    const topDishes = await Dish.aggregate([
      { $match: { restaurant: restaurantObjId } },
      {
        $lookup: {
          from: 'orders',
          let: { dishId: '$_id' },
          pipeline: [
            { $match: { restaurant: restaurantObjId } },
            { $unwind: '$items' },
            { $match: { $expr: { $eq: ['$items.dish', '$$dishId'] } } },
            {
              $group: {
                _id: null,
                order_count: { $sum: 1 },
                total_quantity: { $sum: '$items.quantity' },
                total_revenue: {
                  $sum: { $multiply: ['$items.quantity', { $toDouble: '$items.price' }] },
                },
              },
            },
          ],
          as: 'orderStats',
        },
      },
      {
        $addFields: {
          order_count: { $ifNull: [{ $arrayElemAt: ['$orderStats.order_count', 0] }, 0] },
          total_quantity: { $ifNull: [{ $arrayElemAt: ['$orderStats.total_quantity', 0] }, 0] },
          total_revenue: { $ifNull: [{ $arrayElemAt: ['$orderStats.total_revenue', 0] }, 0] },
        },
      },
      { $sort: { total_quantity: -1 } },
      { $limit: 5 },
      {
        $project: {
          name: 1,
          price: { $toDouble: '$price' },
          image: 1,
          order_count: 1,
          total_quantity: 1,
          total_revenue: 1,
        },
      },
    ]);
 
    return res.status(200).json({
      restaurant: {
        id: restaurant._id,
        name: restaurant.owner?.name,
        email: restaurant.owner?.email,
        phone: restaurant.owner?.phone,
        description: restaurant.description,
        location: restaurant.location,
        allowedRadiusKm: restaurant.allowedRadiusKm,
        openTime: restaurant.openTime,
        closeTime: restaurant.closeTime,
        deliveryFees: restaurant.deliveryFees,
        isOpen: restaurant.isOpen,
      },
      stats: {
        dishes: { total: totalDishes, available: availableDishes },
        orders: {
          today: todayStats?.today_orders || 0,
          pending: pendingOrders,
          total: totalStats?.total_orders || 0,
        },
        revenue: {
          today: todayStats?.today_revenue || 0,
          total: totalStats?.total_revenue || 0,
        },
      },
      recentOrders,
      topDishes,
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
 
const getRestaurantOrders = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantProfileId;
    const { status, limit = 50, offset = 0 } = req.query;
 
    const filter = { restaurant: restaurantId };
    if (status) filter.status = status;
 
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(parseInt(offset, 10))
      .limit(parseInt(limit, 10))
      .populate('customer', 'name phone email')
      .populate('payment', 'status')
      .populate('items.dish', 'name image');
 
    const ordersFormatted = await Promise.all(
      orders.map(async (order) => {
        let chat_room_id = null;
 
        if (order.isReservation && order.payment?.status === 'confirmed') {
          const chatRoom = await ChatRoom.findOne({ order: order._id }).select('_id');
          chat_room_id = chatRoom ? chatRoom._id : null;
        }
 
        return {
          id: order._id,
          total_amount: order.totalAmount,
          delivery_fee: order.deliveryFee,
          status: order.status,
          is_reservation: order.isReservation,
          reservation_date: order.reservationDate,
          location: order.deliveryAddress?.label,
          created_at: order.createdAt,
          lat: order.deliveryAddress?.point?.coordinates?.[1],
          lng: order.deliveryAddress?.point?.coordinates?.[0],
          payment_status: order.payment?.status || null,
          customer_name: order.customer?.name,
          customer_phone: order.customer?.phone,
          customer_email: order.customer?.email,
          chat_room_id,
          items: order.items.map((item) => ({
            dish_id: item.dish?._id,
            dish_name: item.dish?.name,
            dish_image: item.dish?.image,
            quantity: item.quantity,
            price: item.price,
          })),
        };
      })
    );
 
    return res.status(200).json({ orders: ordersFormatted });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
 
const updateOrderStatus = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantProfileId;
    const { orderId, status } = req.body;
 
    const validStatuses = ['pending', 'paid', 'cooking', 'delivering', 'completed', 'cancelled'];
 
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
 
    const order = await Order.findOne({ _id: orderId, restaurant: restaurantId });
 
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
 
    order.status = status;
    await order.save();
 
    return res.status(200).json({ message: "Order status updated successfully" });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
 
module.exports = {
  changeRestaurantPassword,
  AddInfoRestaurant,
  loginForRestaurant,
  restaurantProfile,
  changeResturantinfo,
  openOrCloseRestaurant,
  changeDeliveryFee,
  getDashboardStats,
  getRestaurantOrders,
  updateOrderStatus,
  updateRestaurantLocation,
  restaurantProfileStatus,
  sendOTPEmail,
};