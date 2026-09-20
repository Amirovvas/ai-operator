import multer, { diskStorage } from "multer";
import path from "path";
export const storage = diskStorage({
  destination(req, file, cb) {
    cb(null, "src/uploads");
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
}); 
