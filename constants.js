module.exports = {
  TOTAL_ROOMS: 8,
  ROOMS: [
    { id: 1, name: 'Camera Oliva', description: 'Warm tones with olive wood accents', price: 120 },
    { id: 2, name: 'Camera Limone', description: 'Sun-drenched citrus palette', price: 135 },
    { id: 3, name: 'Camera Salvia', description: 'Earthy sage and linen textures', price: 110 },
    { id: 4, name: 'Camera Terracotta', description: 'Rich clay and rustic warmth', price: 145 },
    { id: 5, name: 'Camera Lavanda', description: 'Soft lavender and white stone', price: 130 },
    { id: 6, name: 'Camera Cipresso', description: 'Deep greens with cypress views', price: 140 },
    { id: 7, name: 'Camera Vigneto', description: 'Vineyard-facing with wood beams', price: 155 },
    { id: 8, name: 'Camera Tramonto', description: 'West-facing sunset panorama', price: 160 }
  ],
  SESSION_CONFIG: {
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
  }
};
