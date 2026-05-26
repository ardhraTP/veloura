import Address from '../model/address.js';

//validate address data
export const validateAddressData = (data) => {
    const { fullName, phone, pincode, address, city, state, addressType } = data;

    if (!fullName || fullName.trim().length < 2) {
        return { isValid: false, error: 'Full name must be at least 2 characters' };
    }

    if (!phone || !/^[0-9]{10}$/.test(phone.trim())) {
        return { isValid: false, error: 'Phone number must be exactly 10 digits' };
    }

    if (!pincode || !/^[0-9]{6}$/.test(pincode.trim())) {
        return { isValid: false, error: 'Pincode must be exactly 6 digits' };
    }

    if (!address || address.trim().length < 10) {
        return { isValid: false, error: 'Address must be at least 10 characters' };
    }
    
    if (!city || city.trim().length < 2) {
        return { isValid: false, error: 'City is required' };
    }
    
    if (!state || state.trim().length < 2) {
        return { isValid: false, error: 'State is required' };
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
