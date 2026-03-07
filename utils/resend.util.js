import { Resend } from "resend";

//todo -- handle errorsj

export const sendConfirmationMailToGuest = async (userInfo) => {
  try {
    return "ok";
  } catch (error) {
    console.log("error sending confirmation mail", error);
    return res.status(500).json({ message: "error sending confirmation mail" });
  }
};

export const sendConfirmationMailToAdmin = async () => {
  try {
    return "ok";
  } catch (error) {
    console.log("error sending confirmation mail", error);
    return res.status(500).json({ message: "error sending confirmation mail" });
  }
};

export const sendPaymentFailedMailToGuest = async (booking) => {
  try {
    return "ok";
  } catch (error) {
    try {
      return "ok";
    } catch (error) {
      console.log("error sending confirmation mail", error);
      return res
        .status(500)
        .json({ message: "error sending confirmation mail" });
    }
  }
};
