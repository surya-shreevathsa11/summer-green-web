import { Gallery } from "../models/admin.gallery.model.js";

const MAX_IMAGES = 6;
const VALID_SECTIONS = ["allImages", "rooms", "exterior", "dining"];

// GET /api/admin/gallery
// Returns the whole gallery document
export const getGallery = async (req, res) => {
  try {
    // Only ever one gallery document — find or create it
    let gallery = await Gallery.findOne();
    if (!gallery) gallery = await Gallery.create({});
    return res.status(200).json({ data: gallery });
  } catch (error) {
    console.error("Error fetching gallery:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// POST /api/admin/gallery/add
// Body: { section: "rooms", url: "https://..." }
export const addGalleryImage = async (req, res) => {
  try {
    const { section, url } = req.body;

    if (!section || !url) {
      return res.status(400).json({ message: "section and url are required" });
    }
    if (!VALID_SECTIONS.includes(section)) {
      return res.status(400).json({
        message: `section must be one of: ${VALID_SECTIONS.join(", ")}`,
      });
    }

    let gallery = await Gallery.findOne();
    if (!gallery) gallery = await Gallery.create({});

    // Enforce limit before pushing
    if (gallery[section].length >= MAX_IMAGES) {
      return res.status(400).json({
        message: `Cannot add more than ${MAX_IMAGES} images to ${section}. Remove one first.`,
        current: gallery[section].length,
        max: MAX_IMAGES,
      });
    }

    // Prevent duplicate URLs in the same section
    if (gallery[section].includes(url)) {
      return res
        .status(409)
        .json({ message: "This image already exists in this section" });
    }

    gallery[section].push(url);
    await gallery.save();

    return res.status(200).json({
      message: "Image added",
      data: {
        section,
        images: gallery[section],
        count: gallery[section].length,
      },
    });
  } catch (error) {
    console.error("Error adding gallery image:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// DELETE /api/admin/gallery/remove
// Body: { section: "rooms", url: "https://..." }
export const removeGalleryImage = async (req, res) => {
  try {
    const { section, url } = req.body;

    if (!section || !url) {
      return res.status(400).json({ message: "section and url are required" });
    }
    if (!VALID_SECTIONS.includes(section)) {
      return res.status(400).json({
        message: `section must be one of: ${VALID_SECTIONS.join(", ")}`,
      });
    }

    const gallery = await Gallery.findOne();
    if (!gallery) return res.status(404).json({ message: "Gallery not found" });

    const index = gallery[section].indexOf(url);
    if (index === -1) {
      return res
        .status(404)
        .json({ message: "Image not found in this section" });
    }

    gallery[section].splice(index, 1);
    await gallery.save();

    return res.status(200).json({
      message: "Image removed",
      data: {
        section,
        images: gallery[section],
        count: gallery[section].length,
      },
    });
  } catch (error) {
    console.error("Error removing gallery image:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// PUT /api/admin/gallery/reorder
// Body: { section: "rooms", urls: ["url1", "url2", ...] }
// Lets admin drag-reorder images
export const reorderGalleryImages = async (req, res) => {
  try {
    const { section, urls } = req.body;

    if (!section || !Array.isArray(urls)) {
      return res
        .status(400)
        .json({ message: "section and urls array are required" });
    }
    if (!VALID_SECTIONS.includes(section)) {
      return res.status(400).json({ message: `Invalid section` });
    }

    const gallery = await Gallery.findOne();
    if (!gallery) return res.status(404).json({ message: "Gallery not found" });

    // Validate that incoming urls match existing ones (no new/missing)
    const existing = [...gallery[section]].sort();
    const incoming = [...urls].sort();
    if (JSON.stringify(existing) !== JSON.stringify(incoming)) {
      return res
        .status(400)
        .json({ message: "urls must contain the same images, just reordered" });
    }

    gallery[section] = urls;
    await gallery.save();

    return res.status(200).json({
      message: "Order updated",
      data: { section, images: gallery[section] },
    });
  } catch (error) {
    console.error("Error reordering gallery:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
