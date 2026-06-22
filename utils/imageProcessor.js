import sharp from 'sharp';
import fs from 'fs';
import path from 'path';


export const processProductImages = async (files) => {
    const processedImages = [];

    try {
        for (const file of files) {
            const filename = 'product-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + '.jpg';
            const outputPath = path.join('public', 'uploads', 'products', filename);

            const fileBuffer = fs.readFileSync(file.path);

            await sharp(fileBuffer)
                .resize(800, 800, {
                    fit: 'cover', 
                    position: 'center'
                })
                .jpeg({
                    quality: 85,
                    progressive: true
                })
                .toFile(outputPath);

            fs.unlinkSync(file.path);

            processedImages.push('/uploads/products/' + filename);
        }

        return processedImages;
    } catch (error) {
        console.error('Error processing images:', error);
        for (const file of files) {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        }
        throw error;
    }
};

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
