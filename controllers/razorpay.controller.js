import crypto from "crypto";
import mongoose from "mongoose";
import { Booking } from "../models/booking.model.js";
import { BookedNight } from "../models/booked-night.model.js";
import {
  sendConfirmationMailToAdmin,
  sendConfirmationMailToGuest,
  sendPaymentFailedMailToGuest,
} from "../utils/resend.util.js";
import { Cart } from "../models/cart.model.js";

function normalizeToUtcMidnight(dateInput) {
  const date = new Date(dateInput);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function enumerateStayNights(checkIn, checkOut) {
  const start = normalizeToUtcMidnight(checkIn);
  const end = normalizeToUtcMidnight(checkOut);
  const nights = [];

  for (let cursor = new Date(start); cursor < end; ) {
    nights.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return nights;
}

async function finalizeBookingAfterPayment({
  razorpayOrderId,
  razorpayPaymentId,
  amountPaid,
}) {
  const session = await mongoose.startSession();
  let finalizedBooking = null;
  let finalizeState = "unknown";

  try {
    await session.withTransaction(async () => {
      const booking = await Booking.findOne({ razorpayOrderId }).session(session);

      if (!booking) {
        finalizeState = "not_found";
        return;
      }

      if (booking.status === "confirmed") {
        finalizedBooking = booking;
        finalizeState = "already_confirmed";
        return;
      }

      if (booking.status !== "pending") {
        finalizeState = "invalid_state";
        return;
      }

      const nightClaims = [];

      for (const room of booking.rooms) {
        const nights = enumerateStayNights(room.checkIn, room.checkOut);
        for (const night of nights) {
          nightClaims.push({
            bookingId: booking._id,
            roomId: room.roomId,
            date: night,
          });
        }
      }

      if (nightClaims.length > 0) {
        await BookedNight.insertMany(nightClaims, { session, ordered: true });
      }

      booking.status = "confirmed";
      booking.razorpayPaymentId = razorpayPaymentId || booking.razorpayPaymentId;
      if (typeof amountPaid === "number" && !Number.isNaN(amountPaid)) {
        booking.amountPaid = amountPaid;
      }
      await booking.save({ session });

      await Cart.deleteOne({ userId: booking.userId }).session(session);

      finalizedBooking = booking;
      finalizeState = "confirmed";
    });
  } catch (error) {
    if (error?.code === 11000) {
      const cancelledBooking = await Booking.findOneAndUpdate(
        { razorpayOrderId, status: "pending" },
        { $set: { status: "cancelled" } },
        { new: true }
      );
      return { state: "conflict", booking: cancelledBooking };
    }
    throw error;
  } finally {
    await session.endSession();
  }

  return { state: finalizeState, booking: finalizedBooking };
}
/*
 * Razorpay sends webhooks for:
 * - payment.captured → Payment successful
 * - payment.failed → Payment failed
 * - order.paid → Order fully paid
 */

export const handleRazorpayWebhook = async (req, res) => {
  try {
    // Step 1: Verify webhook signature
    const webhookSignature = req.headers["x-razorpay-signature"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET; // Set this in .env

    console.log("Content-Type:", req.headers["content-type"]);
    console.log("Body type:", typeof req.body, Buffer.isBuffer(req.body));
    console.log("Signature header:", req.headers["x-razorpay-signature"]);
    console.log(
      "Webhook secret exists:",
      !!process.env.RAZORPAY_WEBHOOK_SECRET
    );

    if (!webhookSignature || !webhookSecret) {
      console.error("Missing webhook signature or secret");
      return res.status(400).json({ message: "Invalid webhook" });
    }

    // Create expected signature
    const body = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    // Compare signatures
    if (webhookSignature !== expectedSignature) {
      console.error("Webhook signature verification failed");
      return res.status(400).json({ message: "Invalid signature" });
    }

    // Step 2: Process webhook event
    const event = req.body.event;
    const payload = req.body.payload;

    console.log("Received webhook event:", event);

    switch (event) {
      case "payment.captured":
        await handlePaymentCaptured(payload);
        break;

      case "payment.failed":
        await handlePaymentFailed(payload);
        break;

      case "order.paid":
        await handleOrderPaid(payload);
        break;

      default:
        console.log("Unhandled webhook event:", event);
    }

    // Always return 200 to acknowledge receipt
    return res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    // Still return 200 to prevent Razorpay from retrying
    return res.status(200).json({ status: "error", message: error.message });
  }
};

async function handlePaymentCaptured(payload) {
  try {
    const payment = payload.payment.entity;
    const orderId = payment.order_id;
    const paymentId = payment.id;
    const amountPaid = payment.amount / 100; // Convert paise to rupees

    console.log("Payment captured:", paymentId, "for order:", orderId);
    console.log("Amount paid:", amountPaid);

    const result = await finalizeBookingAfterPayment({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      amountPaid,
    });

    if (result.state === "not_found") {
      console.error("Booking not found for order:", orderId);
      return;
    }

    if (result.state === "conflict") {
      console.warn("Booking conflict while confirming order:", orderId);
      return;
    }

    if (result.state === "invalid_state") {
      console.warn("Skipping confirm due to invalid booking state:", orderId);
      return;
    }

    if (result.state === "already_confirmed") {
      console.log("Booking already confirmed for order:", orderId);
      return;
    }

    const booking = result.booking;
    if (!booking) return;

    // Send confirmation emails
    await sendConfirmationMailToGuest(booking);
    await sendConfirmationMailToAdmin(booking);

    console.log("Confirmation emails sent for booking:", booking._id);
  } catch (error) {
    console.error("Error handling payment captured:", error);
  }
}

async function handlePaymentFailed(payload) {
  try {
    const payment = payload.payment.entity;
    const orderId = payment.order_id;
    const paymentId = payment.id;

    console.log("Payment failed:", paymentId, "for order:", orderId);

    // Find booking
    const booking = await Booking.findOne({ razorpayOrderId: orderId });

    if (!booking) {
      console.error("Booking not found for order:", orderId);
      return;
    }

    // Keep status as 'pending' - user can retry payment
    console.log("Payment failed for booking:", booking._id);

    await sendPaymentFailedMailToGuest(booking);
  } catch (error) {
    console.error("Error handling payment failed:", error);
  }
}

async function handleOrderPaid(payload) {
  try {
    const order = payload.order.entity;
    const orderId = order.id;

    console.log("Order paid:", orderId);

    const result = await finalizeBookingAfterPayment({
      razorpayOrderId: orderId,
      razorpayPaymentId: null,
      amountPaid: null,
    });
    if (result.state === "confirmed") {
      console.log("Booking confirmed via order.paid:", result.booking?._id);
    }
  } catch (error) {
    console.error("Error handling order paid:", error);
  }
}

/**
 * POST /api/payment/verify
 *
 * This is called from frontend after successful payment
 * to provide immediate feedback to user before webhook arrives
 */
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    // Verify signature
    const text = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    const result = await finalizeBookingAfterPayment({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amountPaid: null,
    });

    if (result.state === "not_found") {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (result.state === "conflict") {
      return res.status(409).json({
        success: false,
        message: "Room is no longer available for one or more selected dates",
      });
    }

    if (result.state === "invalid_state") {
      return res.status(400).json({
        success: false,
        message: "Booking is not in a payable state",
      });
    }

    const booking = result.booking;
    if (!booking) {
      return res.status(500).json({
        success: false,
        message: "Unable to finalize booking",
      });
    }

    //  await sendConfirmationMailToGuest(booking);
    // await sendConfirmationMailToAdmin(booking)

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      booking: {
        id: booking._id,
        status: booking.status,
      },
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
    });
  }
};
