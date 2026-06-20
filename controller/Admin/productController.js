import Product from '../../model/Product.js';
import Variant from '../../model/Variant.js';
import Category from '../../model/Category.js';
import { processProductImages, deleteProductImages } from '../../utils/imageProcessor.js';

// Show admin products list page with variants
export const getAdminProductsPage = async (req, res) => {
    try {
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        // Build search filter
        const searchFilter = {
            isDeleted: false
        };

        if (search) {
            searchFilter.$or = [
                { productName: { $regex: search, $options: 'i' } }
            ];
        }

        // Get total count for pagination
        const totalProducts = await Product.countDocuments(searchFilter);
        const totalPages = Math.ceil(totalProducts / limit);

        // Get products with search, pagination, and sort by newest first
        const products = await Product.find(searchFilter)
            .populate('categoryId', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get variants for each product
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

// Show add product form
export const getAddProductPage = async (req, res) => {
    try {
        // Get all active categories for dropdown
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

// Add new product with variants
export const addProduct = async (req, res) => {
    try {
        const { productName, description, categoryId, status } = req.body;

        // Validate required fields
        if (!productName || !description || !categoryId) {
            return res.redirect('/admin/products/add?error=All required fields must be filled');
        }

        // Parse variants data from form
        const variantsData = [];
        let variantIndex = 0;
        
        // Extract variant data from req.body
        while (req.body[`variants[${variantIndex}][color]`]) {
            variantsData.push({
                color: req.body[`variants[${variantIndex}][color]`],
                quantity: req.body[`variants[${variantIndex}][quantity]`],
                regularPrice: req.body[`variants[${variantIndex}][regularPrice]`],
                salePrice: req.body[`variants[${variantIndex}][salePrice]`]
            });
            variantIndex++;
        }

        // Validate at least one variant
        if (variantsData.length === 0) {
            return res.redirect('/admin/products/add?error=Please add at least one variant');
        }

        // Create product
        const newProduct = new Product({
            productName: productName.trim(),
            description: description.trim(),
            categoryId: categoryId,
            status: status || 'ACTIVE'
        });

        await newProduct.save();

        // Process images and create variants
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

        // Create variants with images
        for (let i = 0; i < variantsData.length; i++) {
            const variantFiles = filesByVariant[i] || [];
            
            if (variantFiles.length < 3) {
                // Rollback: delete product if variant validation fails
                await Product.findByIdAndDelete(newProduct._id);
                return res.redirect('/admin/products/add?error=Each variant must have at least 3 images');
            }

            // Process images for this variant
            const processedImages = await processProductImages(variantFiles);

            // Create variant
            const newVariant = new Variant({
                productId: newProduct._id,
                color: variantsData[i].color.trim(),
                images: processedImages,
                quantity: parseInt(variantsData[i].quantity),
                regularPrice: parseFloat(variantsData[i].regularPrice),
                salePrice: parseFloat(variantsData[i].salePrice)
            });

            await newVariant.save();
        }

        res.redirect('/admin/products?success=Product added successfully');
    } catch (error) {
        console.log('Error in addProduct:', error);
        res.redirect('/admin/products/add?error=Error adding product');
    }
};

// Show edit product form
export const getEditProductPage = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findOne({ _id: productId, isDeleted: false })
            .populate('categoryId');

        if (!product) {
            return res.redirect('/admin/products');
        }

        // Get variants for this product
        const variants = await Variant.find({ productId: productId, isDeleted: false });

        // Get all active categories for dropdown
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

// Update existing product
export const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const { productName, description, categoryId, status } = req.body;

        // Validate required fields
        if (!productName || !description || !categoryId) {
            return res.redirect(`/admin/products/edit/${productId}?error=All required fields must be filled`);
        }

        const product = await Product.findOne({ _id: productId, isDeleted: false });
        if (!product) {
            return res.redirect('/admin/products?error=Product not found');
        }

        // Update product basic fields
        product.productName = productName.trim();
        product.description = description.trim();
        product.categoryId = categoryId;
        product.status = status || 'ACTIVE';

        await product.save();

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

        // Check if this is the last variant for the product
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

// Toggle product status (ACTIVE/INACTIVE)
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

// Soft delete product (and all its variants)
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

        // Soft delete product
        product.isDeleted = true;
        await product.save();

        // Soft delete all variants
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

// Add new variant to existing product
export const addVariant = async (req, res) => {
    try {
        const productId = req.params.id;
        const { color, quantity, regularPrice, salePrice } = req.body;

        // Validate product exists
        const product = await Product.findOne({ _id: productId, isDeleted: false });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Validate required fields
        if (!color || !quantity || !regularPrice || !salePrice) {
            return res.status(400).json({
                success: false,
                message: 'All variant fields are required'
            });
        }

        // Check if at least 3 images are uploaded
        if (!req.files || req.files.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Please upload at least 3 images for the variant'
            });
        }

        // Process images
        const processedImages = await processProductImages(req.files);

        // Create new variant
        const newVariant = new Variant({
            productId: productId,
            color: color.trim(),
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

// Add single image to existing variant
export const addImageToVariant = async (req, res) => {
    try {
        const variantId = req.params.id;
        
        // Validate variant exists
        const variant = await Variant.findOne({ _id: variantId, isDeleted: false });
        if (!variant) {
            return res.status(404).json({
                success: false,
                message: 'Variant not found'
            });
        }

        // Check if image file is uploaded
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please upload an image'
            });
        }

        // Process the single image
        const processedImages = await processProductImages([req.files[0]]);
        const imageUrl = processedImages[0];

        // Add image to the beginning of the array (first slide)
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

// Remove single image from variant
export const removeImageFromVariant = async (req, res) => {
    try {
        const variantId = req.params.id;
        const { imageUrl } = req.body;

        // Validate variant exists
        const variant = await Variant.findOne({ _id: variantId, isDeleted: false });
        if (!variant) {
            return res.status(404).json({
                success: false,
                message: 'Variant not found'
            });
        }

        // Check if variant has more than 3 images (minimum requirement)
        if (variant.images.length <= 3) {
            return res.status(400).json({
                success: false,
                message: 'Cannot remove image. Variant must have at least 3 images.'
            });
        }

        // Remove the image from the array
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
