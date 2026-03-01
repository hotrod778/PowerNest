const { prisma } = require('../config/database');
const {
  roundCurrency,
  calculateEnergyCommission,
  generateReceiptCode,
  debitWallet,
  creditWallet,
} = require('../services/walletService');

// Get all available energy listings
const getListings = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      energy_type, 
      location, 
      min_price, 
      max_price,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;
    const allowedSortBy = ['created_at', 'price_per_kwh', 'available_units', 'capacity_kwh'];
    const safeSortBy = allowedSortBy.includes(String(sort_by)) ? String(sort_by) : 'created_at';
    const safeSortOrder = String(sort_order).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {
      is_active: true,
      is_approved: true,
      available_units: { gt: 0 },
      seller: {
        is_verified: true,
        is_suspended: false,
      },
    };

    // Apply filters
    if (energy_type) {
      where.energy_type = energy_type.toUpperCase();
    }

    if (location) {
      where.location = {
        contains: location,
        mode: 'insensitive'
      };
    }

    if (min_price || max_price) {
      where.price_per_kwh = {};
      if (min_price) where.price_per_kwh.gte = parseFloat(min_price);
      if (max_price) where.price_per_kwh.lte = parseFloat(max_price);
    }

    // Get listings with pagination
    const [listings, total] = await Promise.all([
      prisma.energyListing.findMany({
        where,
        include: {
          seller: {
            select: {
              name: true,
              location: true,
              _count: {
                select: {
                  ratings: true
                }
              }
            }
          },
          _count: {
            select: {
              transactions: {
                where: { status: 'COMPLETED' }
              }
            }
          }
        },
        orderBy: {
          [safeSortBy]: safeSortOrder
        },
        skip,
        take: parseInt(limit)
      }),
      prisma.energyListing.count({ where })
    ]);

    const sellerIds = [...new Set(listings.map((listing) => listing.seller_id))];
    const ratings = sellerIds.length
      ? await prisma.rating.groupBy({
          by: ['target_id'],
          where: {
            target_id: {
              in: sellerIds,
            },
          },
          _avg: {
            rating: true,
          },
          _count: {
            rating: true,
          },
        })
      : [];

    const ratingMap = ratings.reduce((acc, item) => {
      acc[item.target_id] = {
        average: Number(item._avg.rating || 0),
        count: item._count.rating || 0,
      };
      return acc;
    }, {});

    const listingsWithRatings = listings.map((listing) => ({
      ...listing,
      seller: {
        ...listing.seller,
        average_rating: ratingMap[listing.seller_id]?.average || 0,
        total_ratings: ratingMap[listing.seller_id]?.count || 0,
      },
    }));

    res.json({
      listings: listingsWithRatings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({
      error: 'Failed to get listings',
      message: 'Internal server error'
    });
  }
};

