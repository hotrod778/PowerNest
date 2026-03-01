const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');

const VALID_ROLES = ['SELLER', 'BUYER', 'INVESTOR'];

const normalizeRole = (value) => {
  const role = String(value || '').toUpperCase();
  return VALID_ROLES.includes(role) ? role : null;
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role, is_admin: Boolean(user.is_admin) },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const buildUserResponse = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  wallet_balance: user.wallet_balance,
  phone: user.phone,
  location: user.location,
  is_admin: user.is_admin,
  is_verified: user.is_verified,
  is_suspended: user.is_suspended,
});

const createUserWithRole = async ({ name, email, password, role, phone, location }) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return {
      error: {
        status: 400,
        body: {
          error: 'Registration failed',
          message: 'User with this email already exists',
        },
      },
    };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      location,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      wallet_balance: true,
      phone: true,
      location: true,
      is_admin: true,
      is_verified: true,
      is_suspended: true,
      created_at: true,
    },
  });

  return { user };
};

const register = async (req, res) => {
  try {
    const { name, email, password, role, phone, location } = req.body;
    const normalizedRole = normalizeRole(role);

    if (!normalizedRole) {
      return res.status(400).json({
        error: 'Registration failed',
        message: 'Invalid role provided',
      });
    }

    const { user, error } = await createUserWithRole({
      name,
      email,
      password,
      role: normalizedRole,
      phone,
      location,
    });

    if (error) {
      return res.status(error.status).json(error.body);
    }

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      error: 'Registration failed',
      message: 'Internal server error',
    });
  }
};

const registerByRole = async (req, res) => {
  try {
    const roleFromPath = normalizeRole(req.params.role);

    if (!roleFromPath) {
      return res.status(400).json({
        error: 'Registration failed',
        message: 'Invalid role route',
      });
    }

    const { name, email, password, phone, location } = req.body;

    const { user, error } = await createUserWithRole({
      name,
      email,
      password,
      role: roleFromPath,
      phone,
      location,
    });

    if (error) {
      return res.status(error.status).json(error.body);
    }

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error('Registration by role error:', error);
    return res.status(500).json({
      error: 'Registration failed',
      message: 'Internal server error',
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({
        error: 'Login failed',
        message: 'Invalid email or password',
      });
    }

    if (user.is_suspended) {
      return res.status(403).json({
        error: 'Login failed',
        message: 'Your account is suspended. Please contact support.',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Login failed',
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'Login failed',
      message: 'Internal server error',
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        wallet_balance: true,
        phone: true,
        location: true,
        is_admin: true,
        is_verified: true,
        is_suspended: true,
        created_at: true,
      },
    });

    return res.json({ user });
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({
      error: 'Failed to get profile',
      message: 'Internal server error',
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone, location } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(location && { location }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        wallet_balance: true,
        phone: true,
        location: true,
        is_admin: true,
        is_verified: true,
        is_suspended: true,
        updated_at: true,
      },
    });

    return res.json({
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      error: 'Failed to update profile',
      message: 'Internal server error',
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { password: true },
    });

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Password change failed',
        message: 'Current password is incorrect',
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedNewPassword },
    });

    return res.json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      error: 'Failed to change password',
      message: 'Internal server error',
    });
  }
};

module.exports = {
  register,
  registerByRole,
  login,
  validateSession: async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          wallet_balance: true,
          phone: true,
          location: true,
          is_admin: true,
          is_verified: true,
          is_suspended: true,
        },
      });

      return res.json({
        success: true,
        message: 'Session is valid',
        user: buildUserResponse(user || req.user),
      });
    } catch (error) {
      return res.status(500).json({
        error: 'Session validation failed',
        message: 'Internal server error',
      });
    }
  },
  logout: async (req, res) => {
    return res.json({
      success: true,
      message: 'Logged out successfully',
    });
  },
  getProfile,
  updateProfile,
  changePassword,
};
