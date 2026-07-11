const data=require('../dataSchema/data');
const axios = require('axios');
const { sendMail } = require('../dataSchema/mailService');
const User=require('../dataSchema/user');
const Cart=require('../dataSchema/Cart');
const Dish=require('../dataSchema/Dish');
const Order=require('../dataSchema/Order');
const Wallet=require('../dataSchema/Wallet');
const Payment=require('../dataSchema/PaymentSchema');
const Restaurant=require('../dataSchema/Restaurant');
const ChatRoom=require('../dataSchema/ChatRoom');

const { bookingCustomerTemplate, bookingRestaurantTemplate } = require('../dataSchema/emailTemplates');

const sendBookingEmailsForOrder = async ({ orderId, customerId, restaurantId, reservationDate }) => {
  try {
    const order = await Order.findById(orderId).populate(
      "items.dish",
      "name"
    );
const customer = await User.findById(customerId).select("name email");

  const restaurant = await Restaurant.findById(restaurantId)
      .populate("owner", "name email");

    if (!order || !customer || !restaurant) {
      return;
    }
 const dishLines = order.items
      .map((item) => `- ${item.dish.name} x${item.quantity}`)
      .join("\n");
    const customerEmail = bookingCustomerTemplate({
      customerName: customer.name,
      dishLines,
      reservationDate,
    });

    const restaurantEmail = bookingRestaurantTemplate({
      restaurantName: restaurant.name,
      customerName: customer.name,
      dishLines,
      reservationDate,
    });

    await Promise.all([
      sendMail({
        to: customer.email,
        subject: customerEmail.subject,
        text: customerEmail.text,
        html: customerEmail.html,
      }),
      sendMail({
        to: restaurant.email,
        subject: restaurantEmail.subject,
        text: restaurantEmail.text,
        html: restaurantEmail.html,
      }),
    ]);
  } catch (err) {
    console.error('Failed to send booking emails:', err.message);
  }
};

const latLngToAddressOSM = async (lat, lng) => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": "NodeJS-App" }
    });
    return response.data.display_name;
  } catch (error) {
    console.error(error);
    return "Error fetching address";
  }
};

