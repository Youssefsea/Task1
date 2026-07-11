const jwt = require('jsonwebtoken');
const data = require('../dataSchema/data');
const Restaurant=require('../dataSchema/Restaurant');
const User=require('../dataSchema/User');



const sureToken = (req, res, next) => {
  try {
    const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
console.log('Received token:', token);

    if (!token) {
      return res.status(401).send({ message: 'No token provided' });
    }
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
console.log('Authenticated user:', req.user);
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(401).send({ message: 'Invalid or expired token' });
  }
};

const verifyRoleForRestaurant = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.role !== 'restaurant') {
      return res.status(403).send({ message: 'Unauthorized: Requires restaurant role' });
    }

    const restaurantProfile = await Restaurant.findOne({ owner: user.id });
    
    if (!restaurantProfile) {
      return res.status(403).send({ message: 'Restaurant profile not found' });
    }

    req.user.restaurantProfileId = restaurantProfile._id;
    next();
  } catch (error) {
    console.error('Error in verifyRoleForRestaurant:', error);
    return res.status(500).send({ message: 'Internal server error' });
  }
};

 const verifyResturntAreActive = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const restaurant = await Restaurant.findOne({ owner: userId, isDeleted: false });

    if (!restaurant) {
      return res.status(400).json({ error: "Restaurant profile not found or has been deleted" });
    }

    if (!restaurant.isVerified) {
      return res.status(403).json({ error: "Restaurant account is not verified yet" });
    }

    next();
  } catch (error) {
    console.error('Error in verifyResturntAreActive:', error);
    return res.status(500).send({ message: 'Internal server error' });
  }
};

 const verifyRoleForCustomer = (req, res, next) => {
  const user = req.user;
  if (user.role !== 'customer') {
    return res.status(403).send({ message: 'Unauthorized: Requires customer role' });
  }
  next();
};
 const verifyRoleForAdmin = (req, res, next) => {
  const admin = req.user;
  if (admin.role !== 'admin') {
    return res.status(403).send({ message: 'Unauthorized: Requires admin role' });
  }
  next();
};

module.exports = { sureToken, verifyRoleForRestaurant, verifyResturntAreActive, verifyRoleForCustomer, verifyRoleForAdmin };