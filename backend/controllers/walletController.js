const { prisma } = require('../config/database');

const getWalletSummary = async (req, res) => {
  try {
    const [user, recentTransactions, pendingWithdrawals] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          name: true,
          role: true,
          wallet_balance: true,
        },
      }),
      prisma.walletTransaction.findMany({
        where: { user_id: req.user.id },
        orderBy: { created_at: 'desc' },
        take: 10,
      }),
      prisma.withdrawalRequest.count({
        where: {
          user_id: req.user.id,
          status: {
            in: ['PENDING', 'APPROVED'],
          },
        },
      }),
    ]);

    return res.json({
      wallet: user,
      recentTransactions,
      pendingWithdrawals,
    });
  } catch (error) {
    console.error('Get wallet summary error:', error);
    return res.status(500).json({
      error: 'Failed to get wallet summary',
      message: 'Internal server error',
    });
  }
};

const getWalletLedger = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const category = req.query.category ? String(req.query.category).toUpperCase() : null;
    const direction = req.query.direction ? String(req.query.direction).toUpperCase() : null;

    const where = {
      user_id: req.user.id,
      ...(category ? { category } : {}),
      ...(direction ? { direction } : {}),
    };

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.walletTransaction.count({ where }),
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
    console.error('Get wallet ledger error:', error);
    return res.status(500).json({
      error: 'Failed to get wallet ledger',
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getWalletSummary,
  getWalletLedger,
};
