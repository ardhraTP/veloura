import Category from '../../model/Category.js';

export const getCategoriesPage = async (req,res)=>{
    try{
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;


        const searchFilter = {
            isDeleted:false
        };

        if(search){
            searchFilter.name = {$regex:search,$options:'i'};
        }

        const totalCategories = await Category.countDocuments(searchFilter);
        const totalPages = Math.ceil(totalCategories / limit);
        
        const categories = await Category.find(searchFilter)
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit);

        res.render('admin/categories',{
            categories:categories,
            currentPage:page,
            totalPages:totalPages,
            search:search,
            successMessage:req.query.success || null,
            errorMessage:req.query.error || null
        });
    }catch(error){
        console.log('Error in getCategoriesPage:',error);
        res.status(500).send('error/500');
    }
};


//add new category
export const addCategory = async (req,res)=>{
    try{
        const {name,offer,description} = req.body;


        //check if name is provided
        const existingCategory = await Category.findOne({
            name:{$regex:new RegExp('^' + name.trim() + '$','i')},
            isDeleted:false
        });

        if(existingCategory){
            return res.redirect('/admin/categories?error=Category already exists');
        }

        //create new category
        const newCategory = new Category({
            name:name.trim(),
            offer:offer ? offer.trim() : '',
            description:description ? description.trim() : '',
            isListed:true
        });

        await newCategory.save();

        res.redirect('/admin/categories?success=Category added successfully');
    }catch(error){
        console.log('Error in addCategory:',error);
        res.redirect('/admin/categories?error=Error adding category');
    }
};


//edit category
export const editCategory = async (req,res)=>{
    try{
        const categoryId = req.params.id;
        const {name,offer,description} = req.body;

        // Validate name (safety net — client-side JS also handles this)
        if (!name || name.trim() === '') {
            return res.redirect('/admin/categories?error=Category+name+is+required');
        }

        //check if another category with same name exists
        const existingCategory = await Category.findOne({
            _id:{$ne:categoryId},
            name:{$regex: new RegExp('^' + name.trim() + '$','i')},
            isDeleted:false
        });

        if(existingCategory){
            return res.redirect('/admin/categories?error=Category name already exists');
        }

        //update category
        await Category.findByIdAndUpdate(categoryId,{
            name:name.trim(),
            offer:offer ? offer.trim() : '',
            description:description ? description.trim() : ''
        });

        res.redirect('/admin/categories?success=Category updated successfully');
    }catch(error){
        console.log('Error in editCategory:',error);
        res.redirect('/admin/categories?error=Error updating category');
    }
};

//list/unlist status
export const toggleListCategory = async (req,res)=>{
    try{
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);

        if(!category || category.isDeleted){
            return res.status(404).json({
                success:false,
                message:'Category not found'
            });
        }


        category.isListed = !category.isListed;
        await category.save();

        res.json({
            success:true,
            isListed:category.isListed,
            message:category.isListed ? 'Category listed successfully' : 'Category unlisted successfully'
        });
    }catch(error){
        console.log('Error in toggleListCategory:',error);
        res.status(500).json({
            success:false,
            message:'Error updating category status'
        });
    }
};


//delete category
export const deleteCategory = async(req,res)=>{
    try{
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);

        if(!category || category.isDeleted){
            return res.status(404).json({
                success:false,
                message:'Category not found'
            });
        }

    
        category.isDeleted = true;
        await category.save();

        res.json({
            success:true,
            message:'Category deleted successfully'
        });
    }catch(error){
        console.log('Error in deleteCategory:',error);
        res.status(500).json({
            success:false,
            message:'Error deleting category'
        });
    }
};