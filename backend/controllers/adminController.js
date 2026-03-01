const { prisma } = require('../config/database');
const {
  toNumber,
  roundCurrency,
  getPlatformSettings,
  debitWallet,
} = require('../services/walletService');

const parsePagination = (query, defaultLimit = 20) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const getAnalytics = async (req, res) => {
  try {
    const [settings, users, listings, transactions, investments, projects, fullyFundedResult] =
      await Promise.all([
        getPlatformSettings(prisma),
        prisma.user.findMany({
          select: {
            id: true,
            role: true,
            is_verified: true,
            is_suspended: true,
            created_at: true,
          },
        }),
        prisma.energyListing.findMany({
          select: {
            id: true,
            energy_type: true,
            capacity_kwh: true,
            is_active: true,
            is_approved: true,
          },
        }),
        prisma.transaction.findMany({
          select: {
            id: true,
            status: true,
            energy_units: true,
            total_price: true,
            commission: true,
            created_at: true,
          },
        }),
        prisma.investment.findMany({
          select: {
            id: true,
            amount_invested: true,
            returns_generated: true,
            service_fee: true,
          },
        }),
        prisma.project.findMany({
          select: {
            id: true,
            is_active: true,
            is_approved: true,
            current_funding: true,
            total_required: true,
            created_at: true,
          },
        }),
        prisma.$queryRaw`
          SELECT COUNT(*)::int AS count
          FROM projects
          WHERE current_funding >= total_required
        `,
      ]);

    const totalUsers = users.length;
    const sellers = users.filter((user) => user.role === 'SELLER').length;
    const buyers = users.filter((user) => user.role === 'BUYER').length;
    const investors = users.filter((user) => user.role === 'INVESTOR').length;

    const totalListings = listings.length;
    const activeListings = listings.filter((listing) => listing.is_active).length;
    const approvedListings = listings.filter((listing) => listing.is_approved).length;

    const totalTransactions = transactions.length;
    const completedTransactions = transactions.filter((transaction) => transaction.status === 'COMPLETED');
    const pendingTransactions = transactions.filter((transaction) => transaction.status === 'PENDING').length;

    const totalEnergyTraded = completedTransactions.reduce(
      (sum, transaction) => sum + toNumber(transaction.energy_units),
      0
    );
    const totalTransactionValue = completedTransactions.reduce(
      (sum, transaction) => sum + toNumber(transaction.total_price),
      0
    );
    const platformRevenue = completedTransactions.reduce(
      (sum, transaction) =>
        sum + toNumber(transaction.total_price) * toNumber(transaction.commission || settings.commission_rate),
      0
    );
    const totalCarbonSaved = totalEnergyTraded * 0.4;

    const totalProjects = projects.length;
    const activeProjects = projects.filter((project) => project.is_active).length;
    const approvedProjects = projects.filter((project) => project.is_approved).length;
    const fullyFundedProjects = Number(fullyFundedResult?.[0]?.count || 0);

    const totalInvested = investments.reduce((sum, investment) => sum + toNumber(investment.amount_invested), 0);
    const totalReturns = investments.reduce((sum, investment) => sum + toNumber(investment.returns_generated), 0);
    const investmentFees = investments.reduce(
      (sum, investment) => sum + toNumber(investment.amount_invested) * toNumber(investment.service_fee || 0),
      0
    );

    const [monthlyUsers, monthlyTransactions, topSellers, topInvestors] = await Promise.all([
      prisma.$queryRaw`
        SELECT
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as count,
          COUNT(CASE WHEN role = 'SELLER' THEN 1 END) as sellers,
          COUNT(CASE WHEN role = 'BUYER' THEN 1 END) as buyers,
          COUNT(CASE WHEN role = 'INVESTOR' THEN 1 END) as investors
        FROM users
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
        LIMIT 12
      `,
      prisma.$queryRaw`
        SELECT
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as count,
          SUM(energy_units) as total_energy,
          SUM(total_price) as total_value
        FROM transactions
        WHERE status = 'COMPLETED'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
        LIMIT 12
      `,
      prisma.$queryRaw`
        SELECT
          u.name,
          u.email,
          COUNT(t.id) as transaction_count,
          SUM(t.total_price) as total_revenue,
          SUM(t.energy_units) as total_energy_sold
        FROM users u
        JOIN transactions t ON u.id = t.seller_id
        WHERE t.status = 'COMPLETED'
        GROUP BY u.id, u.name, u.email
        ORDER BY total_revenue DESC
        LIMIT 10
      `,
      prisma.$queryRaw`
        SELECT
          u.name,
          u.email,
          COUNT(i.id) as investment_count,
          SUM(i.amount_invested) as total_invested,
          SUM(i.returns_generated) as total_returns
        FROM users u
        JOIN investments i ON u.id = i.investor_id
        GROUP BY u.id, u.name, u.email
        ORDER BY total_invested DESC
        LIMIT 10
      `,
    ]);

    return res.json({
      analytics: {
        users: {
          total: totalUsers,
          sellers,
          buyers,
          investors,
          verifiedSellers: users.filter((user) => user.role === 'SELLER' && user.is_verified).length,
          suspendedUsers: users.filter((user) => user.is_suspended).length,
          monthlyGrowth: [...monthlyUsers].reverse(),
        },
        listings: {
          total: totalListings,
          active: activeListings,
          approved: approvedListings,
        },
        transactions: {
          total: totalTransactions,
          completed: completedTransactions.length,
          pending: pendingTransactions,
          totalEnergyTraded: roundCurrency(totalEnergyTraded),
          totalValue: roundCurrency(totalTransactionValue),
          platformRevenue: roundCurrency(platformRevenue),
          totalCarbonSaved: roundCurrency(totalCarbonSaved),
          monthlyVolume: [...monthlyTransactions].reverse(),
        },
        projects: {
          total: totalProjects,
          active: activeProjects,
          approved: approvedProjects,
          fullyFunded: fullyFundedProjects,
        },
        investments: {
          totalInvested: roundCurrency(totalInvested),
          totalReturns: roundCurrency(totalReturns),
          investmentFees: roundCurrency(investmentFees),
        },
        leaderboards: {
          topSellers,
          topInvestors,
        },
        commissionRates: {
          energy: toNumber(settings.commission_rate),
          investment: toNumber(settings.investment_fee_rate),
          withdrawal: toNumber(settings.withdrawal_fee_rate),
        },
      },
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    return res.status(500).json({
      error: 'Failed to get analytics',
      message: 'Internal server error',
    });
  }
};

const getUsers = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, 20);
    const { role, search, suspended, verified } = req.query;
    const where = {};

    if (role) {
      const normalizedRole = String(role).toUpperCase();
      if (normalizedRole === 'ADMIN') {
        where.is_admin = true;
      } else {
        where.role = normalizedRole;
      }
    }

    if (suspended === 'true') {
      where.is_suspended = true;
    }

    if (verified === 'true') {
      where.is_verified = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          wallet_balance: true,
          phone: true,
          location: true,
          is_verified: true,
          is_suspended: true,
          is_admin: true,
          created_at: true,
          _count: {
            select: {
              energyListings: true,
              purchases: true,
              sales: true,
              investments: true,
              projects: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({
      error: 'Failed to get users',
      message: 'Internal server error',
    });
  }
};

const setUserSuspension = async (req, res) => {
  try {
    const userId = req.params.id;
    const suspended = req.body.suspended !== false;

    if (userId === req.user.id) {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'You cannot suspend your own admin account',
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { is_admin: true },
    });

    if (targetUser?.is_admin && suspended) {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Admin accounts cannot be suspended from this endpoint',
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { is_suspended: suspended },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_suspended: true,
      },
    });

    return res.json({
      success: true,
      message: suspended ? 'User suspended successfully' : 'User unsuspended successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Set user suspension error:', error);
    return res.status(500).json({
      error: 'Failed to update user suspension',
      message: 'Internal server error',
    });
  }
};

