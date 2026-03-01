const { prisma } = require('../config/database');
const {
  roundCurrency,
  debitWallet,
  creditWallet,
  calculateInvestmentFee,
  calculateWithdrawalFee,
} = require('../services/walletService');

// Get all available projects
const getProjects = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      energy_type, 
      risk_level, 
      min_roi, 
      max_roi,
      location,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;
    const allowedSortBy = ['created_at', 'roi_percentage', 'current_funding', 'total_required'];
    const safeSortBy = allowedSortBy.includes(String(sort_by)) ? String(sort_by) : 'created_at';
    const safeSortOrder = String(sort_order).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {
      is_active: true,
      is_approved: true,
      seller: {
        is_verified: true,
        is_suspended: false,
      },
    };

    // Apply filters
    if (energy_type) {
      where.energy_type = energy_type.toUpperCase();
    }

    if (risk_level) {
      where.risk_level = risk_level.toUpperCase();
    }

    if (location) {
      where.location = {
        contains: location,
        mode: 'insensitive'
      };
    }

    if (min_roi || max_roi) {
      where.roi_percentage = {};
      if (min_roi) where.roi_percentage.gte = parseFloat(min_roi);
      if (max_roi) where.roi_percentage.lte = parseFloat(max_roi);
    }

    // Get projects with pagination
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          seller: {
            select: {
              name: true,
              location: true,
              _count: {
                select: {
                  projects: true
                }
              }
            }
          },
          _count: {
            select: {
              investments: true
            }
          }
        },
        orderBy: {
          [safeSortBy]: safeSortOrder
        },
        skip,
        take: parseInt(limit)
      }),
      prisma.project.count({ where })
    ]);

    // Calculate funding progress for each project
    const projectsWithProgress = projects.map(project => ({
      ...project,
      funding_progress: (Number(project.current_funding) / Number(project.total_required)) * 100,
      remaining_amount: Number(project.total_required) - Number(project.current_funding)
    }));

    res.json({
      projects: projectsWithProgress,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      error: 'Failed to get projects',
      message: 'Internal server error'
    });
  }
};

// Get single project details
const getProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            name: true,
            email: true,
            location: true,
            created_at: true,
            is_verified: true,
            is_suspended: true,
            _count: {
              select: {
                projects: true,
                energyListings: true
              }
            }
          }
        },
        investments: {
          include: {
            investor: {
              select: {
                name: true
              }
            }
          },
          orderBy: {
            created_at: 'desc'
          },
          take: 10
        },
        _count: {
          select: {
            investments: true,
          },
        },
      }
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        message: 'The requested project does not exist'
      });
    }

    if (!project.is_active || !project.is_approved || project.seller.is_suspended || !project.seller.is_verified) {
      return res.status(400).json({
        error: 'Project unavailable',
        message: 'Project is not currently available for investment',
      });
    }

    // Calculate additional metrics
    const projectWithMetrics = {
      ...project,
      funding_progress: (Number(project.current_funding) / Number(project.total_required)) * 100,
      remaining_amount: Number(project.total_required) - Number(project.current_funding),
      total_investors: project._count.investments,
      average_investment: project._count.investments > 0 
        ? Number(project.current_funding) / project._count.investments 
        : 0
    };

    res.json({
      project: projectWithMetrics
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      error: 'Failed to get project',
      message: 'Internal server error'
    });
  }
};

