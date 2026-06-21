import * as productService from '../../services/productService.js';

//show products page with filters,search,sort
export const getProductsPage = async (req,res)=>{
    try{
        const search = req.query.search || '';
        const category = req.query.category || '';
        const brand = req.query.brand || '';
        const sort = req.query.sort || 'newest';
        const page = parseInt(req.query.page) || 1;


        //get products with these filters
        const result = await productService.getProducts({
            search:search,
            category:category,
            brand:brand,
            sort:sort,
            page:page
        });

        const allCategories = await productService.getAllCategories();
        const allBrands = await productService.getAllBrands();

        res.render('user/products',{
            products:result.products,
            currentPage:result.currentPage,
            totalPages:result.totalPages,
            search:search,
            selectedCategory:category,
            selectedBrand:brand,
            selectedSort:sort,
            categories:allCategories,
            brands:allBrands
        });
    }catch(error){
        console.log('Error in getProductsPage:',error);
        res.status(500).render('error/500');
    }
};

//show single product detail page
export const getProductDetail = async (req,res)=>{
    try{
        const productId = req.params.id;

        const product = await productService.getProductById(productId);

        if (!product) {
            return res.redirect('/products');
        }

        res.render('user/product-detail',{
            product:product
        });
    }catch(error){
        console.log('Error in getProductDetail:',error);
        res.status(500).send('error/500');
    }
};