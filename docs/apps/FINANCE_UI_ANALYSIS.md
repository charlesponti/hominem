# Finance App (Florin) - UI Capabilities Analysis

> Document created for redesign planning. This analysis catalogs all user-facing features and capabilities in the Finance application.

---

## Overview

**Purpose**: Personal finance management - tracking accounts, transactions, budgets, and analytics

---

## Pages & Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page (public) - sign up CTA |
| `/finance` | Main transactions dashboard |
| `/accounts` | Bank account management |
| `/accounts/:id` | Single account detail view |
| `/budget` | Budget dashboard |
| `/analytics` | Financial analytics & insights |
| `/analytics/monthly/:month` | Monthly analytics detail |
| `/analytics/category/:category` | Category-specific analytics |
| `/analytics/categories` | All categories view |
| `/import` | CSV transaction import |
| `/finance/runway` | Financial runway calculator |
| `/account` | User settings & data management |
| `/auth/signin` | Sign in page |
| `/auth/email` | Email authentication |
| `/auth/cli` | CLI authentication |
| `/auth/callback` | OAuth callback |

---

## Navigation

- **Finance** - Transactions view
- **Analytics** - Charts and insights
- **Accounts** - Bank account management

---

## Feature Deep Dive

### 1. Transaction Management

#### Transaction List (`/finance`)
- View all transactions in paginated list (25 per page)
- Transaction display includes:
  - Date
  - Description/merchant
  - Amount
  - Category
  - Account

#### Search & Filtering
- Search transactions by description
- Filter by:
  - Account (specific bank account)
  - Category (spending category)
  - Date range
- Sort by various fields (date, amount, etc.)

#### Pagination
- Navigate between pages of results
- Current page indicator

---

### 2. Bank Account Management (`/accounts`)

#### Account Overview
- Card-based display of all connected accounts
- Sort: Plaid-connected accounts first, then manual

#### Account Card Displays
- Account name
- Account type (credit, checking, savings, etc.)
- Institution name
- Mask (last 4 digits)
- Balance (with hide/show toggle)

#### Plaid Integration
- Connect new bank via Plaid
- Add bank account button opens Plaid Link
- Success/error handling with toast notifications

#### Manual Accounts
- Create manual accounts without Plaid
- Track accounts not connected to Plaid

#### Account Actions
- Refresh account data
- View individual account details (`/accounts/:id`)

---

### 3. Budget Management (`/budget`)

#### Monthly Budget Overview
- Select month/year
- Budget vs actual spending summary

#### Budget Categories
- Create new budget categories
- Edit existing categories
- Delete categories
- Set spending limits per category

#### Budget Tracking
- Track spending against budget
- Show remaining budget
- Visual progress indicators

#### Budget Projections
- Future spending projections
- Trend analysis

#### Budget History
- Historical chart of budget vs actual
- Monthly/yearly comparisons

---

### 4. Financial Analytics (`/analytics`)

#### Filtering Controls
- Date range picker (from/to dates)
- Account filter
- Category filter
- Group by: month / week / day
- Toggle: Compare to previous period
- Toggle: Include statistics

#### Chart Display
- **Area Charts** - Spending trends over time
- **Bar Charts** - Comparative data
- Switch between chart types

#### Analytics Components

**Statistics Summary**
- Total spending
- Total income
- Average daily spending
- Comparison to previous period

**Monthly Breakdown**
- Spending grouped by month/week/day
- Comparison to previous period

**Top Categories**
- Highest spending categories
- Category breakdown

**Top Merchants**
- Most frequent merchants
- Spending per merchant

**Budget History**
- Historical budget performance
- Visualization of budget adherence

---

### 5. Transaction Import (`/import`)

#### Drag & Drop Upload
- Drop zone for CSV files
- Click to browse files
- Accepts `.csv` files
- Multiple file support

#### File Management
- List of selected files
- File status indicators:
  - Selected
  - Queued
  - Processing
  - Uploading
  - Completed
  - Error
- Remove files from queue

#### Import Actions
- Start import button
- Import progress feedback
- Status badges per file
- Success/error notifications via toasts

---

### 6. Financial Runway Calculator (`/finance/runway`)

#### Input Parameters
- Initial balance input ($)
- Monthly expenses input ($)
- Add planned purchases:
  - Description
  - Amount
  - Date

#### Calculations
- Months until balance reaches zero
- Projected balance over 12 months
- Total planned expenses

#### Display
- Summary cards:
  - Current Balance
  - Monthly Burn Rate
  - Runway (months)
  - Minimum Balance
- Warning badge when runway is dangerous
- Zero date projection

#### 12-Month Projection Chart
- Line chart showing projected balance
- Reference line at $0
- Tooltips with exact values
- Visual indicators for negative balance

#### Planned Purchases
- List of added purchases
- Remove purchase option
- Total planned expenses summary

---

### 7. User Settings (`/account`)

#### Data Management
- **Export Transactions** - Download transaction data
- **Import Transactions** - Link to import page
- **Delete All Finance Data** - With confirmation dialog

#### Account Actions
- Sign out button
- Danger zone for destructive actions

---

### 8. Authentication

#### Methods
- OAuth (Apple)
- Email magic link
- CLI authentication

#### Session Management
- Automatic redirect after auth
- Auth callback handling

---

## UI Components Used

- AppLayout with navigation
- Transaction list with filters
- Pagination controls
- Charts (Recharts):
  - Line charts
  - Area charts
  - Bar charts
- Date range pickers
- Month selector
- Account cards
- Category cards
- Budget overview cards
- Drag & drop file upload
- Form inputs
- Dialogs (for confirmations)
- Toasts/notifications
- Loading states
- Empty states
- Error handling (Alerts)

---

## Redesign Considerations

### Keep
- Clean, professional UI suitable for finance
- Comprehensive filtering options
- Chart visualizations are valuable
- Budget tracking is core functionality
- Runway calculator is unique and useful

### Rethink
- Could simplify the navigation for power users
- Consider dashboard-style home instead of transactions
- Could add more visual spending insights
- Mobile experience for complex filters
- Could add goals/savings features

### Technical Observations
- Heavy use of TanStack Query for data
- Recharts for all visualizations
- Real-time calculations for runway
- Plaid integration is central
- Complex filtering state management