const approveSeller = async (req, res) => {
  try {
    const existing = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { role: true },
    });

    if (!existing || existing.role !== 'SELLER') {
      return res.status(400).json({
        error: 'Approval failed',
        message: 'Only seller accounts can be approved with this endpoint',
      });
    }

    const seller = await prisma.user.update({
      where: { id: req.params.id },
      data: { is_verified: true, is_suspended: false },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_verified: true,
      },
    });

    return res.json({
      success: true,
      message: 'Seller approved successfully',
      seller,
    });
  } catch (error) {
    console.error('Approve seller error:', error);
    return res.status(500).json({
      error: 'Failed to approve seller',
      message: 'Internal server error',
    });
  }
};

const approveListing = async (req, res) => {
  try {
    const listing = await prisma.energyListing.update({
      where: { id: req.params.id },
      data: {
        is_approved: true,
        approved_by: req.user.id,
        approved_at: new Date(),
      },
      include: {
        seller: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return res.json({
      success: true,
      message: 'Listing approved successfully',
      listing,
    });
  } catch (error) {
    console.error('Approve listing error:', error);
    return res.status(500).json({
      error: 'Failed to approve listing',
      message: 'Internal server error',
    });
  }
};

const approveProject = async (req, res) => {
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        is_approved: true,
        approved_by: req.user.id,
        approved_at: new Date(),
      },
      include: {
        seller: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return res.json({
      success: true,
      message: 'Project approved successfully',
      project,
    });
  } catch (error) {
    console.error('Approve project error:', error);
    return res.status(500).json({
      error: 'Failed to approve project',
      message: 'Internal server error',
    });
  }
};

const getPendingApprovals = async (req, res) => {
  try {
    const [pendingSellers, pendingListings, pendingProjects] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'SELLER', is_verified: false },
        select: {
          id: true,
          name: true,
          email: true,
          created_at: true,
          location: true,
        },
        orderBy: { created_at: 'asc' },
      }),
      prisma.energyListing.findMany({
        where: { is_approved: false },
        include: {
          seller: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { created_at: 'asc' },
      }),
      prisma.project.findMany({
        where: { is_approved: false },
        include: {
          seller: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { created_at: 'asc' },
      }),
    ]);

    return res.json({
      pending: {
        sellers: pendingSellers,
        listings: pendingListings,
        projects: pendingProjects,
      },
      counts: {
        sellers: pendingSellers.length,
        listings: pendingListings.length,
        projects: pendingProjects.length,
      },
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    return res.status(500).json({
      error: 'Failed to get pending approvals',
      message: 'Internal server error',
    });
  }
};

const getTransactions = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, 20);
    const { status, search } = req.query;
    const where = {};

    if (status) {
      where.status = String(status).toUpperCase();
    }

    if (search) {
      where.OR = [
        { buyer: { name: { contains: search, mode: 'insensitive' } } },
        { seller: { name: { contains: search, mode: 'insensitive' } } },
        { receipt_code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          buyer: {
            select: { name: true, email: true },
          },
          seller: {
            select: { name: true, email: true },
          },
          listing: {
            select: { energy_type: true, location: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return res.status(500).json({
      error: 'Failed to get transactions',
      message: 'Internal server error',
    });
  }
};

const getWithdrawals = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, 20);
    const { status = 'PENDING' } = req.query;
    const where = status === 'ALL' ? {} : { status: String(status).toUpperCase() };

    const [requests, total] = await Promise.all([
      prisma.withdrawalRequest.findMany({
        where,
        include: {
          requester: {
            select: { id: true, name: true, email: true, role: true },
          },
          reviewer: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { created_at: 'asc' },
        skip,
        take: limit,
      }),
      prisma.withdrawalRequest.count({ where }),
    ]);

    return res.json({
      withdrawals: requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get withdrawals error:', error);
    return res.status(500).json({
      error: 'Failed to get withdrawals',
      message: 'Internal server error',
    });
  }
};

const reviewWithdrawal = async (req, res) => {
  try {
    const requestId = req.params.id;
    const action = String(req.body.action || '').toUpperCase();
    const reviewReason = req.body.review_reason || null;

    const updated = await prisma.$transaction(async (tx) => {
      const request = await tx.withdrawalRequest.findUnique({ where: { id: requestId } });
      if (!request) {
        throw new Error('NOT_FOUND');
      }

      if (request.status === 'PAID' || request.status === 'REJECTED') {
        throw new Error('ALREADY_FINALIZED');
      }

      if (action === 'APPROVE') {
        return tx.withdrawalRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            reviewed_by: req.user.id,
            reviewed_at: new Date(),
            review_reason: reviewReason,
          },
        });
      }

      if (action === 'REJECT') {
        return tx.withdrawalRequest.update({
          where: { id: requestId },
          data: {
            status: 'REJECTED',
            reviewed_by: req.user.id,
            reviewed_at: new Date(),
            review_reason: reviewReason,
          },
        });
      }

      if (action === 'MARK_PAID') {
        if (request.status !== 'APPROVED') {
          throw new Error('NOT_APPROVED');
        }

        try {
          await debitWallet(tx, {
            userId: request.user_id,
            amount: request.amount,
            category: 'WITHDRAWAL',
            referenceId: request.id,
            referenceType: 'WITHDRAWAL_REQUEST',
            description: 'Withdrawal payout completed',
          });
        } catch (walletError) {
          if (walletError.message === 'Insufficient wallet balance') {
            throw new Error('INSUFFICIENT_WALLET_BALANCE');
          }
          throw walletError;
        }

        return tx.withdrawalRequest.update({
          where: { id: requestId },
          data: {
            status: 'PAID',
            reviewed_by: req.user.id,
            reviewed_at: new Date(),
            review_reason: reviewReason,
          },
        });
      }

      throw new Error('INVALID_ACTION');
    });

    return res.json({
      success: true,
      message: 'Withdrawal request updated successfully',
      request: updated,
    });
  } catch (error) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({
        error: 'Not found',
        message: 'Withdrawal request not found',
      });
    }

    if (error.message === 'INVALID_ACTION') {
      return res.status(400).json({
        error: 'Invalid action',
        message: 'Action must be one of APPROVE, REJECT, MARK_PAID',
      });
    }

    if (error.message === 'NOT_APPROVED') {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Withdrawal must be APPROVED before marking as paid',
      });
    }

    if (error.message === 'ALREADY_FINALIZED') {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Withdrawal request is already finalized',
      });
    }

    if (error.message === 'INSUFFICIENT_WALLET_BALANCE') {
      return res.status(400).json({
        error: 'Payout failed',
        message: 'User wallet has insufficient funds for payout',
      });
    }

    console.error('Review withdrawal error:', error);
    return res.status(500).json({
      error: 'Failed to review withdrawal request',
      message: 'Internal server error',
    });
  }
};

