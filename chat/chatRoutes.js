
const data = require('../dataSchema/data');
const { pusher } = require('./chatSocket');
const Dish=require('../dataSchema/Dish');
const User=require('../dataSchema/User');
const Restaurant=require('../dataSchema/Restaurant');
const Wallet=require('../dataSchema/Wallet');
const Order=require('../dataSchema/Order');
const Payment=require('../dataSchema/PaymentSchema');
const Cart=require('../dataSchema/Cart');
const ChatRoom=require('../dataSchema/ChatRoom');

const getLastMessage = async (roomId) => {
    return ChatMessage.findOne({ room: roomId })
        .sort({ createdAt: -1 })
        .select('message createdAt');
};
 
const getChatRoomsForCustomer = async (req, res) => {
    try {
        const customerId = req.user.id;
 
        const roomsDocs = await ChatRoom.find({ customer: customerId })
            .sort({ createdAt: -1 })
            .populate({
                path: 'restaurant',
                populate: { path: 'owner', select: 'name' },
            })
            .populate('order', 'status');
 
        const rooms = await Promise.all(
            roomsDocs.map(async (room) => {
                const lastMessage = await getLastMessage(room._id);
 
                return {
                    id: room._id,
                    order_id: room.order?._id,
                    created_at: room.createdAt,
                    restaurant_name: room.restaurant?.owner?.name,
                    order_status: room.order?.status,
                    last_message: lastMessage?.message || null,
                    last_message_time: lastMessage?.createdAt || null,
                };
            })
        );
 
        return res.status(200).json({ rooms });
 
    } catch (err) {
        console.error('Error getting chat rooms:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
 
const getChatRoomsForRestaurant = async (req, res) => {
    try {
        const restaurantUserId = req.user.id;
 
        const roomsDocs = await ChatRoom.find({ restaurant: restaurantUserId })
            .sort({ createdAt: -1 })
            .populate('customer', 'name')
            .populate('order', 'status');
 
        const rooms = await Promise.all(
            roomsDocs.map(async (room) => {
                const lastMessage = await getLastMessage(room._id);
 
                return {
                    id: room._id,
                    order_id: room.order?._id,
                    created_at: room.createdAt,
                    customer_name: room.customer?.name,
                    order_status: room.order?.status,
                    last_message: lastMessage?.message || null,
                    last_message_time: lastMessage?.createdAt || null,
                };
            })
        );
 
        return res.status(200).json({ rooms });
 
    } catch (err) {
        console.error('Error getting chat rooms:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
 
const getChatMessages = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { roomId } = req.params;
 
        const room = await ChatRoom.findById(roomId);
 
        if (!room) {
            return res.status(404).json({ error: 'Chat room not found' });
        }
 
        const hasAccess = checkRoomAccess(room, userId, userRole);
 
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this chat room' });
        }
 
        const messagesDocs = await ChatMessage.find({ room: roomId })
            .sort({ createdAt: 1 })
            .populate('sender', 'name role');
 
        const messages = messagesDocs.map((m) => ({
            id: m._id,
            room_id: m.room,
            sender_id: m.sender?._id,
            sender_name: m.sender?.name,
            sender_role: m.sender?.role,
            message: m.message,
            created_at: m.createdAt,
        }));
 
        return res.status(200).json({
            room: {
                id: room._id,
                order_id: room.order,
                customer_id: room.customer,
                restaurant_id: room.restaurant
            },
            messages
        });
 
    } catch (err) {
        console.error('Error getting messages:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
 
const getChatRoomByOrderId = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { orderId } = req.params;
 
        const room = await ChatRoom.findOne({ order: orderId });
 
        if (!room) {
            return res.status(404).json({ error: 'Chat room not found for this order' });
        }
 
        const hasAccess = checkRoomAccess(room, userId, userRole);
 
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this chat room' });
        }
 
        return res.status(200).json({ room });
 
    } catch (err) {
        console.error('Error getting chat room:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
 
const sendMessage = async (req, res) => {
    try {
        const senderId = req.user.id;
        const senderRole = req.user.role;
        const senderName = req.user.name;
        const { roomId } = req.params;
        const { message } = req.body;
 
        console.log('=== SEND MESSAGE ===');
        console.log('Sender ID:', senderId, '| Role:', senderRole, '| Room:', roomId);
 
        if (!message || message.trim() === '') {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }
 
        const room = await ChatRoom.findById(roomId);
 
        if (!room) {
            return res.status(404).json({ error: 'Chat room not found' });
        }
 
        let hasAccess = false;
 
        if (senderRole === 'customer' && String(room.customer) === String(senderId)) {
            hasAccess = true;
        } else if (senderRole === 'restaurant') {
            if (String(room.restaurant) === String(senderId)) {
                hasAccess = true;
            } else {
                const restaurantProfile = await Restaurant.findOne({ owner: senderId }).select('_id');
                if (
                    restaurantProfile &&
                    String(restaurantProfile._id) === String(room.restaurant)
                ) {
                    hasAccess = true;
                }
            }
        }
 
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to send message in this room' });
        }
 
        const savedMessage = await ChatMessage.create({
            room: roomId,
            sender: senderId,
            message: message.trim(),
        });
 
        const newMessage = {
            id: savedMessage._id,
            room_id: roomId,
            sender_id: senderId,
            sender_name: senderName,
            sender_role: senderRole,
            message: savedMessage.message,
            created_at: savedMessage.createdAt
        };
 
        await pusher.trigger(`room-${roomId}`, 'new-message', newMessage);
 
        console.log('✅ Message saved & pushed | ID:', newMessage.id);
 
        return res.status(201).json({ message: newMessage });
 
    } catch (err) {
        console.error('Error sending message:', err);
        return res.status(500).json({ error: 'Failed to send message' });
    }
};
 
const pusherAuth = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { socket_id, channel_name } = req.body;
 
        const roomId = channel_name.replace('private-room-', '');
 
        const room = await ChatRoom.findById(roomId);
 
        if (!room) {
            return res.status(404).json({ error: 'Chat room not found' });
        }
 
        const hasAccess = checkRoomAccess(room, userId, userRole);
 
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }
 
        const authResponse = pusher.authorizeChannel(socket_id, channel_name, {
            user_id: String(userId),
            user_info: { name: req.user.name, role: userRole }
        });
 
        return res.status(200).json(authResponse);
 
    } catch (err) {
        console.error('Pusher auth error:', err);
        return res.status(500).json({ error: 'Auth failed' });
    }
};
 
const checkRoomAccess = (room, userId, userRole) => {
    if (userRole === 'customer') {
        return String(room.customer) === String(userId);
    }
    if (userRole === 'restaurant') {
        return String(room.restaurant) === String(userId);
    }
    return false;
};
 
module.exports = {
    getChatRoomsForCustomer,
    getChatRoomsForRestaurant,
    getChatMessages,
    getChatRoomByOrderId,
    sendMessage,
    pusherAuth
};