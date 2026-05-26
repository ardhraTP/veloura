import { sendResponse } from "../../utils/helpers.js";
import {
    validateAddressData,
    getUserAddresses,
    getAddressById,
    createAddress,
    updateAddress as updateAddressService,
    deleteAddress as deleteAddressService,
    setDefaultAddress as setDefaultAddressService
} from '../../services/addressService.js';

//show manage address page
export const getAddresses = async(req,res) =>{
    try{
        const userId = req.session.userId;
        const addresses = await getUserAddresses(userId);
        res.render('user/manage-addresses',{addresses, activeTab: 'addresses'});
    }catch(error){
        console.error('get addresses error:',error);
        res.redirect('/profile');
    }
};

//show add address page
export const getAddAddress = (req,res) =>{
    res.render('user/add-address',{error:null,success:null, activeTab: 'addresses'});
};

//add new address
export const addAddress = async (req,res)=>{
    try{
        const addressData = req.body;
        const userId = req.session.userId;


        //validate using service
        const validation = validateAddressData(addressData);
        if(!validation.isValid){
            return res.render('user/add-address',{
                error:validation.error,
                success:null,
                activeTab: 'addresses'
            });
        }

        //cerate address using service
        await createAddress(userId,addressData);
        res.redirect('/profile/addresses');
    }catch(error){
        console.error('Add address error:',error);
        res.render('user/add-address',{
            error:'Something went wrong.Please try again.',
            success:null,
            activeTab: 'addresses'
        });
    }
};

//show edit address page
export const getEditAddress = async(req,res) =>{
    try{
        const {id} = req.params;
        const userId = req.session.userId;

        const address = await getAddressById(id,userId);
        if(!address){
            return res.redirect('/profile/addresses');
        }

        res.render('user/edit-address',{address,error:null,success:null, activeTab: 'addresses'});
    }catch(error){
        console.error('Get edit address error:',error);
        res.redirect('/profile/addresses');
    }
};

//update address
export const updateAddress = async(req,res) =>{
    try{
        const {id} = req.params;
        const addressData = req.body;
        const userId = req.session.userId;

        //get existing address using service
        const existingAddresses = await getAddressById(id,userId);
        if(!existingAddresses){
            return res.redirect('/profile/addresses');
        }

        //validate using service
        const validation = validateAddressData(addressData);
        if(!validation.isValid){
            return res.render('user/edit-address',{
                address:existingAddresses,
                error:validation.error,
                success:null,
                activeTab: 'addresses'
            });
        }

        //update address using service
        await updateAddressService(id,addressData);
        res.redirect('/profile/addresses');
    }catch(error){
        console.error('Update address error:',error);
        const address = await getAddressById(req.params.id,req.session.userId);
        res.render('user/edit-address',{
            address,
            error:'Something went wrong.Please try again.',
            success:null,
            activeTab: 'addresses'
        });
    }
};

//delete address
export const deleteAddress = async(req,res) =>{
    try{
        const {id} = req.params;
        const userId = req.session.userId;

        const address = await getAddressById(id,userId);
        if(!address){
            return sendResponse(res,false,'Address not found');
        }
        await deleteAddressService(id);
        sendResponse(res,true,'Address deleted successfully');
    }catch(error){
        console.error('Delete address error:',error);
        sendResponse(res,false,'Failed to delete address');
    }
};

//set deafult address
export const setDefaultAddress = async(req,res)=>{
    try{
        const {id} = req.params;
        const userId = req.session.userId;

        //check if address exists and belongs to user
        const address = await getAddressById(id,userId);
        if(!address){
            return sendResponse(res,false,'Address not found');
        }

        //set default address using service
        await setDefaultAddressService(userId,id);
        sendResponse(res,true,'Default address updated');
    }catch(error){
        console.error('Set default address error:',error);
        sendResponse(res,false,'Failed to update default address');
    }
};

