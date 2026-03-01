const { prisma } = require('../config/database');
const {
  roundCurrency,
  creditWallet,
  calculateWithdrawalFee,
  generateReceiptCode,
} = require('../services/walletService');

// Create energy listing
const createListing = async (req, res) => {
  try {
    const { energy_type, capacity_kwh, price_per_kwh, location, available_units, description } = req.body;

    const listing = await prisma.energyListing.create({
      data: {
        seller_id: req.user.id,
        energy_type,
        capacity_kwh,
        price_per_kwh,
        location,
        available_units,
        description,
        is_approved: false,
        approved_by: null,
        approved_at: null,
      },
      include: {
        seller: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Energy listing created successfully and is pending admin approval',
      listing
    });
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({
      error: 'Failed to create listing',
      message: 'Internal server error'
    });
  }
};

// Get seller's listings
const myListings = async (req, res) => {
  try {
    const listings = await prisma.energyListing.findMany({
      where: {
        seller_id: req.user.id
      },
      include: {
        _count: {
          select: {
            transactions: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    res.json({
      listings
    });
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({
      error: 'Failed to get listings',
      message: 'Internal server error'
    });
  }
};

// Update listing
const updateListing = async (req, res) => {
  try {
    const { id } = req.params;
    const allowedKeys = [
      'energy_type',
      'capacity_kwh',
      'price_per_kwh',
      'location',
      'available_units',
      'description',
      'is_active',
    ];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowedKeys.includes(key))
    );

    // Verify listing belongs to seller
    const existingListing = await prisma.energyListing.findFirst({
      where: {
        id,
        seller_id: req.user.id
      }
    });

    if (!existingListing) {
      return res.status(404).json({
        error: 'Listing not found',
        message: 'You can only update your own listings'
      });
    }

    const requiresReapproval = Boolean(
      updates.energy_type ||
      updates.capacity_kwh ||
      updates.price_per_kwh ||
      updates.location ||
      updates.available_units
    );

    const listing = await prisma.energyListing.update({
      where: { id },
      data: {
        ...updates,
        ...(requiresReapproval
          ? { is_approved: false, approved_by: null, approved_at: null }
          : {}),
      },
      include: {
        seller: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      message: requiresReapproval
        ? 'Listing updated and moved to pending approval'
        : 'Listing updated successfully',
      listing
    });
  } catch (error) {
    console.error('Update listing error:', error);
    res.status(500).json({
      error: 'Failed to update listing',
      message: 'Internal server error'
    });
  }
};

// Delete listing
const deleteListing = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify listing belongs to seller
    const existingListing = await prisma.energyListing.findFirst({
      where: {
        id,
        seller_id: req.user.id
      }
    });

    if (!existingListing) {
      return res.status(404).json({
        error: 'Listing not found',
        message: 'You can only delete your own listings'
      });
    }

    await prisma.energyListing.delete({
      where: { id }
    });

    res.json({
      message: 'Listing deleted successfully'
    });
  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({
      error: 'Failed to delete listing',
      message: 'Internal server error'
    });
  }
};

// Get seller's orders
const getOrders = async (req, res) => {
  try {
    const orders = await prisma.transaction.findMany({
      where: {
        seller_id: req.user.id
      },
      include: {
        buyer: {
          select: {
            name: true,
            email: true
          }
        },
        listing: {
          select: {
            energy_type: true,
            location: true,
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    res.json({
      orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      error: 'Failed to get orders',
      message: 'Internal server error'
    });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const nextStatus = String(req.body.status || '').toUpperCase();
    const allowedStatuses = ['COMPLETED', 'CANCELLED', 'REFUNDED'];

    if (!allowedStatuses.includes(nextStatus)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: `Status must be one of: ${allowedStatuses.join(', ')}`,
      });
    }

    // Verify order belongs to seller
    const existingOrder = await prisma.transaction.findFirst({
      where: {
        id,
        seller_id: req.user.id
      },
      include: {
        listing: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!existingOrder) {
      return res.status(404).json({
        error: 'Order not found',
        message: 'You can only update your own orders'
      });
    }

    if (existingOrder.status !== 'PENDING') {
      return res.status(400).json({
        error: 'Invalid transition',
        message: `Order is already ${existingOrder.status} and cannot be updated`,
      });
    }

    const order = await prisma.$transaction(async (tx) => {
      const energyCost = Number(existingOrder.total_price);
      const commissionRate = Number(existingOrder.commission || 0.03);
      const commissionAmount = roundCurrency(energyCost * commissionRate);
      const totalHeld = roundCurrency(energyCost + commissionAmount);

      if (nextStatus === 'COMPLETED') {
        const sellerPayout = roundCurrency(energyCost - commissionAmount);
        await creditWallet(tx, {
          userId: existingOrder.seller_id,
          amount: sellerPayout,
          category: 'SALE',
          referenceId: existingOrder.id,
          referenceType: 'TRANSACTION',
          description: `Escrow release for order ${existingOrder.id}`,
        });
      } else {
        await creditWallet(tx, {
          userId: existingOrder.buyer_id,
          amount: totalHeld,
          category: 'ESCROW_REFUND',
          referenceId: existingOrder.id,
          referenceType: 'TRANSACTION',
          description: `Escrow refund for order ${existingOrder.id}`,
        });

        await tx.energyListing.update({
          where: { id: existingOrder.listing_id },
          data: {
            available_units: {
              increment: existingOrder.energy_units,
            },
            is_active: true,
          },
        });
      }

      await tx.transaction.update({
        where: { id },
        data: {
          status: nextStatus,
          escrow_status: nextStatus === 'COMPLETED' ? 'RELEASED' : 'REFUNDED',
          receipt_code: existingOrder.receipt_code || generateReceiptCode('ORD'),
          ...(nextStatus === 'COMPLETED' ? { completed_at: new Date() } : {}),
        },
      });

      return tx.transaction.findUnique({
        where: { id },
        include: {
          buyer: {
            select: {
              name: true,
              email: true,
            },
          },
          listing: true,
        },
      });
    });

    res.json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      error: 'Failed to update order status',
      message: 'Internal server error'
    });
  }
};

// Get seller dashboard data
const getDashboard = async (req, res) => {
  try {
    const sellerId = req.user.id;

    // Get total energy generated and sold
    const listings = await prisma.energyListing.findMany({
      where: { seller_id: sellerId },
      include: {
        transactions: {
          where: { status: 'COMPLETED' }
        }
      }
    });

    const totalCapacity = listings.reduce((sum, listing) => sum + Number(listing.capacity_kwh), 0);
    const totalEnergySold = listings.reduce((sum, listing) => 
      sum + listing.transactions.reduce((transSum, trans) => transSum + Number(trans.energy_units), 0), 0);

    // Get total revenue
    const completedTransactions = await prisma.transaction.findMany({
      where: {
        seller_id: sellerId,
        status: 'COMPLETED'
      }
    });

    const totalRevenue = completedTransactions.reduce((sum, trans) => 
      sum + Number(trans.total_price) * (1 - Number(trans.commission)), 0);

    // Get monthly sales data for chart
    const monthlySales = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        SUM(energy_units) as total_energy,
        SUM(total_price) as total_revenue
      FROM transactions 
      WHERE seller_id = ${sellerId} AND status = 'COMPLETED'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
      LIMIT 12
    `;

    res.json({
      dashboard: {
        totalEnergyGenerated: totalCapacity,
        totalEnergySold,
        totalRevenue,
        activeListings: listings.filter(l => l.is_active).length,
        completedOrders: completedTransactions.length,
        monthlySales: monthlySales.reverse()
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      error: 'Failed to get dashboard data',
      message: 'Internal server error'
    });
  }
};

// Create project
const createProject = async (req, res) => {
  try {
    const { project_name, description, total_required, roi_percentage, duration_months, risk_level, location, energy_type } = req.body;

    const project = await prisma.project.create({
      data: {
        seller_id: req.user.id,
        project_name,
        description,
        total_required,
        roi_percentage,
        duration_months,
        risk_level,
        location,
        energy_type,
        is_approved: false,
        approved_by: null,
        approved_at: null,
      },
      include: {
        seller: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Project created successfully and is pending admin approval',
      project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      error: 'Failed to create project',
      message: 'Internal server error'
    });
  }
};

// Get seller's projects
const getProjects = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        seller_id: req.user.id
      },
      include: {
        _count: {
          select: {
            investments: true
          }
        },
        investments: {
          include: {
            investor: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    res.json({
      projects
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      error: 'Failed to get projects',
      message: 'Internal server error'
    });
  }
};

const createWithdrawRequest = async (req, res) => {
  try {
    const requestedAmount = Number(req.body.amount);
    const note = req.body.note || null;

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Withdrawal amount must be greater than 0',
      });
    }

    const request = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: req.user.id },
        select: { wallet_balance: true },
      });

      if (!user || Number(user.wallet_balance) < requestedAmount) {
        throw new Error('INSUFFICIENT_WALLET_BALANCE');
      }

      const fee = await calculateWithdrawalFee(tx, requestedAmount);
      const netAmount = roundCurrency(requestedAmount - fee);

      if (netAmount <= 0) {
        throw new Error('INVALID_NET_WITHDRAWAL');
      }

      return tx.withdrawalRequest.create({
        data: {
          user_id: req.user.id,
          amount: roundCurrency(requestedAmount),
          fee,
          net_amount: netAmount,
          note,
        },
      });
    });

    return res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted and pending admin review',
      request,
    });
  } catch (error) {
    if (error.message === 'INSUFFICIENT_WALLET_BALANCE') {
      return res.status(400).json({
        error: 'Withdrawal failed',
        message: 'Insufficient wallet balance',
      });
    }

    if (error.message === 'INVALID_NET_WITHDRAWAL') {
      return res.status(400).json({
        error: 'Withdrawal failed',
        message: 'Requested amount is too low after fees',
      });
    }

    console.error('Create withdraw request error:', error);
    return res.status(500).json({
      error: 'Failed to submit withdrawal request',
      message: 'Internal server error',
    });
  }
};

const getWithdrawRequests = async (req, res) => {
  try {
    const requests = await prisma.withdrawalRequest.findMany({
      where: { user_id: req.user.id },
      orderBy: { created_at: 'desc' },
    });

    return res.json({ requests });
  } catch (error) {
    console.error('Get withdraw requests error:', error);
    return res.status(500).json({
      error: 'Failed to get withdrawal requests',
      message: 'Internal server error',
    });
  }
};

module.exports = {
  createListing,
  myListings,
  updateListing,
  deleteListing,
  getOrders,
  updateOrderStatus,
  getDashboard,
  createProject,
  getProjects,
  createWithdrawRequest,
  getWithdrawRequests,
};