// Get single listing details
const getListing = async (req, res) => {
  try {
    const { id } = req.params;

    const listing = await prisma.energyListing.findFirst({
      where: {
        id,
        is_approved: true,
        is_active: true,
      },
      include: {
        seller: {
          select: {
            name: true,
            email: true,
            location: true,
            created_at: true,
            is_verified: true,
            _count: {
              select: {
                energyListings: true,
                transactions: {
                  where: { status: 'COMPLETED' }
                }
              }
            }
          }
        },
        transactions: {
          where: { status: 'COMPLETED' },
          include: {
            buyer: {
              select: {
                name: true
              }
            }
          },
          orderBy: {
            created_at: 'desc'
          },
          take: 5
        }
      }
    });

    if (!listing) {
      return res.status(404).json({
        error: 'Listing not found',
        message: 'The requested energy listing does not exist'
      });
    }

    const ratingStats = await prisma.rating.aggregate({
      where: { target_id: listing.seller_id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const listingWithRatings = {
      ...listing,
      seller: {
        ...listing.seller,
        average_rating: Number(ratingStats._avg.rating || 0),
        total_ratings: ratingStats._count.rating || 0,
      },
    };

    res.json({
      listing: listingWithRatings
    });
  } catch (error) {
    console.error('Get listing error:', error);
    res.status(500).json({
      error: 'Failed to get listing',
      message: 'Internal server error'
    });
  }
};

// Purchase energy
const purchaseEnergy = async (req, res) => {
  try {
    const { listing_id, energy_units } = req.body;
    const buyerId = req.user.id;
    const requestedUnits = Number(energy_units);
    if (!Number.isFinite(requestedUnits) || requestedUnits <= 0) {
      return res.status(400).json({
        error: 'Purchase failed',
        message: 'Energy units must be a positive number',
      });
    }
    
    // Get listing details
    const listing = await prisma.energyListing.findUnique({
      where: { id: listing_id },
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

    if (!listing) {
      return res.status(404).json({
        error: 'Purchase failed',
        message: 'Energy listing not found'
      });
    }

    if (!listing.is_active) {
      return res.status(400).json({
        error: 'Purchase failed',
        message: 'This listing is no longer active'
      });
    }

    if (!listing.is_approved) {
      return res.status(400).json({
        error: 'Purchase failed',
        message: 'This listing is pending admin approval',
      });
    }

    if (listing.seller.is_suspended || !listing.seller.is_verified) {
      return res.status(400).json({
        error: 'Purchase failed',
        message: 'Seller account is not currently eligible for transactions',
      });
    }

    if (Number(listing.available_units) < requestedUnits) {
      return res.status(400).json({
        error: 'Purchase failed',
        message: 'Insufficient energy units available'
      });
    }

    // Create transaction using Prisma transaction
    const transaction = await prisma.$transaction(async (tx) => {
      const energyCost = roundCurrency(requestedUnits * Number(listing.price_per_kwh));
      const commissionAmount = await calculateEnergyCommission(tx, energyCost);
      const totalWithCommission = roundCurrency(energyCost + commissionAmount);
      const commissionRate = energyCost > 0
        ? Number((commissionAmount / energyCost).toFixed(4))
        : 0;
      const receiptCode = generateReceiptCode('PUR');

      try {
        await debitWallet(tx, {
          userId: buyerId,
          amount: totalWithCommission,
          category: 'PURCHASE',
          referenceType: 'TRANSACTION',
          referenceId: listing_id,
          description: `Escrow hold for ${requestedUnits} kWh purchase`,
        });
      } catch (walletError) {
        if (walletError.message === 'Insufficient wallet balance') {
          throw new Error('INSUFFICIENT_WALLET_BALANCE');
        }
        throw walletError;
      }

      // Create transaction record
      const newTransaction = await tx.transaction.create({
        data: {
          buyer_id: buyerId,
          seller_id: listing.seller_id,
          listing_id: listing_id,
          energy_units: requestedUnits,
          price_per_kwh: listing.price_per_kwh,
          total_price: energyCost,
          commission: commissionRate,
          status: 'PENDING',
          escrow_status: 'HELD',
          receipt_code: receiptCode,
        }
      });

      // Update available units in listing
      const updatedListing = await tx.energyListing.update({
        where: { id: listing_id },
        data: {
          available_units: {
            decrement: requestedUnits
          }
        }
      });

      if (Number(updatedListing.available_units) <= 0) {
        await tx.energyListing.update({
          where: { id: listing_id },
          data: { is_active: false },
        });
      }

      return newTransaction;
    });

    res.status(201).json({
      message: 'Energy purchase initiated successfully. Funds are held in escrow.',
      transaction
    });
  } catch (error) {
    console.error('Purchase energy error:', error);

    if (error.message === 'INSUFFICIENT_WALLET_BALANCE') {
      return res.status(400).json({
        error: 'Purchase failed',
        message: 'Insufficient wallet balance',
      });
    }

    res.status(500).json({
      error: 'Failed to purchase energy',
      message: 'Internal server error'
    });
  }
};

// Get buyer's purchase history
const getPurchaseHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      buyer_id: req.user.id
    };

    if (status) {
      where.status = status.toUpperCase();
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          seller: {
            select: {
              name: true,
              location: true
            }
          },
          listing: {
            select: {
              energy_type: true,
              location: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip,
        take: parseInt(limit)
      }),
      prisma.transaction.count({ where })
    ]);

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get purchase history error:', error);
    res.status(500).json({
      error: 'Failed to get purchase history',
      message: 'Internal server error'
    });
  }
};

// Get buyer dashboard
const getDashboard = async (req, res) => {
  try {
    const buyerId = req.user.id;

    // Get purchase statistics
    const completedTransactions = await prisma.transaction.findMany({
      where: {
        buyer_id: buyerId,
        status: 'COMPLETED'
      },
      include: {
        listing: {
          select: {
            energy_type: true
          }
        }
      }
    });

    const totalEnergyPurchased = completedTransactions.reduce((sum, trans) => 
      sum + Number(trans.energy_units), 0);

    const totalSpent = completedTransactions.reduce((sum, trans) => 
      sum + Number(trans.total_price), 0);

    // Calculate savings vs grid (assuming grid price is $0.15 per kWh)
    const gridPricePerKwh = 0.15;
    const gridCost = totalEnergyPurchased * gridPricePerKwh;
    const savings = Math.max(0, gridCost - totalSpent);

    // Calculate CO2 reduction (assuming 0.4 kg CO2 per kWh saved)
    const co2Reduction = totalEnergyPurchased * 0.4;

    // Get monthly purchase data for chart
    const monthlyPurchases = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        SUM(energy_units) as total_energy,
        SUM(total_price) as total_spent
      FROM transactions 
      WHERE buyer_id = ${buyerId} AND status = 'COMPLETED'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
      LIMIT 12
    `;

    // Get energy type breakdown
    const energyTypeBreakdown = await prisma.$queryRaw`
      SELECT 
        l.energy_type,
        SUM(t.energy_units) as total_energy
      FROM transactions t
      JOIN energy_listings l ON t.listing_id = l.id
      WHERE t.buyer_id = ${buyerId} AND t.status = 'COMPLETED'
      GROUP BY l.energy_type
      ORDER BY total_energy DESC
    `;

    res.json({
      dashboard: {
        totalEnergyPurchased,
        totalSpent,
        savings,
        co2Reduction,
        completedPurchases: completedTransactions.length,
        pendingPurchases: await prisma.transaction.count({
          where: {
            buyer_id: buyerId,
            status: 'PENDING'
          }
        }),
        monthlyPurchases: monthlyPurchases.reverse(),
        energyTypeBreakdown
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
        description: 'Wallet top-up via settings',
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

// Create rating for seller
const createRating = async (req, res) => {
  try {
    const { target_id, rating, comment } = req.body;

    const targetUser = await prisma.user.findUnique({
      where: { id: target_id },
      select: { id: true, role: true },
    });

    if (!targetUser || targetUser.role !== 'SELLER') {
      return res.status(400).json({
        error: 'Rating failed',
        message: 'Ratings can only be submitted for seller accounts',
      });
    }

    // Check if user has completed transactions with this seller
    const hasTransaction = await prisma.transaction.findFirst({
      where: {
        buyer_id: req.user.id,
        seller_id: target_id,
        status: 'COMPLETED'
      }
    });

    if (!hasTransaction) {
      return res.status(400).json({
        error: 'Rating failed',
        message: 'You can only rate sellers you have completed transactions with'
      });
    }

    // Create or update rating
    const ratingRecord = await prisma.rating.upsert({
      where: {
        user_id_target_id: {
          user_id: req.user.id,
          target_id
        }
      },
      update: {
        rating,
        comment
      },
      create: {
        user_id: req.user.id,
        target_id,
        rating,
        comment
      }
    });

    res.status(201).json({
      message: 'Rating submitted successfully',
      rating: ratingRecord
    });
  } catch (error) {
    console.error('Create rating error:', error);
    res.status(500).json({
      error: 'Failed to create rating',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getListings,
  getListing,
  purchaseEnergy,
  getPurchaseHistory,
  getDashboard,
  addFunds,
  createRating
};
