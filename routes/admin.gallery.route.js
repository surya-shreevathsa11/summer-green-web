import { Router } from "express";
import { verifyJWT } from "../middleware/admin.middleware.js";

const router = Router();

import {
  getGallery,
  addGalleryImage,
  removeGalleryImage,
  reorderGalleryImages,
} from "../controllers/admin.gallery.controller";

router.get("/gallery", verifyJWT, getGallery);
router.post("/gallery/add", verifyJWT, addGalleryImage);
router.delete("/gallery/remove", verifyJWT, removeGalleryImage);
router.put("/gallery/reorder", verifyJWT, reorderGalleryImages);

export default router;
