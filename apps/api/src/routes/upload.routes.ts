import { Router } from 'express';
import { authenticate, requireSeller, requireAdmin } from '@/middleware/auth.js';
import multer from 'multer';
import sharp from 'sharp';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { env } from '@/config/env.js';
import { prisma } from '@/lib/prisma.js';

const router = Router();

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// Ensure upload directories exist
const uploadsDir = path.join(process.cwd(), 'uploads');
const imagesDir = path.join(uploadsDir, 'images');
const filesDir = path.join(uploadsDir, 'files');
const videosDir = path.join(uploadsDir, 'videos');

async function ensureDirectories() {
  await fs.mkdir(imagesDir, { recursive: true });
  await fs.mkdir(filesDir, { recursive: true });
  await fs.mkdir(videosDir, { recursive: true });
}
ensureDirectories();

// Upload image
router.post('/image', authenticate, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No file uploaded' },
      });
    }

    const filename = `${crypto.randomBytes(16).toString('hex')}.webp`;
    const filepath = path.join(imagesDir, filename);

    // Process with Sharp
    await sharp(req.file.buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(filepath);

    // Generate thumbnail
    const thumbFilename = `thumb_${filename}`;
    const thumbPath = path.join(imagesDir, thumbFilename);
    await sharp(req.file.buffer)
      .resize(300, 300, { fit: 'cover' })
      .webp({ quality: 80 })
      .toFile(thumbPath);

    const baseUrl = env.UPLOADS_URL || `${env.API_URL}/uploads`;
    
    res.json({
      success: true,
      data: {
        url: `${baseUrl}/images/${filename}`,
        thumbnail: `${baseUrl}/images/${thumbFilename}`,
        filename,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Upload avatar
router.post('/avatar', authenticate, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No file uploaded' },
      });
    }

    const filename = `avatar_${req.user!.id}_${Date.now()}.webp`;
    const filepath = path.join(imagesDir, filename);

    await sharp(req.file.buffer)
      .resize(200, 200, { fit: 'cover' })
      .webp({ quality: 90 })
      .toFile(filepath);

    const baseUrl = env.UPLOADS_URL || `${env.API_URL}/uploads`;
    const avatarUrl = `${baseUrl}/images/${filename}`;

    // Update user avatar
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { avatar: avatarUrl },
    });

    res.json({
      success: true,
      data: { url: avatarUrl },
    });
  } catch (error) {
    next(error);
  }
});

// Upload file (deliverables)
router.post('/file', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No file uploaded' },
      });
    }

    const ext = path.extname(req.file.originalname);
    const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const filepath = path.join(filesDir, filename);

    await fs.writeFile(filepath, req.file.buffer);

    const baseUrl = env.UPLOADS_URL || `${env.API_URL}/uploads`;
    
    res.json({
      success: true,
      data: {
        url: `${baseUrl}/files/${filename}`,
        filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Upload multiple images
router.post('/images', authenticate, upload.array('images', 10), async (req, res, next) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILES', message: 'No files uploaded' },
      });
    }

    const baseUrl = env.UPLOADS_URL || `${env.API_URL}/uploads`;
    const results = [];

    for (const file of files) {
      const filename = `${crypto.randomBytes(16).toString('hex')}.webp`;
      const filepath = path.join(imagesDir, filename);

      await sharp(file.buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(filepath);

      results.push({
        url: `${baseUrl}/images/${filename}`,
        filename,
        originalName: file.originalname,
      });
    }

    res.json({
      success: true,
      data: { images: results },
    });
  } catch (error) {
    next(error);
  }
});

// Upload video (for courses)
const videoUpload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid video type. Supported: MP4, WebM, MOV, AVI'));
    }
  },
});

router.post('/video', authenticate, videoUpload.single('video'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No video file uploaded' },
      });
    }

    const ext = path.extname(req.file.originalname) || '.mp4';
    const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const filepath = path.join(videosDir, filename);

    await fs.writeFile(filepath, req.file.buffer);

    const baseUrl = env.UPLOADS_URL || `${env.API_URL}/uploads`;

    res.json({
      success: true,
      data: {
        url: `${baseUrl}/videos/${filename}`,
        filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