const lookForNearRestaurants = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (lat == null || lng == null) {
      return res.status(400).json({
        error: "lat & lng required",
      });
    }

    const restaurants = await Restaurant.find({
      "deliveryAreas.area": {
        $geoIntersects: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
        },
      },
    }).select("description location deliveryAreas");

    if (!restaurants.length) {
      return res.status(404).json({
        message: "No nearby restaurants found",
      });
    }

    const result = [];

    restaurants.forEach((restaurant) => {
      restaurant.deliveryAreas.forEach((area) => {
        result.push({
          id: restaurant.id,
          area_id: area.id,
          restaurant_id: restaurant.id,
          description: restaurant.description,
          location: restaurant.location,
        });
      });
    });

    return res.status(200).json({
      count: result.length,
      nearby_restaurants: result,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

const lookForResByName = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({
        error: "Name query parameter is required",
      });
    }

    const restaurants = await Restaurant.find()
      .populate({
        path: "owner",
        match: {
          name: {
            $regex: name,
            $options: "i", 
          },
        },
        select: "name phone",
      });

    const filteredRestaurants = restaurants.filter(
      (restaurant) => restaurant.owner
    );

    if (filteredRestaurants.length === 0) {
      return res.status(404).json({
        message: "No restaurants found",
      });
    }

    return res.status(200).json({
      restaurant: filteredRestaurants.map((restaurant) => ({
        id: restaurant.id,
        user_id: restaurant.owner.id,
        restaurant_name: restaurant.owner.name,
        phone: restaurant.owner.phone,
        description: restaurant.description,
        location: restaurant.location,
        delivery_fees: restaurant.deliveryFees,
        is_open: restaurant.isOpen,
        can_deliver: restaurant.deliveryAreas.some(
          (area) => area.canDeliver
        ),
        can_reserve: restaurant.deliveryAreas.some(
          (area) => area.canReserve
        ),
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};


const lookforAllRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find({
      isOpen: true,
      isDeleted: false,
    })
      .populate("owner", "name")
      .select(
        "description location deliveryFees isOpen deliveryAreas owner"
      );

    if (!restaurants.length) {
      return res.status(404).json({
        error: "No restaurants found",
      });
    }

    const result = restaurants.map((restaurant) => ({
      id: restaurant._id,
      user_id: restaurant.owner?._id,
      restaurant_name: restaurant.owner?.name,
      description: restaurant.description,
      location: restaurant.location,
      delivery_fees: restaurant.deliveryFees,
      can_deliver: restaurant.deliveryAreas.some(
        (area) => area.canDeliver
      ),
      can_reserve: restaurant.deliveryAreas.some(
        (area) => area.canReserve
      ),
    }));

    console.log("Restaurants found:", result);

    return res.status(200).json({
      restaurants: result,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

const restaurantsWhoCanResiveOrder = async (req, res) => {
  try {
    const restaurants = await Restaurant.find({
      deliveryAreas: {
        $elemMatch: {
          canReserve: true,
        },
      },
    }).select("description location");

    if (!restaurants.length) {
      return res.status(404).json({
        error: "No restaurant available to receive orders",
      });
    }

    return res.status(200).json({
      restaurants,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};



const addDishToCart = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { dishId, quantity } = req.body;

    const dish = await Dish.findById(dishId);

    if (!dish) {
      return res.status(404).json({
        error: "Dish not found",
      });
    }

    if (!dish.isAvailable) {
      return res.status(400).json({
        error: "Dish is not available",
      });
    }

    let cart = await Cart.findOne({ user: customerId });

    if (!cart) {
      cart = await Cart.create({
        user: customerId,
        items: [
          {
            dish: dishId,
            quantity,
          },
        ],
      });

      return res.status(201).json({
        message: "Dish added to cart successfully",
      });
    }

    const existingItem = cart.items.find(
      (item) => item.dish.toString() === dishId
    );

    if (!existingItem) {
      cart.items.push({
        dish: dishId,
        quantity,
      });

      await cart.save();

      return res.status(201).json({
        message: "Dish added to cart successfully",
      });
    }

    existingItem.quantity += quantity;

    await cart.save();

    return res.status(200).json({
      message: "Dish quantity updated in cart successfully",
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

const updateDishQuantityInCart = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { dishId, quantity } = req.body;

    const cart = await Cart.findOne({ user: customerId });

    if (!cart) {
      return res.status(400).json({
        error: "Cart not found",
      });
    }

    const item = cart.items.find(
      (item) => item.dish.toString() === dishId
    );

    if (!item) {
      return res.status(400).json({
        error: "Dish not found in cart",
      });
    }

    item.quantity = quantity;

    await cart.save();

    return res.status(200).json({
      message: "Dish quantity updated in cart successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

const deleteDishFromCart = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { dishId } = req.body;

    const cart = await Cart.findOne({ user: customerId });

    if (!cart) {
      return res.status(400).json({
        error: "Cart not found",
      });
    }

    const item = cart.items.find(
      (item) => item.dish.toString() === dishId
    );

    if (!item) {
      return res.status(400).json({
        error: "Dish not found in cart",
      });
    }

    cart.items = cart.items.filter(
      (item) => item.dish.toString() !== dishId
    );

    await cart.save();

    return res.status(200).json({
      message: "Dish removed from cart successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};


const getCartDetails = async (req, res) => {
  try {
    const customerId = req.user.id;
 
    const cart = await Cart.findOne({ user: customerId }).populate({
      path: 'items.dish',
      select: 'name description price image restaurant',
      populate: {
        path: 'restaurant',
        select: 'location deliveryFees deliveryAreas isOpen owner',
        populate: { path: 'owner', select: 'name' },
      },
    });
 
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }
 
    console.log("Cart ID:", cart._id);
    console.log("Cart Items:", cart.items);
 
    if (cart.items.length === 0) {
      console.log("Cart is empty");
      return res.status(200).json({
        cartItems: [],
        groupedByRestaurant: [],
        summary: {
          totalRestaurants: 0,
          totalItems: 0,
          grandTotal: 0
        }
      });
    }
 
    const detailedCartItems = cart.items
      .map(item => {
        const dish = item.dish;
        if (!dish || !dish.restaurant) return null;
 
        const restaurant = dish.restaurant;
 
        return {
          dishId: dish._id,
          quantity: item.quantity,
          image: dish.image,
          name: dish.name,
          description: dish.description,
          price: dish.price,
          restaurantId: restaurant._id,
          restaurantName: restaurant.owner?.name,
          restaurantLocation: restaurant.location,
          restaurantCanReserve: restaurant.deliveryAreas[0]?.canReserve,
          restaurantCanDeliver: restaurant.deliveryAreas[0]?.canDeliver,
          is_open: restaurant.isOpen,
          deliveryFee: restaurant.deliveryFees,
 
          subtotal: dish.price * item.quantity
        };
      })
      .filter(Boolean);
 
 
 
    const groupedByRestaurant = detailedCartItems.reduce((acc, item) => {
      let restaurant = acc.find(
        r => String(r.restaurantId) === String(item.restaurantId)
      );
 
      if (!restaurant) {
        restaurant = {
          restaurantId: item.restaurantId,
          restaurantName: item.restaurantName,
          restaurantCanReserve: item.restaurantCanReserve,
          restaurantCanDeliver: item.restaurantCanDeliver,
          restaurantLocation: item.restaurantLocation,
          deliveryFee: item.deliveryFee,
          dishes: [],
          totalItems: 0,
          totalPrice: 0
        };
 
        acc.push(restaurant);
      }
 
      restaurant.dishes.push({
 
        dishId: item.dishId,
        image: item.image,
        quantity: item.quantity,
        name: item.name,
        description: item.description,
        price: item.price,
        subtotal: item.subtotal
      });
 
      restaurant.totalItems += item.quantity;
      restaurant.totalPrice += item.subtotal;
 
      return acc;
    }, []);
 
    for (let i = 0; i < groupedByRestaurant.length; i++) {
      const cartItem = cart.items.find(
        (ci) => ci.dish && ci.dish.restaurant && String(ci.dish.restaurant._id) === String(groupedByRestaurant[i].restaurantId)
      );
      const area = cartItem?.dish?.restaurant?.deliveryAreas?.[0];
      const points = area?.area?.coordinates?.[0] || [];
 
      let restaurantLat = null, restaurantLng = null;
      if (points.length > 0) {
        let sumLat = 0, sumLng = 0;
 
        points.forEach(p => {
          sumLng += p[0];
          sumLat += p[1];
        });
 
        restaurantLng = sumLng / points.length;
        restaurantLat = sumLat / points.length;
      }
 
      groupedByRestaurant[i] = {
        ...groupedByRestaurant[i],
        restaurantLat,
        restaurantLng
      };
    }
 
    const grandTotal = groupedByRestaurant.reduce(
      (sum, r) => sum + r.totalPrice,
      0
    );
 
    const totalItems = groupedByRestaurant.reduce(
      (sum, r) => sum + r.totalItems,
      0
    );
 
    return res.status(200).json({
      cartItems: detailedCartItems,
      groupedByRestaurant,
      summary: {
        totalRestaurants: groupedByRestaurant.length,
        totalItems,
        grandTotal
      }
    });
 
  } catch (err) {
    console.error("getCartDetails error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};



const countAtCart = async (req, res) => {
  try {
    const customerId = req.user.id;

    const cart = await Cart.findOne({ user: customerId });

    if (!cart) {
      return res.status(404).json({
        error: "Cart not found",
      });
    }

    if (cart.items.length === 0) {
      return res.status(400).json({
        error: "Cart is empty",
      });
    }

    const count = cart.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    return res.status(200).json({ count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};







const getDistanceInKm = ([lng1, lat1], [lng2, lat2]) => {
  const R = 6371; 
  const toRad = (deg) => (deg * Math.PI) / 180;
 
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
 
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
 
const makeOrder = async (req, res) => {
  const session = await mongoose.startSession();
 
  try {
    session.startTransaction();
 
    const customerId = req.user.id;
    const { is_reservation, reservation_date, lat, lng, restaurantId } = req.body;
    const location = await latLngToAddressOSM(lat, lng);
 
    const cart = await Cart.findOne({ user: customerId })
      .populate({
        path: 'items.dish',
        populate: { path: 'restaurant' },
      })
      .session(session);
 
    if (!cart) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Cart not found' });
    }
 
    let cartItems = cart.items.filter((item) => item.dish && item.dish.restaurant);
 
    if (restaurantId) {
      cartItems = cartItems.filter(
        (item) => item.dish.restaurant._id.toString() === restaurantId.toString()
      );
    }
 
    if (cartItems.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Cart is empty or no items from selected restaurant' });
    }
 
    const groupOfResCartDishes = {};
    for (const item of cartItems) {
      const resId = item.dish.restaurant._id.toString();
      if (!groupOfResCartDishes[resId]) groupOfResCartDishes[resId] = [];
      groupOfResCartDishes[resId].push(item);
    }
 
    if (is_reservation) {
      const canReserveExists = await Restaurant.exists({
        'deliveryAreas.canReserve': true,
      }).session(session);
 
      if (!canReserveExists) {
        throw new Error('No restaurant available to receive reservations');
      }
    }
 
    const createdOrders = [];
    const failedOrders = [];
    const orderedDishIds = [];
 
    for (const resId of Object.keys(groupOfResCartDishes)) {
      try {
        const restaurant = await Restaurant.findById(resId).session(session);
 
        if (!restaurant || !restaurant.isOpen) {
          failedOrders.push({ restaurantId: resId, reason: 'Restaurant is closed' });
          continue;
        }
 
        if (!restaurant.deliveryAreas || restaurant.deliveryAreas.length === 0) {
          failedOrders.push({ restaurantId: resId, reason: 'Restaurant has no delivery areas defined' });
          continue;
        }
 
        const points = restaurant.deliveryAreas[0].area?.coordinates?.[0] || [];
 
        if (points.length === 0) {
          failedOrders.push({ restaurantId: resId, reason: 'Restaurant has invalid delivery area geometry' });
          continue;
        }
 
        let sumLat = 0;
        let sumLng = 0;
        points.forEach(([pLng, pLat]) => {
          sumLng += pLng;
          sumLat += pLat;
        });
 
        const lngOfRes = sumLng / points.length;
        const latOfRes = sumLat / points.length;
 
        let totalAmount = 0;
        const orderItems = groupOfResCartDishes[resId].map((item) => {
          const price = item.dish.price;
          totalAmount += price * item.quantity;
          return {
            dish: item.dish._id,
            quantity: item.quantity,
            price,
          };
        });
 
        const allowedRadius = restaurant.allowedRadiusKm;
        const distanceInKm = getDistanceInKm([lng, lat], [lngOfRes, latOfRes]);
 
        if (distanceInKm > allowedRadius) {
          failedOrders.push({
            restaurantId: resId,
            reason: 'Delivery location is outside allowed radius',
            allowedRadius,
            distanceInKm,
          });
          continue;
        }
 
        const deliveryFee = parseFloat((restaurant.deliveryFees * distanceInKm).toFixed(2));
        totalAmount += deliveryFee;
 
        const [order] = await Order.create(
          [
            {
              customer: customerId,
              restaurant: resId,
              status: 'pending',
              isReservation: is_reservation || false,
              reservationDate: reservation_date || null,
              deliveryAddress: {
                label: location,
                point: {
                  type: 'Point',
                  coordinates: [lng, lat],
                },
              },
              totalAmount,
              deliveryFee,
              items: orderItems,
            },
          ],
          { session }
        );
 
        orderItems.forEach((item) => orderedDishIds.push(item.dish));
 
        createdOrders.push({
          orderId: order._id,
          restaurantId: resId,
          totalAmount,
          deliveryFee,
          customerLocation: { address: location, lat, lng },
        });
 
        if (is_reservation && reservation_date) {
          await sendBookingEmailsForOrder({
            orderId: order._id,
            customerId,
            restaurantId: resId,
            reservationDate: reservation_date,
          });
        }
      } catch (err) {
        failedOrders.push({ restaurantId: resId, reason: err.message });
        continue;
      }
    }
 
    if (orderedDishIds.length > 0) {
      await Cart.updateOne(
        { _id: cart._id },
        { $pull: { items: { dish: { $in: orderedDishIds } } } },
        { session }
      );
    }
 
    if (createdOrders.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'No orders created', failedOrders });
    }
 
    await session.commitTransaction();
 
    return res.status(201).json({
      message: 'Order processing completed',
      createdOrders,
      failedOrders,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
  }
};


const getOrdersForCustomer = async (req, res) => {
  try {
    const customerId = req.user.id;

    const orders = await Order.find({ customer: customerId })
      .populate({
        path: "restaurant",
        populate: {
          path: "owner",
          select: "name",
        },
      })
      .populate({
        path: "payment",
        select: "status",
      })
      .populate({
        path: "items.dish",
        select: "name image price",
      })
      .sort({ createdAt: -1 });

    const result = orders.map((order) => ({
      id: order._id,
      restaurant_id: order.restaurant._id,
      restaurant_name: order.restaurant.owner.name,
      total_amount: order.totalAmount,
      status: order.status,
      created_at: order.createdAt,
      is_reservation: order.isReservation,
      reservation_date: order.reservationDate,
      payment_status: order.payment?.status ?? null,

      items: order.items.map((item) => ({
        dish_id: item.dish._id,
        dish_name: item.dish.name,
        dish_image: item.dish.image,
        dish_price: item.price,
        quantity: item.quantity,
      })),
    }));

    return res.status(200).json({
      orders: result,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};




module.exports={getOrdersForCustomer,countAtCart,addDishToCart,deleteDishFromCart,getCartDetails,lookForNearRestaurants,restaurantsWhoCanResiveOrder,makeOrder,lookforAllRestaurants,lookForResByName,updateDishQuantityInCart};
