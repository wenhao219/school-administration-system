import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";

const uploadDir = path.join(
  os.tmpdir(),
  "school-administration-system-uploads"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: diskStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

export default upload;
