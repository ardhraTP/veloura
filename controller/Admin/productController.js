import Product from '../../model/Product.js';
import Variant from '../../model/Variant.js';
import Category from '../../model/Category.js';
import { processProductImages, deleteProductImages } from '../../utils/imageProcessor.js';
import fs from 'fs';
import { syncCartQuantitiesForVariant } from '../../services/cartService.js';

const cleanupUploadedFiles = (files) => {
    if (files && files.length > 0) {
        files.forEach(file => {
            try {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            } catch (err) {
                console.error('Error deleting temp file:', err);
            }
        });
    }
};

// Show admin products list page with variants
export const getAdminProductsPage = async (req, res) => {
    try {
       
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        const search = req.query.search || '';
       const page = parseInt(req.query.page) || 1;
        const limit = 10; 
        const skip = (page - 1) * limit;

       
        const searchFilter = {
            isDeleted: false
        };

        if (search) {
            searchFilter.$or = [
                { productName: { $regex: search, $options: 'i' } }
            ];
        }

   
        const totalProducts = await Product.countDocuments({isDeleted:false});
        const totalPages = Math.ceil(totalProducts / limit);

        const products = await Product.find(searchFilter)
            .populate('categoryId', 'name')
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit);

        const productsWithVariants = await Promise.all(
            products.map(async (product) => {
                const variants = await Variant.find({ 
                    productId: product._id, 
                    isDeleted: false 
                });
                return {
                    ...product.toObject(),
                    variants: variants
                };
            })
        );

        res.render('admin/products', {
            products: productsWithVariants,
            currentPage: page,
            totalPages: totalPages,
            search: search
        });
    } catch (error) {
        console.log('Error in getAdminProductsPage:', error);
        res.status(500).render('error/500');
    }
};


export const getAddProductPage = async (req, res) => {
    try {
     
        const categories = await Category.find({ isDeleted: false, isListed: true }).sort({ name: 1 });
        
        res.render('admin/add-product', {
            categories: categories,
            errorMessage: req.query.error || null
        });
    } catch (error) {
        console.log('Error in getAddProductPage:', error);
        res.status(500).render('error/500');
    }
};

export const addProduct = async (req, res) => {
    try {
        const { productName, brand, description, categoryId, status } = req.body;

       
        if (!productName || !brand || !description || !categoryId) {
            cleanupUploadedFiles(req.files);
            return res.redirect('/admin/products/add?error=All required fields must be filled');
        }

        const variantsRaw = req.body.variants || {};
        const variantsData = [];

        const variantIndices = Object.keys(variantsRaw).map(Number).sort((a, b) => a - b);

        for (const idx of variantIndices) {
            const v = variantsRaw[idx];
            if (v && v.color) {
                variantsData.push({
                    color: v.color,
                    hexCode: v.hexCode || '',
                    quantity: v.quantity,
                    regularPrice: v.regularPrice,
                    salePrice: v.salePrice,
                    index: idx
                });
            }
        }

        if (variantsData.length === 0) {
            cleanupUploadedFiles(req.files);
            return res.redirect('/admin/products/add?error=Please add at least one variant');
        }

        const newProduct = new Product({
            productName: productName.trim(),
            brand: brand.trim(),
            description: description.trim(),
            categoryId: categoryId,
            status: status || 'ACTIVE'
        });

        await newProduct.save();

        const files = req.files || [];
        
        // Group files by variant index
        const filesByVariant = {};
        files.forEach(file => {
            const match = file.fieldname.match(/variants\[(\d+)\]\[images\]/);
            if (match) {
                const index = match[1];
                if (!filesByVariant[index]) {
                    filesByVariant[index] = [];
                }
                filesByVariant[index].push(file);
            }
        });

        for (let i = 0; i < variantsData.length; i++) {
            const originalIndex = variantsData[i].index;
            const variantFiles = filesByVariant[originalIndex] || [];
            
            if (variantFiles.length < 3) {
                cleanupUploadedFiles(req.files);
                await Product.findByIdAndDelete(newProduct._id);
                return res.redirect('/admin/products/add?error=Each variant must have at least 3 images');
            }

            const processedImages = await processProductImages(variantFiles);

            let hexCode = (variantsData[i].hexCode || '').trim().toUpperCase();
            if (hexCode && !hexCode.startsWith('#')) hexCode = '#' + hexCode;

            const newVariant = new Variant({
                productId: newProduct._id,
                color: variantsData[i].color.trim(),
                hexCode: hexCode,
                images: processedImages,
                quantity: parseInt(variantsData[i].quantity),
                regularPrice: parseFloat(variantsData[i].regularPrice),
                salePrice: parseFloat(variantsData[i].salePrice)
            });

            await newVariant.save();
        }

        res.redirect('/admin/products?success=Product added successfully');
    } catch (error) {
        console.error('Error in addProduct:', error.message);
        console.error('Stack:', error.stack);
        res.redirect('/admin/products/add?error=' + encodeURIComponent(error.message || 'Error adding product'));
    }
};

