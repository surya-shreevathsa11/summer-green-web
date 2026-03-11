export const rooms = {
  R1: {
    id: "01",
    name: "Sunflower",
    description: "A spacious air-conditioned room for up to 2 guests, with complimentary breakfast included.",
    price: 3500,
    capacity: {
      adults: 2,
      children: 1,
    },
  },

  R2: {
    id: "02",
    name: "Lily",
    description: "A spacious air-conditioned room for up to 3 guests, with complimentary breakfast included.",
    price: 2500,
    capacity: {
      adults: 3,
      children: 1,
    },
  },

  R3: {
    id: "03",
    name: "Marigold",
    description: "A spacious 2BHK accommodation for up to 7 guests, featuring comfortable living areas, a private dining space, and a refrigerator.",
    price: 6500,
    capacity: {
      adults: 5, // max adults when children > 0
      children: 2,
    },
    adultsOnly: 7, // when 0 children: up to 7 adults; when children > 0: up to 5 adults + 2 children
  },

  R4: {
    id: "04",
    name: "Lavender",
    description: "A spacious 2BHK accommodation for up to 7 guests, featuring comfortable living areas, a private dining space, and a refrigerator.",
    price: 5000,
    capacity: {
      adults: 5, // max adults when children > 0
      children: 2,
    },
    adultsOnly: 7, // when 0 children: up to 7 adults; when children > 0: up to 5 adults + 2 children
  },

  R5: {
    id: "05",
    name: "Dahlia",
    description:
      "A cozy budget room designed for up to 2 guests, offering a comfortable and affordable stay.",
    price: 1250,
    capacity: {
      adults: 2, //or chlidren 1
      children: 0,
    },
  },

  R6: {
    id: "06",
    name: "Gardenia",
    description:
      "A cozy budget room designed for up to 2 guests, offering a comfortable and affordable stay.",
    price: 1250,
    capacity: {
      adults: 2,
      children: 0,
    },
  },

  R7: {
    id: "07",
    name: "Petunia",
    description:
      "A cozy budget room designed for up to 2 guests, offering a comfortable and affordable stay.",
    price: 1250,
    capacity: {
      adults: 2,
      children: 0,
    },
  },

  R8: {
    id: "08",
    name: "Zinnia",
    description:
      "A cozy budget room designed for up to 2 guests, offering a comfortable and affordable stay.",
    price: 1250,
    capacity: {
      adults: 2,
      children: 0,
    },
  },
};
