import { Booking } from "../models/booking.model.js";
import { checkAvailability } from "./booking.controller.js";

function parseDateOnly(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const getBooking = async (req, res) => {
  try {
    const today = parseDateOnly(new Date().toISOString().slice(0, 10));
    const { status, upcoming } = req.query;

    const filter = {};

    // filter by status if provided e.g. ?status=confirmed
    if (status) filter.status = status;

    // filter upcoming only if ?upcoming=true
    if (upcoming === "true") filter["rooms.checkOut"] = { $gte: today };

    const existingBookings = await Booking.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({ data: existingBookings });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

//update confirmed bookign to cancelled or blocked
export const updateBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const existingBooking = await Booking.findById(bookingId);
    if (!existingBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const status = req.body?.status;
    if (!status) return res.status(400).json({ message: "status required" });

    const validStatuses = ["pending", "confirmed", "cancelled", "blocked"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (existingBooking.status === "confirmed" && status === "pending") {
      return res.status(400).json({
        message:
          "Cannot change confirmed booking to pending. Consider cancellation instead.",
      });
    }

    //cancellation status mail triggerr todo

    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      { status },
      { new: true }
    );

    return res.status(200).json({
      message: "Booking updated successfully",
      data: updatedBooking,
    });
  } catch (error) {
    console.error("error updating booking", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
