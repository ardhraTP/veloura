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



// manage address page
export const getAddresses = async (req, res) => {
    try {
        const userId = req.session.userId;
        const addresses = await getUserAddresses(userId);
        res.render('user/manage-addresses', { addresses,activeTab: 'addresses' });
    } catch (error) {
        console.error('get addresses error:', error);
        res.redirect('/profile');
    }
};


export const getAddAddress = (req, res) => {
    res.render('user/add-address', { error: null, success: null, activeTab: 'addresses' });
};



//add new address
export const addAddress = async (req, res) => {
    try {
        const addressData = req.body;
        const userId = req.session.userId;


        const validation = validateAddressData(addressData);
        if (!validation.isValid) {
            return res.render('user/add-address', {
                error: validation.error,
                success: null,
                activeTab: 'addresses'
            });
        }

        await createAddress(userId, addressData);
        res.redirect('/profile/addresses');
    } catch (error) {
        console.error('Add address error:', error);
        res.render('user/add-address', {
            error: 'Something went wrong.Please try again.',
            success: null,
            activeTab: 'addresses'
        });
    }
};


export const getEditAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.userId;

        const address = await getAddressById(id, userId);
        if (!address) {
            return res.redirect('/profile/addresses');
        }

        res.render('user/edit-address', { address, error: null, success: null, activeTab: 'addresses' });
    } catch (error) {
        console.error('Get edit address error:', error);
        res.redirect('/profile/addresses');
    }
};


export const updateAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const addressData = req.body;
        const userId = req.session.userId;

        const existingAddresses = await getAddressById(id, userId);
        if (!existingAddresses) {
            return res.redirect('/profile/addresses');
        }

        const validation = validateAddressData(addressData);
        if (!validation.isValid) {
            return res.render('user/edit-address', {
                address: existingAddresses,
                error: validation.error,
                success: null,
                activeTab: 'addresses'
            });
        }

        await updateAddressService(id, addressData);
        res.redirect('/profile/addresses');
    } catch (error) {
        console.error('Update address error:', error);
        const address = await getAddressById(req.params.id, req.session.userId);
        res.render('user/edit-address', {
            address,
            error: 'Something went wrong.Please try again.',
            success: null,
            activeTab: 'addresses'
        });
    }
};


export const deleteAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.userId;

        const address = await getAddressById(id, userId);
        if (!address) {
            return sendResponse(res, false, 'Address not found');
        }

        const wasDefault = address.isDefault;
        
        // Delete the address
        await deleteAddressService(id);

       
        if (wasDefault) {
            const remainingAddresses = await getUserAddresses(userId);
            if (remainingAddresses.length > 0) {
                
                await setDefaultAddressService(userId, remainingAddresses[0]._id);
            }
        }

        sendResponse(res, true, 'Address deleted successfully');
    } catch (error) {
        console.error('Delete address error:', error);
        sendResponse(res, false, 'Failed to delete address');
    }
};

//set deafult address
export const setDefaultAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.userId;

        const address = await getAddressById(id, userId);
        if (!address) {
            return sendResponse(res, false, 'Address not found');
        }

        await setDefaultAddressService(userId, id);
        sendResponse(res, true, 'Default address updated');
    } catch (error) {
        console.error('Set default address error:', error);
        sendResponse(res, false, 'Failed to update default address');
    }
};

