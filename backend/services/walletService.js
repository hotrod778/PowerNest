const { prisma } = require('../config/database');

const roundCurrency = (value) => Number(Number(value || 0).toFixed(2));

const toNumber = (value) => Number(value || 0);

const getPlatformSettings = async (tx = prisma) => {
  const existing = await tx.platformSetting.findUnique({ where: { id: 1 } });
  if (existing) return existing;

  return tx.platformSetting.create({
    data: {
      id: 1,
      commission_rate: 0.03,
      investment_fee_rate: 0.01,
      withdrawal_fee_rate: 0.005,
    },
  });
};

const getWalletBalance = async (tx, userId) => {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { wallet_balance: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return toNumber(user.wallet_balance);
};

const createWalletLedgerEntry = async (
  tx,
  {
    userId,
    amount,
    direction,
    category,
    balanceBefore,
    balanceAfter,
    referenceId,
    referenceType,
    description,
  }
) => {
  return tx.walletTransaction.create({
    data: {
      user_id: userId,
      amount: roundCurrency(amount),
      direction,
      category,
      balance_before: roundCurrency(balanceBefore),
      balance_after: roundCurrency(balanceAfter),
      reference_id: referenceId || null,
      reference_type: referenceType || null,
      description: description || null,
    },
  });
};

const debitWallet = async (
  tx,
  {
    userId,
    amount,
    category,
    referenceId,
    referenceType,
    description,
  }
) => {
  const debitAmount = roundCurrency(amount);
  if (debitAmount <= 0) {
    throw new Error('Invalid debit amount');
  }

  const before = await getWalletBalance(tx, userId);
  if (before < debitAmount) {
    throw new Error('Insufficient wallet balance');
  }

  const after = roundCurrency(before - debitAmount);

  await tx.user.update({
    where: { id: userId },
    data: {
      wallet_balance: {
        decrement: debitAmount,
      },
    },
  });

  await createWalletLedgerEntry(tx, {
    userId,
    amount: debitAmount,
    direction: 'DEBIT',
    category,
    balanceBefore: before,
    balanceAfter: after,
    referenceId,
    referenceType,
    description,
  });

  return { before, after, amount: debitAmount };
};

const creditWallet = async (
  tx,
  {
    userId,
    amount,
    category,
    referenceId,
    referenceType,
    description,
  }
) => {
  const creditAmount = roundCurrency(amount);
  if (creditAmount <= 0) {
    throw new Error('Invalid credit amount');
  }

  const before = await getWalletBalance(tx, userId);
  const after = roundCurrency(before + creditAmount);

  await tx.user.update({
    where: { id: userId },
    data: {
      wallet_balance: {
        increment: creditAmount,
      },
    },
  });

  await createWalletLedgerEntry(tx, {
    userId,
    amount: creditAmount,
    direction: 'CREDIT',
    category,
    balanceBefore: before,
    balanceAfter: after,
    referenceId,
    referenceType,
    description,
  });

  return { before, after, amount: creditAmount };
};

const calculateEnergyCommission = async (tx, energyCost) => {
  const settings = await getPlatformSettings(tx);
  return roundCurrency(toNumber(energyCost) * toNumber(settings.commission_rate));
};

const calculateInvestmentFee = async (tx, investmentAmount) => {
  const settings = await getPlatformSettings(tx);
  return roundCurrency(toNumber(investmentAmount) * toNumber(settings.investment_fee_rate));
};

const calculateWithdrawalFee = async (tx, withdrawalAmount) => {
  const settings = await getPlatformSettings(tx);
  return roundCurrency(toNumber(withdrawalAmount) * toNumber(settings.withdrawal_fee_rate));
};

const generateReceiptCode = (prefix = 'PN') => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
};

module.exports = {
  roundCurrency,
  toNumber,
  getPlatformSettings,
  getWalletBalance,
  createWalletLedgerEntry,
  debitWallet,
  creditWallet,
  calculateEnergyCommission,
  calculateInvestmentFee,
  calculateWithdrawalFee,
  generateReceiptCode,
};