const getDisputes = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, 20);
    const status = req.query.status ? String(req.query.status).toUpperCase() : null;
    const where = status ? { status } : {};

    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          transaction: {
            select: {
              id: true,
              status: true,
              receipt_code: true,
              buyer_id: true,
              seller_id: true,
              total_price: true,
            },
          },
          creator: {
            select: { id: true, name: true, email: true },
          },
          assignedAdmin: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { created_at: 'asc' },
        skip,
        take: limit,
      }),
      prisma.dispute.count({ where }),
    ]);

    return res.json({
      disputes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get disputes error:', error);
    return res.status(500).json({
      error: 'Failed to get disputes',
      message: 'Internal server error',
    });
  }
};

const resolveDispute = async (req, res) => {
  try {
    const disputeId = req.params.id;
    const status = String(req.body.status || '').toUpperCase();
    const resolutionNotes = req.body.resolution_notes || null;

    const allowedStatuses = ['UNDER_REVIEW', 'RESOLVED', 'REJECTED'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: `Status must be one of ${allowedStatuses.join(', ')}`,
      });
    }

    const dispute = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status,
        assigned_admin: req.user.id,
        resolution_notes: resolutionNotes,
        ...(status === 'RESOLVED' || status === 'REJECTED' ? { resolved_at: new Date() } : {}),
      },
      include: {
        transaction: {
          select: {
            id: true,
            status: true,
            receipt_code: true,
          },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return res.json({
      success: true,
      message: 'Dispute status updated successfully',
      dispute,
    });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    return res.status(500).json({
      error: 'Failed to resolve dispute',
      message: 'Internal server error',
    });
  }
};

