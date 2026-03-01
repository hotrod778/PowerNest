const { prisma } = require('../config/database');

const createDispute = async (req, res) => {
  try {
    const { transaction_id, reason, description } = req.body;

    const transaction = await prisma.transaction.findUnique({
      where: { id: transaction_id },
      select: {
        id: true,
        buyer_id: true,
        seller_id: true,
      },
    });

    if (!transaction) {
      return res.status(404).json({
        error: 'Dispute failed',
        message: 'Transaction not found',
      });
    }

    const isParticipant =
      transaction.buyer_id === req.user.id || transaction.seller_id === req.user.id;
    if (!isParticipant) {
      return res.status(403).json({
        error: 'Dispute failed',
        message: 'You can only raise disputes for your own transactions',
      });
    }

    const existingOpenDispute = await prisma.dispute.findFirst({
      where: {
        transaction_id,
        status: {
          in: ['OPEN', 'UNDER_REVIEW'],
        },
      },
      select: { id: true },
    });

    if (existingOpenDispute) {
      return res.status(400).json({
        error: 'Dispute failed',
        message: 'An active dispute already exists for this transaction',
      });
    }

    const dispute = await prisma.dispute.create({
      data: {
        transaction_id,
        created_by: req.user.id,
        reason,
        description: description || null,
      },
      include: {
        transaction: {
          select: {
            id: true,
            status: true,
            receipt_code: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Dispute raised successfully',
      dispute,
    });
  } catch (error) {
    console.error('Create dispute error:', error);
    return res.status(500).json({
      error: 'Failed to create dispute',
      message: 'Internal server error',
    });
  }
};

const getMyDisputes = async (req, res) => {
  try {
    const where = req.user.is_admin
      ? {}
      : {
          OR: [{ created_by: req.user.id }],
        };

    const disputes = await prisma.dispute.findMany({
      where,
      include: {
        transaction: {
          select: {
            id: true,
            status: true,
            receipt_code: true,
            total_price: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedAdmin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return res.json({ disputes });
  } catch (error) {
    console.error('Get disputes error:', error);
    return res.status(500).json({
      error: 'Failed to get disputes',
      message: 'Internal server error',
    });
  }
};

module.exports = {
  createDispute,
  getMyDisputes,
};
