

const data=require('../dataSchema/data');
const { Readable } = require('stream');
const cloudinary = require('../dataSchema/cloudTheImg');
const Dish=require('../dataSchema/Dish');

const User=require('../dataSchema/User');
const Restaurant=require('../dataSchema/Restaurant');
const Wallet=require('../dataSchema/Wallet');
const Order=require('../dataSchema/Order');
const Payment=require('../dataSchema/PaymentSchema');
const Cart=require('../dataSchema/Cart');
const ChatRoom=require('../dataSchema/ChatRoom');



const addDishesForRestaurant = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantProfileId;
    const { name, description, price, preparation_time, category } = req.body;
    const imges = req.files;
 
    if (!imges || imges.length === 0) {
      return res.status(400).json({ error: 'At least one image is required' });
    }
 
    const imageUrls = [];
 
    for (const file of imges) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'foodimg' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        Readable.from(file.buffer).pipe(stream);
      });
      imageUrls.push(uploadResult.secure_url);
    }
 
    const image_url = imageUrls.join(',');
 
    const newDish = await Dish.create({
      restaurant: restaurantId,
      name,
      description,
      price,
      preparationTime: preparation_time,
      category,
      image: image_url,
    });
 
    return res.status(201).json({ message: 'Dish added successfully', dish: newDish });
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
 
const getAllResDishes = async (req, res) => {
  try {
    const result = await Dish.aggregate([
      { $sort: { restaurant: 1, image: 1 } },
      {
        $group: {
          _id: '$restaurant',
          images: { $push: '$image' },
        },
      },
      {
        $project: {
          _id: 0,
          restaurant_id: '$_id',
          images: { $slice: ['$images', 3] },
        },
      },
    ]);
 
    return res.status(200).json({ data: result });
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
 
const getAllDishesForRestaurantVendor = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantProfileId;
    const dishes = await Dish.find({ restaurant: restaurantId });
 
    return res.status(200).json({ dishes });
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
 
const EXPLORE_FIELDS = 'restaurant name description price preparationTime category image _id isAvailable';
 
const getAllDishesForRestaurantExplore = async (req, res) => {
  try {
    const { restaurantId } = req.body || '';
 
    if (restaurantId) {
      const dishes = await Dish.find({ restaurant: restaurantId, isAvailable: true }).select(
        EXPLORE_FIELDS
      );
 
      return res.status(200).json({ dishes });
    }
 
    const dishesRows = await Dish.find({ isAvailable: true })
      .sort({ restaurant: 1 })
      .select(EXPLORE_FIELDS);
 
const dishesByRestaurant = dishesRows.reduce((acc, dish) => {
  const dishData = dish.toObject();

  const restaurantId = dishData.restaurant.toString();

  if (!acc[restaurantId]) {
    acc[restaurantId] = [];
  }

  delete dishData.restaurant;

  acc[restaurantId].push(dishData);

  return acc;
}, {});
 
    return res.status(200).json({ dishes: dishesByRestaurant });
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
 
const changeResturantDish = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantProfileId;
    const { name, description, price, preparation_time, category, dishId } = req.body;
 
    await Dish.updateOne(
      { _id: dishId, restaurant: restaurantId },
      {
        name,
        description,
        price,
        preparationTime: preparation_time,
        category,
      }
    );
 
    return res.status(200).json({ message: 'Dish information updated successfully' });
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
 
const changeDishAvailability = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantProfileId;
    const { dishId, is_available } = req.body;
 
    await Dish.updateOne({ _id: dishId, restaurant: restaurantId }, { isAvailable: is_available });
 
    return res.status(200).json({ message: 'Dish availability updated successfully' });
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
 
const delelteDish = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantProfileId;
    const { dishId } = req.body;
 
    await Dish.deleteOne({ _id: dishId, restaurant: restaurantId });
 
    return res.status(200).json({ message: 'Dish deleted successfully' });
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
 
module.exports = {
  addDishesForRestaurant,
  changeResturantDish,
  changeDishAvailability,
  delelteDish,
  getAllResDishes,
  getAllDishesForRestaurantVendor,
  getAllDishesForRestaurantExplore,
};