const getCommissionSettings = async (req, res) => {
  try {
    const settings = await getPlatformSettings(prisma);
    return res.json({
      settings: {
        commission_rate: toNumber(settings.commission_rate),
        investment_fee_rate: toNumber(settings.investment_fee_rate),
        withdrawal_fee_rate: toNumber(settings.withdrawal_fee_rate),
        updated_at: settings.updated_at,
      },
    });
  } catch (error) {
    console.error('Get commission settings error:', error);
    return res.status(500).json({
      error: 'Failed to get commission settings',
      message: 'Internal server error',
    });
  }
};

const updateCommissionSettings = async (req, res) => {
  try {
    const data = {};
    if (req.body.commission_rate !== undefined) data.commission_rate = req.body.commission_rate;
    if (req.body.investment_fee_rate !== undefined) data.investment_fee_rate = req.body.investment_fee_rate;
    if (req.body.withdrawal_fee_rate !== undefined) data.withdrawal_fee_rate = req.body.withdrawal_fee_rate;

    const settings = await prisma.platformSetting.upsert({
      where: { id: 1 },
      update: data,
      create: {
        id: 1,
        commission_rate: data.commission_rate ?? 0.03,
        investment_fee_rate: data.investment_fee_rate ?? 0.01,
        withdrawal_fee_rate: data.withdrawal_fee_rate ?? 0.005,
      },
    });

    return res.json({
      success: true,
      message: 'Commission settings updated successfully',
      settings,
    });
  } catch (error) {
    console.error('Update commission settings error:', error);
    return res.status(500).json({
      error: 'Failed to update commission settings',
      message: 'Internal server error',
    });
  }
};

const getSystemHealth = async (req, res) => {
  try {
    const dbHealth = await prisma.$queryRaw`SELECT 1 as health`;
    const [totalUsers, activeListings, pendingTransactions, openDisputes] = await Promise.all([
      prisma.user.count(),
      prisma.energyListing.count({ where: { is_active: true } }),
      prisma.transaction.count({ where: { status: 'PENDING' } }),
      prisma.dispute.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
    ]);

    return res.json({
      health: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbHealth.length > 0 ? 'connected' : 'disconnected',
        metrics: {
          totalUsers,
          activeListings,
          pendingTransactions,
          openDisputes,
        },
      },
    });
  } catch (error) {
    console.error('System health check error:', error);
    return res.status(500).json({
      health: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      },
    });
  }
};

module.exports = {
  getAnalytics,
  getUsers,
  setUserSuspension,
  approveSeller,
  approveListing,
  approveProject,
  getPendingApprovals,
  getTransactions,
  getWithdrawals,
  reviewWithdrawal,
  getDisputes,
  resolveDispute,
  getCommissionSettings,
  updateCommissionSettings,
  getSystemHealth,
};
