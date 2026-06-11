import User from '../model/User.js';

export const findAdminByEmail = async (email) => {
    return await User.findOne({ email: email, isAdmin: true });
};


export const findAdminById = async (adminId) => {
    return await User.findById(adminId);
};


export const getUsersWithPagination = async (query, page, limit) => {
    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);

    const users = await User.find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 });

    return {
        users,
        totalUsers,
        totalPages
    };
};


export const buildUserQuery = (search, status) => {
    let query = {
        isAdmin: { $ne: true }
    };

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }

    if (status && status !== 'all') {
        query.isBlocked = status === 'blocked';
    }

    return query;
};


export const toggleUserBlockStatus = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        return null;
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    return user;
};


export const findUserById = async (userId) => {
    return await User.findById(userId);
};