export const getEditProductPage = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findOne({ _id: productId, isDeleted: false })
            .populate('categoryId');

        if (!product) {
            return res.redirect('/admin/products');
        }

        const variants = await Variant.find({ productId: productId, isDeleted: false });

        const categories = await Category.find({ isDeleted: false, isListed: true }).sort({ name: 1 });

        res.render('admin/edit-product', {
            product: product,
            variants: variants,
            categories: categories,
            errorMessage: req.query.error || null
        });
    } catch (error) {
        console.log('Error in getEditProductPage:', error);
        res.status(500).render('error/500');
    }
};

export const updateProductDetails = async (req, res) => {
    try {
        const productId = req.params.id;
        const { productName, brand, description, categoryId, status } = req.body;

        if (!productName || !brand || !description || !categoryId) {
            return res.json({ success: false, message: 'All required fields must be filled.' });
        }

        const updatedProduct = await Product.findOneAndUpdate(
            { _id: productId, isDeleted: false },
            {
                $set: {
                    productName: productName.trim(),
                    brand: brand.trim(),
                    description: description.trim(),
                    categoryId: categoryId,
                    status: status || 'ACTIVE'
                }
            },
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            return res.json({ success: false, message: 'Product not found.' });
        }

        res.json({ success: true, message: 'Product details updated successfully.', product: updatedProduct });
    } catch (error) {
        console.log('Error in updateProductDetails:', error);
        res.json({ success: false, message: error.message || 'Error updating product details.' });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const { productName, brand, description, categoryId, status } = req.body;

        if (!productName || !brand || !description || !categoryId) {
            return res.redirect(`/admin/products/edit/${productId}?error=All required fields must be filled`);
        }

        const updatedProduct = await Product.findOneAndUpdate(
            { _id: productId, isDeleted: false },
            {
                $set: {
                    productName: productName.trim(),
                    brand: brand.trim(),
                    description: description.trim(),
                    categoryId: categoryId,
                    status: status || 'ACTIVE'
                }
            },
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            return res.redirect('/admin/products?error=Product not found');
        }

        const variantsRaw = req.body.variants || {};
        for (const key of Object.keys(variantsRaw)) {
            const v = variantsRaw[key];
            if (v && v._id) {
                const updateFields = {};
                if (v.color !== undefined)        updateFields.color        = v.color.trim();
                if (v.quantity !== undefined)     updateFields.quantity     = parseInt(v.quantity) || 0;
                if (v.regularPrice !== undefined) updateFields.regularPrice = parseFloat(v.regularPrice) || 0;
                if (v.salePrice !== undefined)    updateFields.salePrice    = parseFloat(v.salePrice) || 0;
                if (v.hexCode !== undefined) {
                    let normalizedHex = v.hexCode.trim().toUpperCase();
                    if (normalizedHex && !normalizedHex.startsWith('#')) normalizedHex = '#' + normalizedHex;
                    updateFields.hexCode = normalizedHex;
                }
                if (Object.keys(updateFields).length > 0) {
                    await Variant.findOneAndUpdate(
                        { _id: v._id, isDeleted: false },
                        { $set: updateFields },
                        { new: true }
                    );
                    if (updateFields.quantity !== undefined) {
                        await syncCartQuantitiesForVariant(v._id, updateFields.quantity);
                    }
                }
            }
        }

        res.redirect('/admin/products?success=Product updated successfully');
    } catch (error) {
        console.log('Error in updateProduct:', error);
        res.redirect(`/admin/products/edit/${req.params.id}?error=Error updating product`);
    }
};

// Delete variant
export const deleteVariant = async (req, res) => {
    try {
        const variantId = req.params.id;
        const variant = await Variant.findOne({ _id: variantId, isDeleted: false });

        if (!variant) {
            return res.status(404).json({
                success: false,
                message: 'Variant not found'
            });
        }

        const variantCount = await Variant.countDocuments({
            productId: variant.productId,
            isDeleted: false
        });

        if (variantCount <= 1) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete the last variant. Product must have at least one variant.'
            });
        }

        // Soft delete
        variant.isDeleted = true;
        await variant.save();

        res.json({
            success: true,
            message: 'Variant deleted successfully'
        });
    } catch (error) {
        console.log('Error in deleteVariant:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting variant'
        });
    }
};

