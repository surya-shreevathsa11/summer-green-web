import { Booking } from "../models/booking.model.js";
import { Room, VariablePrice } from "../models/pricing.model.js";

function parseDateOnly(str) {
  // Parse as YYYY-MM-DD and create at UTC midnight
  const [y, m, d] = str.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)); // UTC midnight
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

    if (checkIn <= checkOut || checkIn <= today) {
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
    console.log("error while checking availability", error.message);
    throw new Error("Something went wrong while checking availability");
  }
};

const validateGuests = async (guestInfo) => {
  try {
    const { roomId, adults, children } = guestInfo;

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
