import { Room } from "../models/pricing.model.js";
import { rooms } from "./room.js";


const PROPERTY_ID= "69f1e82fa067f7407401feaa"
export const addInitalPrices = async () => {
  try {
    const roomEntryExists = await Room.findOne({
      propertyId: PROPERTY_ID,
    });

    if (!roomEntryExists) {
      await Room.insertMany(
        Object.entries(rooms).map(([roomId, room]) => ({
          propertyId: PROPERTY_ID, // ✅ THIS WAS MISSING
          roomId,
          name: room.name,
          type: room.type,
          description: room.description,
          pricePerNight: room.pricePerNight,
          capacity: room.capacity,
        })),
      );

      console.log("Base Prices added");
    } else {
      console.log("Base Prices already exist");
    }
  } catch (error) {
    console.log("Error adding base price");
    console.log(error.message);
  }
};

