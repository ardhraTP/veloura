import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Process and resize product images
export const processProductImages = async (files) => {
    const processedImages = [];

    try {
        for (const file of files) {
            const filename = 'product-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + '.jpg';
            const outputPath = path.join('public', 'uploads', 'products', filename);

            // Read the file into memory buffer to avoid locking the file descriptor on Windows
            const fileBuffer = fs.readFileSync(file.path);

            // Resize and crop image to 800x800 pixels
            await sharp(fileBuffer)
                .resize(800, 800, {
                    fit: 'cover', // Crop to exact dimensions
                    position: 'center'
                })
                .jpeg({
                    quality: 85, // Good quality compression
                    progressive: true
                })
                .toFile(outputPath);

            // Delete the temporary file
            fs.unlinkSync(file.path);

            // Store the relative path for database
            processedImages.push('/uploads/products/' + filename);
        }

        return processedImages;
    } catch (error) {
        console.error('Error processing images:', error);
        // Clean up any uploaded files in case of error
        for (const file of files) {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        }
        throw error;
    }
};

// Delete product images from filesystem
export const deleteProductImages = (imagePaths) => {
    try {
        for (const imagePath of imagePaths) {
            const fullPath = path.join('public', imagePath);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        }
    } catch (error) {
        console.error('Error deleting images:', error);
    }
};
