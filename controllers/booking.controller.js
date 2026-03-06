import { Booking } from "../models/booking.model.js";
import { Room, VariablePrice } from "../models/pricing.model.js";
import { Cart } from "../models/cart.model.js";

function parseDateOnly(str) {
  // Parse as YYYY-MM-DD and create at UTC midnight
  const [y, m, d] = str.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)); // UTC midnight
}

async function calculateBookingPrice(roomId, checkIn, checkOut) {
  const start = parseDateOnly(checkIn);
  const end = parseDateOnly(checkOut);

  const room = await Room.findOne({ roomId });
  if (!room) throw new Error("Room not found");

  const overrides = await VariablePrice.find({
    roomId,
    from: { $lte: end },
    to: { $gte: start },
  });

  let totalPrice = 0;
  const breakdown = [];

  for (
    let date = new Date(start);
    date < end;
    date.setDate(date.getDate() + 1)
  ) {
    const currentDate = new Date(date);

    let price = room.pricePerNight;
    let reason = "Base price";

    for (const override of overrides) {
      if (currentDate >= override.from && currentDate <= override.to) {
        price = override.pricePerNight;
        reason = override.reason;
        break;
      }
    }

    totalPrice += price;

    breakdown.push({
      date: currentDate.toISOString().split("T")[0],
      price,
      reason,
    });
  }

  return {
    totalPrice,
    breakdown,
  };
}

const checkAvailability = async (booking) => {
  try {
    const { roomId } = booking;

    const checkIn = parseDateOnly(booking.checkIn);
    const checkOut = parseDateOnly(booking.checkOut);
    const today = parseDateOnly(new Date().toISOString().slice(0, 10));

    const room = await Room.findOne({ roomId });
    if (!room) {
      return { 0: "Invalid Room Id" };
    }

    if (checkIn >= checkOut || checkIn <= today) {
      return { 0: "Please select a proper checkIn " };
    }

    const isRoomBooked = await Booking.findOne({
      roomId,
      status: { $in: ["paid", "blocked"] },
      checkOut: { $gt: booking.checkIn },
      checkIn: { $lt: booking.checkOut },
    });

    if (isRoomBooked) {
      return {
        0: `Room ${isRoomBooked.name} is unavailable for the selected dates`,
      };
    }

    return { 1: "ok" };
  } catch (error) {
    console.error("error while checking availability", error);
    throw new Error("Something went wrong while checking availability");
  }
};

const validateGuests = async (guestInfo) => {
  try {
    const { roomId, adults, children } = guestInfo;

    if (Number.isNaN(Number(adults)) || Number.isNaN(Number(children))) {
      return { 0: "Invalid guest count" };
    }

    if (!adults) {
      return { 0: "Atleast one adult required" };
    }

    const roomInfo = await Room.findOne({ roomId });

    if (
      adults > roomInfo.capacity.adults ||
      children > roomInfo.capacity.adults + roomInfo.capacity.children - adults
    ) {
      return { 0: "Invalid guest Count selected" };
    }

    return { 1: "ok" };
  } catch (error) {
    console.error("error validateGuests", error);
    throw new Error("Error validating guests");
  }
};

export const availabilityAndPrice = async (req, res) => {
  try {
    const roomInfo = await Room.findOne({ roomId: req.body?.roomId });
    if (!roomInfo) {
      return res.status(400).json({ message: "Room Id required" });
    }

    const roomId = req.body.roomId;
    const checkIn = req.body.checkIn;
    const checkOut = req.body.checkOut;

    const booking = {
      roomId: req.body.roomId,
      checkIn: req.body.checkIn,
      checkOut: req.body.checkOut,
    };

    const isRoomAvailable = checkAvailability(booking);
    if (Number(Object.keys(isRoomAvailable)[0])) {
      return res.status(400).json({ message: isRoomAvailable[0] });
    }

    const pricing = calculateBookingPrice(
      req.body.roomId,
      req.body.checkIn,
      req.body.checkOut,
    );

    const bookingDetails = {
      roomId,
      checkIn: parseDateOnly(checkIn),
      checkOut: parseDateOnly(checkOut),
      price: pricing.totalPrice,
      priceBreakdown: pricing.breakdown,
    };

    return res.status(200).json(bookingDetails);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { roomId, checkIn, checkOut, adults, children } = req.body;

    const booking = { roomId, checkIn, checkOut };

    const isRoomAvailable = await checkAvailability(booking);
    if (!Number(Object.keys(isRoomAvailable)[0])) {
      return res.status(400).json({ message: isRoomAvailable[0] });
    }

    const guestInfo = {
      roomId,
      adults,
      children,
    };

    const guestsAllowed = await validateGuests(guestInfo);
    if (!Number(Object.keys(guestsAllowed)[0])) {
      return res.status(400).json({ message: guestsAllowed[0] });
    }

    const pricing = await calculateBookingPrice(roomId, checkIn, checkOut);

    const bookingDetails = {
      roomId,
      checkIn: parseDateOnly(checkIn),
      checkOut: parseDateOnly(checkOut),
      price: pricing.totalPrice,
      priceBreakdown: pricing.breakdown,
      adults: Number(adults),
      children: Number(children),
    };

    const userCart = await Cart.findOne({ userId: req.user._id });

    if (userCart) {
      const overlap = userCart.roomInfo.find((room) => {
        if (room.roomId !== roomId) return false;

        const existingStart = new Date(room.checkIn);
        const existingEnd = new Date(room.checkOut);

        const newStart = new Date(checkIn);
        const newEnd = new Date(checkOut);

        return newStart < existingEnd && newEnd > existingStart;
      });

      if (overlap) {
        return res.status(400).json({
          message: "This room already exists in cart with overlapping dates",
        });
      }
    }

    if (!userCart) {
      const cart = await Cart.create({
        userId: req.user._id,
        roomInfo: [bookingDetails],
      });

      return res.status(201).json(cart);
    }

    const updatedCart = await Cart.findOneAndUpdate(
      { userId: req.user._id },
      { $push: { roomInfo: bookingDetails } },
      { returnDocument: "after" },
    );

    return res.status(200).json(updatedCart);
  } catch (error) {
    console.error("error adding to cart", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
<<<<<<< HEAD

export const listCart = async (req, res) => {
  try {
    const cart = await Cart.find({
      userId: req.user?._id,
    });

    console.log(cart);

    return res.status(200).json({ message: cart[0].roomInfo });
  } catch (error) {
    console.error("error listing cart", error);
    return res.status(500).json({ message: "something went wrong" });
  }
};
=======
>>>>>>> 1399671 (serverjs merge conflict resolved)