// Invest in project
const investProject = async (req, res) => {
  try {
    const { project_id, amount_invested } = req.body;
    const investorId = req.user.id;
    const investmentAmount = Number(amount_invested);

    if (!Number.isFinite(investmentAmount) || investmentAmount <= 0) {
      return res.status(400).json({
        error: 'Investment failed',
        message: 'Investment amount must be a positive number',
      });
    }
    
    // Get project and verify availability
    const project = await prisma.project.findUnique({
      where: { id: project_id },
      include: {
        seller: {
          select: {
            name: true,
            email: true,
            is_verified: true,
            is_suspended: true,
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({
        error: 'Investment failed',
        message: 'Project not found'
      });
    }

    if (!project.is_active) {
      return res.status(400).json({
        error: 'Investment failed',
        message: 'This project is no longer active for investment'
      });
    }

    if (!project.is_approved) {
      return res.status(400).json({
        error: 'Investment failed',
        message: 'Project is pending admin approval',
      });
    }

    if (project.seller.is_suspended || !project.seller.is_verified) {
      return res.status(400).json({
        error: 'Investment failed',
        message: 'Seller account is not eligible to receive investments',
      });
    }

    const remainingAmount = Number(project.total_required) - Number(project.current_funding);
    if (investmentAmount > remainingAmount) {
      return res.status(400).json({
        error: 'Investment failed',
        message: `Investment amount exceeds remaining funding needed ($${remainingAmount.toFixed(2)})`
      });
    }

    // Create investment using Prisma transaction
    const investment = await prisma.$transaction(async (tx) => {
      const feeAmount = await calculateInvestmentFee(tx, investmentAmount);
      const totalCost = roundCurrency(investmentAmount + feeAmount);
      const feeRate = investmentAmount > 0
        ? Number((feeAmount / investmentAmount).toFixed(4))
        : 0;

      try {
        await debitWallet(tx, {
          userId: investorId,
          amount: totalCost,
          category: 'INVESTMENT',
          referenceType: 'PROJECT',
          referenceId: project_id,
          description: `Project investment in ${project.project_name}`,
        });
      } catch (walletError) {
        if (walletError.message === 'Insufficient wallet balance') {
          throw new Error('INSUFFICIENT_WALLET_BALANCE');
        }
        throw walletError;
      }

      // Create investment record
      const newInvestment = await tx.investment.create({
        data: {
          investor_id: investorId,
          project_id,
          amount_invested: investmentAmount,
          roi_percentage: project.roi_percentage,
          service_fee: feeRate,
          status: 'ACTIVE'
        }
      });

      // Update project funding
      const updatedProject = await tx.project.update({
        where: { id: project_id },
        data: {
          current_funding: {
            increment: investmentAmount
          }
        }
      });

      await creditWallet(tx, {
        userId: project.seller_id,
        amount: investmentAmount,
        category: 'ESCROW_RELEASE',
        referenceType: 'INVESTMENT',
        referenceId: newInvestment.id,
        description: `Funding release for project ${project.project_name}`,
      });

      if (Number(updatedProject.current_funding) >= Number(updatedProject.total_required)) {
        await tx.project.update({
          where: { id: project_id },
          data: { is_active: false }
        });
      }

      return newInvestment;
    });

    res.status(201).json({
      message: 'Investment completed successfully',
      investment
    });
  } catch (error) {
    console.error('Invest project error:', error);

    if (error.message === 'INSUFFICIENT_WALLET_BALANCE') {
      return res.status(400).json({
        error: 'Investment failed',
        message: 'Insufficient wallet balance',
      });
    }

    res.status(500).json({
      error: 'Failed to invest in project',
      message: 'Internal server error'
    });
  }
};

// Get investor's investments
const getInvestments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      investor_id: req.user.id
    };

    if (status) {
      where.status = status.toUpperCase();
    }

    const [investments, total] = await Promise.all([
      prisma.investment.findMany({
        where,
        include: {
          project: {
            select: {
              project_name: true,
              energy_type: true,
              risk_level: true,
              duration_months: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip,
        take: parseInt(limit)
      }),
      prisma.investment.count({ where })
    ]);

    res.json({
      investments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get investments error:', error);
    res.status(500).json({
      error: 'Failed to get investments',
      message: 'Internal server error'
    });
  }
};

// Get investor dashboard
const getDashboard = async (req, res) => {
  try {
    const investorId = req.user.id;

    // Get investment statistics
    const investments = await prisma.investment.findMany({
      where: {
        investor_id: investorId
      },
      include: {
        project: {
          select: {
            project_name: true,
            risk_level: true,
            duration_months: true
          }
        }
      }
    });

    const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.amount_invested), 0);
    const totalReturns = investments.reduce((sum, inv) => sum + Number(inv.returns_generated), 0);
    const activeProjects = investments.filter(inv => inv.status === 'ACTIVE').length;

    // Calculate overall ROI
    const overallROI = totalInvested > 0 ? ((totalReturns - totalInvested) / totalInvested) * 100 : 0;

    // Get monthly investment data for chart
    const monthlyInvestments = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        SUM(amount_invested) as total_invested,
        SUM(returns_generated) as total_returns
      FROM investments 
      WHERE investor_id = ${investorId}
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
      LIMIT 12
    `;

    // Get risk level breakdown
    const riskBreakdown = await prisma.$queryRaw`
      SELECT 
        p.risk_level,
        COUNT(*) as count,
        SUM(i.amount_invested) as total_amount
      FROM investments i
      JOIN projects p ON i.project_id = p.id
      WHERE i.investor_id = ${investorId}
      GROUP BY p.risk_level
      ORDER BY total_amount DESC
    `;

    // Get upcoming matured investments
    const upcomingMaturities = await prisma.investment.findMany({
      where: {
        investor_id: investorId,
        status: 'ACTIVE'
      },
      include: {
        project: {
          select: {
            project_name: true,
            duration_months: true
          }
        }
      },
      orderBy: {
        created_at: 'asc'
      },
      take: 5
    });

    res.json({
      dashboard: {
        totalInvested,
        totalReturns,
        overallROI,
        activeProjects,
        totalInvestments: investments.length,
        monthlyInvestments: monthlyInvestments.reverse(),
        riskBreakdown,
        upcomingMaturities
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

// Add funds to wallet
const addFunds = async (req, res) => {
  try {
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be greater than 0'
      });
    }

    const user = await prisma.$transaction(async (tx) => {
      await creditWallet(tx, {
        userId: req.user.id,
        amount,
        category: 'FUNDING',
        referenceType: 'WALLET_TOPUP',
        description: 'Investor wallet top-up',
      });

      return tx.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          name: true,
          wallet_balance: true,
        },
      });
    });

    res.json({
      message: 'Funds added successfully',
      user
    });
  } catch (error) {
    console.error('Add funds error:', error);
    res.status(500).json({
      error: 'Failed to add funds',
      message: 'Internal server error'
    });
  }
};

// Withdraw earnings
const withdrawEarnings = async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const note = req.body.note || null;

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be greater than 0'
      });
    }

    const request = await prisma.$transaction(async (tx) => {
      const investor = await tx.user.findUnique({
        where: { id: req.user.id },
        select: { wallet_balance: true },
      });

      if (!investor || Number(investor.wallet_balance) < amount) {
        throw new Error('INSUFFICIENT_WALLET_BALANCE');
      }

      const fee = await calculateWithdrawalFee(tx, amount);
      const netAmount = roundCurrency(amount - fee);

      if (netAmount <= 0) {
        throw new Error('INVALID_NET_WITHDRAWAL');
      }

      return tx.withdrawalRequest.create({
        data: {
          user_id: req.user.id,
          amount: roundCurrency(amount),
          fee,
          net_amount: netAmount,
          note,
        },
      });
    });

    res.json({
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

    console.error('Withdraw earnings error:', error);
    res.status(500).json({
      error: 'Failed to process withdrawal',
      message: 'Internal server error'
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
    console.error('Get investor withdraw requests error:', error);
    return res.status(500).json({
      error: 'Failed to get withdrawal requests',
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getProjects,
  getProject,
  investProject,
  getInvestments,
  getDashboard,
  addFunds,
  withdrawEarnings,
  getWithdrawRequests,
};
