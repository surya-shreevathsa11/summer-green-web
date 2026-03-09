import { Booking } from "../models/booking.model.js";
import { Room, VariablePrice } from "../models/pricing.model.js";
import { BlockedDate } from "../models/blocked-date.model.js";

function parseDateOnly(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function parseDateOnlyUTC(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
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

//update confirmed booking to cancelled or blocked; cancelled -> delete from DB
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

    if (status === "cancelled") {
      await Booking.findByIdAndDelete(bookingId);
      return res.status(200).json({
        message: "Booking deleted",
        deleted: true,
      });
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      { status },
      { returnDocument: "after" }
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

// ─── PUT /api/admin/base-price ────────────────────────────────────────────────
// Body: { rooms: [{ roomId, pricePerNight }] }
export const updateBasePrices = async (req, res) => {
  try {
    const { rooms } = req.body;
    if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
      return res.status(400).json({ message: "rooms array is required" });
    }

    const updates = await Promise.all(
      rooms.map(function (r) {
        return Room.findOneAndUpdate(
          { roomId: r.roomId },
          { pricePerNight: r.pricePerNight },
          { returnDocument: "after" }
        );
      })
    );

    const failed = updates.filter((u) => !u);
    if (failed.length > 0) {
      return res.status(207).json({
        message: "Some rooms not found",
        updated: updates.filter(Boolean).map((r) => r.roomId),
      });
    }

    return res.status(200).json({
      message: "Base prices updated successfully",
      data: updates.map((r) => ({
        roomId: r.roomId,
        pricePerNight: r.pricePerNight,
      })),
    });
  } catch (error) {
    console.error("Error updating base prices:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ─── POST /api/admin/seasonal-price ──────────────────────────────────────────
// Body: { roomId, pricePerNight, reason, from, to }
export const addSeasonalPrice = async (req, res) => {
  try {
    const { roomId, pricePerNight, reason, from, to } = req.body;

    if (!roomId || !pricePerNight || !reason || !from || !to) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (fromDate >= toDate) {
      return res.status(400).json({ message: "from must be before to" });
    }

    // Check room exists
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Check for overlapping variable price entries for the same room
    const overlap = await VariablePrice.findOne({
      roomId,
      from: { $lt: toDate },
      to: { $gt: fromDate },
    });

    if (overlap) {
      return res.status(409).json({
        message: `Overlapping seasonal price already exists for ${roomId} (${overlap.from.toISOString().slice(0, 10)} – ${overlap.to.toISOString().slice(0, 10)})`,
      });
    }

    const entry = await VariablePrice.create({
      roomId,
      pricePerNight,
      reason,
      from: fromDate,
      to: toDate,
    });

    return res.status(201).json({
      message: "Seasonal price added successfully",
      data: entry,
    });
  } catch (error) {
    console.error("Error adding seasonal price:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ─── DELETE /api/admin/seasonal-price/:id ────────────────────────────────────
export const deleteSeasonalPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await VariablePrice.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Seasonal price not found" });
    }
    return res.status(200).json({ message: "Seasonal price deleted" });
  } catch (error) {
    console.error("Error deleting seasonal price:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ─── GET /api/admin/seasonal-price ───────────────────────────────────────────
// Optional: ?roomId=R1 to filter by room
export const getSeasonalPrices = async (req, res) => {
  try {
    const filter = {};
    if (req.query.roomId) filter.roomId = req.query.roomId;

    const entries = await VariablePrice.find(filter).sort({ from: 1 });
    return res.status(200).json({ data: entries });
  } catch (error) {
    console.error("Error fetching seasonal prices:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ─── GET /api/admin/block-dates ──────────────────────────────────────────────
export const getBlockedDates = async (req, res) => {
  try {
    const filter = {};
    if (req.query.roomId) filter.roomId = req.query.roomId;

    const entries = await BlockedDate.find(filter).sort({ from: 1 });
    return res.status(200).json({ data: entries });
  } catch (error) {
    console.error("Error fetching block dates:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ─── POST /api/admin/block-dates ──────────────────────────────────────────────
// Body: { roomId, from, to } — from/to as YYYY-MM-DD
export const addBlockedDate = async (req, res) => {
  try {
    const { roomId, from, to } = req.body;

    if (!roomId || !from || !to) {
      return res.status(400).json({ message: "roomId, from and to are required" });
    }

    const fromDate = parseDateOnlyUTC(from);
    const toDate = parseDateOnlyUTC(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format; use YYYY-MM-DD" });
    }

    if (fromDate >= toDate) {
      return res.status(400).json({ message: "From date must be before to date" });
    }

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const entry = await BlockedDate.create({
      roomId,
      from: fromDate,
      to: toDate,
    });

    return res.status(201).json({
      message: "Dates blocked successfully",
      data: entry,
    });
  } catch (error) {
    console.error("Error adding block dates:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ─── DELETE /api/admin/block-dates/:id ─────────────────────────────────────────
export const deleteBlockedDate = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await BlockedDate.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Block not found" });
    }
    return res.status(200).json({ message: "Block removed" });
  } catch (error) {
    console.error("Error deleting block date:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
