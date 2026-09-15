// ============================================================
// Supabase Storage & Image Processing Helper (WebP + 5MB limit)
// ============================================================

require('dotenv').config();
const multer = require('multer');
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env!');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// Multer in-memory storage (max 5MB file size limit)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 Megabytes
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung. Harap upload file gambar!'), false);
    }
  },
});

/**
 * Convert an image buffer to .webp and upload to a Supabase Storage bucket.
 * 
 * @param {Buffer} fileBuffer - Original file buffer from multer (req.file.buffer)
 * @param {string} bucketName - Target bucket name ('foto_produk' or 'foto_profile')
 * @param {string} prefix - Filename prefix, e.g. 'product' or 'profile'
 * @returns {Promise<string>} Public URL of the uploaded .webp image
 */
async function uploadImageToSupabase(fileBuffer, bucketName, prefix = 'img') {
  // Convert image buffer to WebP format with 85% quality
  const webpBuffer = await sharp(fileBuffer)
    .webp({ quality: 85 })
    .toBuffer();

  const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.webp`;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, webpBuffer, {
      contentType: 'image/webp',
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error(`❌ Error uploading to bucket ${bucketName}:`, error);
    throw new Error(`Gagal mengunggah gambar ke Supabase Storage: ${error.message}`);
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}

module.exports = {
  supabase,
  upload,
  uploadImageToSupabase,
};