export const toggleProductStatus = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findOne({ _id: productId, isDeleted: false });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        product.status = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        await product.save();

        res.json({
            success: true,
            status: product.status,
            message: `Product ${product.status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`
        });
    } catch (error) {
        console.log('Error in toggleProductStatus:', error);
        res.status(500).json({
            success: false,
            message: 'Error toggling product status'
        });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findOne({ _id: productId, isDeleted: false });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        product.isDeleted = true;
        await product.save();

        await Variant.updateMany(
            { productId: productId },
            { isDeleted: true }
        );

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.log('Error in deleteProduct:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting product'
        });
    }
};

export const addVariant = async (req, res) => {
    try {
        const productId = req.params.id;
        const { color, hexCode, quantity, regularPrice, salePrice } = req.body;

        const product = await Product.findOne({ _id: productId, isDeleted: false });
        if (!product) {
            cleanupUploadedFiles(req.files);
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        if (!color || !quantity || !regularPrice || !salePrice) {
            cleanupUploadedFiles(req.files);
            return res.status(400).json({
                success: false,
                message: 'All variant fields are required'
            });
        }

        if (!req.files || req.files.length < 3) {
            cleanupUploadedFiles(req.files);
            return res.status(400).json({
                success: false,
                message: 'Please upload at least 3 images for the variant'
            });
        }

        const processedImages = await processProductImages(req.files);

        let normalizedHex = (hexCode || '').trim().toUpperCase();
        if (normalizedHex && !normalizedHex.startsWith('#')) normalizedHex = '#' + normalizedHex;

        const newVariant = new Variant({
            productId: productId,
            color: color.trim(),
            hexCode: normalizedHex,
            images: processedImages,
            quantity: parseInt(quantity),
            regularPrice: parseFloat(regularPrice),
            salePrice: parseFloat(salePrice)
        });

        await newVariant.save();

        res.json({
            success: true,
            message: 'Variant added successfully',
            variant: newVariant
        });
    } catch (error) {
        console.log('Error in addVariant:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding variant'
        });
    }
};

export const addImageToVariant = async (req, res) => {
    try {
        const variantId = req.params.id;
        
        const variant = await Variant.findOne({ _id: variantId, isDeleted: false });
        if (!variant) {
            cleanupUploadedFiles(req.files);
            return res.status(404).json({
                success: false,
                message: 'Variant not found'
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please upload an image'
            });
        }

        const processedImages = await processProductImages([req.files[0]]);
        const imageUrl = processedImages[0];

        variant.images.unshift(imageUrl);
        await variant.save();

        res.json({
            success: true,
            message: 'Image added successfully',
            imageUrl: imageUrl
        });
    } catch (error) {
        console.log('Error in addImageToVariant:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding image'
        });
    }
};

export const removeImageFromVariant = async (req, res) => {
    try {
        const variantId = req.params.id;
        const { imageUrl } = req.body;

        const variant = await Variant.findOne({ _id: variantId, isDeleted: false });
        if (!variant) {
            return res.status(404).json({
                success: false,
                message: 'Variant not found'
            });
        }

        if (variant.images.length <= 3) {
            return res.status(400).json({
                success: false,
                message: 'Cannot remove image. Variant must have at least 3 images.'
            });
        }

        const imageIndex = variant.images.indexOf(imageUrl);
        if (imageIndex > -1) {
            variant.images.splice(imageIndex, 1);
            await variant.save();

            res.json({
                success: true,
                message: 'Image removed successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Image not found in variant'
            });
        }
    } catch (error) {
        console.log('Error in removeImageFromVariant:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing image'
        });
    }
};

// Update existing variant details
export const updateVariantDetails = async (req, res) => {
    try {
        const variantId = req.params.id;
        const { color, hexCode, quantity, regularPrice, salePrice } = req.body;

        const variant = await Variant.findOne({ _id: variantId, isDeleted: false });
        if (!variant) {
            return res.status(404).json({
                success: false,
                message: 'Variant not found'
            });
        }

        if (color !== undefined) variant.color = color.trim();
        if (quantity !== undefined) variant.quantity = parseInt(quantity) || 0;
        if (regularPrice !== undefined) variant.regularPrice = parseFloat(regularPrice) || 0;
        if (salePrice !== undefined) variant.salePrice = parseFloat(salePrice) || 0;
        
        if (hexCode !== undefined) {
            let normalizedHex = hexCode.trim().toUpperCase();
            if (normalizedHex && !normalizedHex.startsWith('#')) normalizedHex = '#' + normalizedHex;
            variant.hexCode = normalizedHex;
        }

        await variant.save();

        if (quantity !== undefined) {
            await syncCartQuantitiesForVariant(variantId, variant.quantity);
        }

        res.json({
            success: true,
            message: 'Variant updated successfully',
            variant: variant
        });
    } catch (error) {
        console.log('Error in updateVariantDetails:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error updating variant'
        });
    }
};

