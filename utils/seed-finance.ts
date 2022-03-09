import { writeFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

import { seed } from './seed';
import logger from '../../src/utils/logger';
import { createRecords } from './create-record';

import * as GoogleSheetsTypes from '../../src/utils/google-sheets/google-sheets-types';
import { getSheetValues } from '../../src/utils/google-sheets';

import { TransactionModel } from '../../src/transactions/transaction.model';
import { HumanModel } from '../../src/humans/humans.model';
import { AccountModel } from '../../src/accounts/accounts.model';
import { CategoryModel } from '../../src/categories/categories.model';

const { FINANCE_SHEET_ID = "", HUMAN_SHEET_ID = "" } = process.env;

const spreadsheets: { [key: string]: GoogleSheetsTypes.Spreadsheet } = {
  human: {
    sheetId: HUMAN_SHEET_ID,
    name: 'human',
    sheets: [],
  },
  finance: {
    sheetId: FINANCE_SHEET_ID,
    name: 'finance',
    sheets: [
      { range: 'Accounts!A:D', collection: 'accounts' },
      { range: 'Transactions!A:G', collection: 'transactions' }
    ],
  },
};

async function getFinanceSheets(): Promise<GoogleSheetsTypes.FinanceSheets> {
  const { finance } = spreadsheets;
  let response: GoogleSheetsTypes.FinanceSheets;

  try {
    const [accounts, transactions] = await Promise.all(
      finance.sheets.map(sheet => getSheetValues(finance.sheetId, sheet))
    );

    writeFileSync('./accounts.json', JSON.stringify(accounts, null, 2))
    writeFileSync('./transactions.json', JSON.stringify(transactions, null, 2))

    const transactionCategories = transactions.map(
      (t: GoogleSheetsTypes.SheetTransaction) => t.category
    )

    // Retrieve list of unique category names from transactions list
    const categories = [...new Set(transactionCategories)].map(name => ({ name }))

    response = { accounts, transactions, categories };
  } catch (e) {
    logger.error({ message: `could not load ${finance.name}: ${e}` });
  }

  return response;
}

seed(async function main(): Promise<void> {
  // ---------------- Drop all documents -----------------------------------
  await HumanModel.deleteMany({});
  await TransactionModel.deleteMany({});
  await AccountModel.deleteMany({});
  await CategoryModel.deleteMany({});

  // Create Human
  const [human] = await HumanModel.create([{ name: 'John Doe', birthday: '1986-04-04' }]);

  let data: GoogleSheetsTypes.FinanceSheets;

  try {
    data = await getFinanceSheets();
  } catch (err) {
    logger.error({ message: `Could not retriend sheet: ${err} ` });
    throw err;
  }

  const { accounts, transactions, categories } = data;
  const accountIds: { [key: string]: string } = {};
  const categoryIds: { [key: string]: string } = {};

  await createRecords('accounts', async () =>
    await AccountModel.create(accounts.map((element: GoogleSheetsTypes.SheetAccount) => {
      const account = new AccountModel({
        ...element,
        human: human._id,
        active: element.active === 'TRUE' ? true : false
      });

      // Add account to map
      accountIds[element.name] = account._id;

      return account
    }))
  );

  await createRecords('categories', async () =>
    await CategoryModel.create(categories.map((element: GoogleSheetsTypes.SheetCategory) => {
      const category = new CategoryModel({ ...element, human: human._id, });

      // Add category to map
      categoryIds[element.name] = category._id;

      return category
    }))
  );

  await createRecords('transactions', async () =>
    await TransactionModel.create(transactions.map((element: GoogleSheetsTypes.SheetTransaction) => {
      const transaction = new TransactionModel({
        payee: element.payee,
        amount: element.amount,
        date: element.date,
        category: categoryIds[element.category],
        account: accountIds[element.account],
        description: element.description,
        human: human._id,
      })

      return transaction
    }))
  );

  logger.info({
    label: 'Import',
    message: 'Imported Finance 💰',
  });
});
