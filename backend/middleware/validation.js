const Joi = require('joi');

// Validation schemas
const schemas = {
  // Auth schemas
  register: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('SELLER', 'BUYER', 'INVESTOR').required(),
    phone: Joi.string().optional(),
    location: Joi.string().optional()
  }),

  registerByRole: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().optional(),
    location: Joi.string().optional()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    phone: Joi.string().optional(),
    location: Joi.string().optional()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required()
  }),

  // Energy listing schemas
  createListing: Joi.object({
    energy_type: Joi.string().valid('SOLAR', 'WIND', 'BIOGAS', 'HYDRO', 'GEOTHERMAL').required(),
    capacity_kwh: Joi.number().positive().required(),
    price_per_kwh: Joi.number().positive().required(),
    location: Joi.string().required(),
    available_units: Joi.number().positive().required(),
    description: Joi.string().optional()
  }),

  updateListing: Joi.object({
    energy_type: Joi.string().valid('SOLAR', 'WIND', 'BIOGAS', 'HYDRO', 'GEOTHERMAL').optional(),
    capacity_kwh: Joi.number().positive().optional(),
    price_per_kwh: Joi.number().positive().optional(),
    location: Joi.string().optional(),
    available_units: Joi.number().positive().optional(),
    description: Joi.string().optional(),
    is_active: Joi.boolean().optional()
  }),

  // Transaction schemas
  purchaseEnergy: Joi.object({
    listing_id: Joi.string().required(),
    energy_units: Joi.number().positive().required()
  }),

  updateOrderStatus: Joi.object({
    status: Joi.string().valid('COMPLETED', 'CANCELLED', 'REFUNDED').required()
  }),

  // Project schemas
  createProject: Joi.object({
    project_name: Joi.string().min(3).max(200).required(),
    description: Joi.string().required(),
    total_required: Joi.number().positive().required(),
    roi_percentage: Joi.number().positive().max(100).required(),
    duration_months: Joi.number().positive().required(),
    risk_level: Joi.string().valid('LOW', 'MEDIUM', 'HIGH').required(),
    location: Joi.string().required(),
    energy_type: Joi.string().valid('SOLAR', 'WIND', 'BIOGAS', 'HYDRO', 'GEOTHERMAL').required()
  }),

  // Investment schemas
  investProject: Joi.object({
    project_id: Joi.string().required(),
    amount_invested: Joi.number().positive().required()
  }),

  walletAmount: Joi.object({
    amount: Joi.number().positive().required()
  }),

  createWithdrawalRequest: Joi.object({
    amount: Joi.number().positive().required(),
    note: Joi.string().max(500).optional().allow('')
  }),

  reviewWithdrawalRequest: Joi.object({
    action: Joi.string().valid('APPROVE', 'REJECT', 'MARK_PAID').required(),
    review_reason: Joi.string().max(500).optional().allow('')
  }),

  createDispute: Joi.object({
    transaction_id: Joi.string().required(),
    reason: Joi.string().max(200).required(),
    description: Joi.string().max(1000).optional().allow('')
  }),

  resolveDispute: Joi.object({
    status: Joi.string().valid('UNDER_REVIEW', 'RESOLVED', 'REJECTED').required(),
    resolution_notes: Joi.string().max(1000).optional().allow('')
  }),

  updateCommissionSettings: Joi.object({
    commission_rate: Joi.number().min(0).max(0.5).optional(),
    investment_fee_rate: Joi.number().min(0).max(0.5).optional(),
    withdrawal_fee_rate: Joi.number().min(0).max(0.5).optional()
  }).or('commission_rate', 'investment_fee_rate', 'withdrawal_fee_rate'),

  // Rating schemas
  createRating: Joi.object({
    target_id: Joi.string().required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().optional()
  })
};

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    next();
  };
};

module.exports = {
  validate,
  schemas
};
