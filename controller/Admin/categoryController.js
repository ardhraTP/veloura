import Category from '../../model/Category.js';

export const getCategoriesPage = async (req, res) => {
    try {
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;


        const searchFilter = {
            isDeleted: false
        };

        if (search) {
            searchFilter.name = { $regex: search, $options: 'i' };
        }

        const totalCategories = await Category.countDocuments(searchFilter);
        const totalPages = Math.ceil(totalCategories / limit);

        const categories = await Category.find(searchFilter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.render('admin/categories', {
            categories: categories,
            currentPage: page,
            totalPages: totalPages,
            search: search,
            successMessage: req.query.success || null,
            errorMessage: req.query.error || null
        });
    } catch (error) {
        console.log('Error in getCategoriesPage:', error);
        res.status(500).send('error/500');
    }
};


const validateCategoryNameBackend = (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return 'Category name is required.';
    if (trimmed.length < 2) return 'Category name must be at least 2 characters long.';
    if (trimmed.length > 50) return 'Category name cannot exceed 50 characters.';
    if (/^[0-9]+$/.test(trimmed)) return 'Category name cannot contain only numbers.';
    if (!/[a-zA-Z]/.test(trimmed)) return 'Category name must contain at least one letter.';
    if (!/^[a-zA-Z0-9\s&\-]+$/.test(trimmed)) return 'Category name can only contain letters, numbers, spaces, and hyphens.';
    return null;
};

const validateCategoryOfferBackend = (offer) => {
    const trimmed = (offer || '').trim();
    if (!trimmed) return null;
    if (/[a-zA-Z]/.test(trimmed)) return 'Offer percentage cannot contain alphabets.';
    const cleanStr = trimmed.replace('%', '').trim();
    if (isNaN(cleanStr) || cleanStr === '' || !/^\d+(\.\d+)?$/.test(cleanStr)) {
        return 'Offer percentage must be a valid number.';
    }
    const offerVal = Number(cleanStr);
    if (offerVal < 1 || offerVal > 100) {
        return 'Offer percentage must be between 1 and 100.';
    }
    return null;
};

//add new category
export const addCategory = async (req, res) => {
    try {
        const { name, offer, description } = req.body;

        const nameError = validateCategoryNameBackend(name);
        if (nameError) {
            return res.redirect('/admin/categories?error=' + encodeURIComponent(nameError));
        }

        const offerError = validateCategoryOfferBackend(offer);
        if (offerError) {
            return res.redirect('/admin/categories?error=' + encodeURIComponent(offerError));
        }

        const trimmedName = name.trim();

        //check if name is provided
        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp('^' + trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
            isDeleted: false
        });

        if (existingCategory) {
            return res.redirect('/admin/categories?error=Category already exists');
        }

        const offerStr = offer ? offer.trim() : '';
        const cleanStr = offerStr.replace('%', '').trim();
        const parsedDiscount = parseFloat(cleanStr) || 0;

        //create new category
        const newCategory = new Category({
            name: trimmedName,
            offer: offerStr,
            categoryDiscount: Math.min(100, Math.max(0, parsedDiscount)),
            description: description ? description.trim() : '',
            isListed: true
        });

        await newCategory.save();

        res.redirect('/admin/categories?success=Category added successfully');
    } catch (error) {
        console.log('Error in addCategory:', error);
        res.redirect('/admin/categories?error=Error adding category');
    }
};


//edit category
export const editCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { name, offer, description } = req.body;

        const nameError = validateCategoryNameBackend(name);
        if (nameError) {
            return res.redirect('/admin/categories?error=' + encodeURIComponent(nameError));
        }

        const offerError = validateCategoryOfferBackend(offer);
        if (offerError) {
            return res.redirect('/admin/categories?error=' + encodeURIComponent(offerError));
        }

        const trimmedName = name.trim();

        //check if another category with same name exists
        const existingCategory = await Category.findOne({
            _id: { $ne: categoryId },
            name: { $regex: new RegExp('^' + trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
            isDeleted: false
        });

        if (existingCategory) {
            return res.redirect('/admin/categories?error=Category name already exists');
        }

        const offerStr = offer ? offer.trim() : '';
        const cleanStr = offerStr.replace('%', '').trim();
        const parsedDiscount = parseFloat(cleanStr) || 0;
        const categoryDiscountVal = Math.min(100, Math.max(0, parsedDiscount));

        const updateData = {
            name: trimmedName,
            offer: offerStr,
            categoryDiscount: categoryDiscountVal,
            description: description ? description.trim() : ''
        };

        if (categoryDiscountVal === 0 || !offerStr) {
            updateData.categoryOfferExpiry = null;
        }

        //update category
        await Category.findByIdAndUpdate(categoryId, updateData);

        res.redirect('/admin/categories?success=Category updated successfully');
    } catch (error) {
        console.log('Error in editCategory:', error);
        res.redirect('/admin/categories?error=Error updating category');
    }
};

//list/unlist status
export const toggleListCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);

        if (!category || category.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }


        category.isListed = !category.isListed;
        await category.save();

        res.json({
            success: true,
            isListed: category.isListed,
            message: category.isListed ? 'Category listed successfully' : 'Category unlisted successfully'
        });
    } catch (error) {
        console.log('Error in toggleListCategory:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating category status'
        });
    }
};


//delete category
export const deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);

        if (!category || category.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }


        category.isDeleted = true;
        await category.save();

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.log('Error in deleteCategory:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting category'
        });
    }
};