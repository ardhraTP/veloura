import Address from '../model/address.js';


import { isValidName, isValidPhone, isValidPincode, isValidCity, isValidState, isValidAddress } from '../utils/helpers.js';

//validate address data
export const validateAddressData = (data) => {
    const { fullName, phone, pincode, address, city, state, addressType } = data;

    if (!isValidName(fullName)) {
        return { isValid: false, error: 'Full name must be 2-50 characters and contain only letters' };
    }

    if (!isValidPhone(phone)) {
        return { isValid: false, error: 'Phone number must be exactly 10 digits' };
    }

    if (!isValidPincode(pincode)) {
        return { isValid: false, error: 'Pincode must be exactly 6 digits' };
    }

    if (!isValidAddress(address)) {
        return { isValid: false, error: 'Address must be 10-200 characters' };
    }
    
    if (!isValidCity(city)) {
        return { isValid: false, error: 'City must be 2-50 characters and contain only letters' };
    }
    
    if (!isValidState(state)) {
        return { isValid: false, error: 'State must be 2-50 characters and contain only letters' };
    }
    
    if (!addressType || !['home', 'work'].includes(addressType)) {
        return { isValid: false, error: 'Please select a valid address type' };
    }

    return { isValid: true };
};




//get all addresses for a user
export const getUserAddresses = async (userId) => {
    return await Address.find({ userId }).sort({ createdAt: -1 });
}

//get address by ID and user ID
export const getAddressById = async (addressId, userId) => {
    return await Address.findOne({ _id: addressId, userId });
}

//create new address
export const createAddress = async (userId, addressData) => {
    const { fullName, phone, pincode, address, city, state, addressType } = addressData;

    //check if this is the first address(make it default)
    const existingAddresses = await Address.find({ userId });
    const isFirstAddress = existingAddresses.length === 0;

    const newAddress = new Address({
        userId,
        fullName: fullName.trim(),
        phone: phone.trim(),
        pincode: pincode.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        addressType,
        isDefault: isFirstAddress
    });
    return await newAddress.save();
};

//update address
export const updateAddress = async (addressId, addressData) => {
    const { fullName, phone, pincode, address, city, state, addressType } = addressData;

    return await Address.findByIdAndUpdate(
        addressId,
        {
            fullName: fullName.trim(),
            phone: phone.trim(),
            pincode: pincode.trim(),
            address: address.trim(),
            city: city.trim(),
            state: state.trim(),
            addressType,
        },
        { new: true }
);
};

//delete address
export const deleteAddress = async(addressId) =>{
    return await Address.findByIdAndDelete(addressId);
};

//set default address
export const setDefaultAddress = async(userId,addressId) =>{
    //remove default from all other addresses
    await Address.updateMany({userId},{isDefault:false});

    //set this address as default
   return await Address.findByIdAndUpdate(addressId,{isDefault:true});
};

//get default address
export const getDefaultAddress =  async(userId) =>{
    return await Address.findOne({userId,isDefault:true});
}
