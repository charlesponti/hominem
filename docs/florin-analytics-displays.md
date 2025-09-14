# Florin Analytics Displays Documentation

This document provides a comprehensive catalog of all analytics displays (text and charts) shown to users in the Florin finance application.

## Table of Contents

1. [Main Analytics Dashboard](#main-analytics-dashboard)
2. [Monthly Analytics](#monthly-analytics)
3. [Category Analytics](#category-analytics)
4. [Budget Analytics](#budget-analytics)
5. [Financial Planning Tools](#financial-planning-tools)
6. [Location Comparison Analytics](#location-comparison-analytics)

---

## Main Analytics Dashboard

**Route:** `/analytics`

### 1. Analytics Statistics Summary

**Component:** `AnalyticsStatisticsSummary`

**Display Type:** Single Card with Flex Column Layout

**Content:**
- **Card Title:** "Financial Summary"
- **Flex Column Layout:**
  - **Total Income Row**
    - Label: "Total Income"
    - Value: Formatted currency amount
    - Subtitle: "For period [period covered]"
    - Color: Black text
  - **Total Expenses Row**
    - Label: "Total Expenses"
    - Value: Formatted currency amount
    - Subtitle: "For period [period covered]"
    - Color: Red text
  - **Average Income Row**
    - Label: "Average Income"
    - Value: Formatted currency amount
    - Subtitle: "Over [count] months"
    - Color: Black text
  - **Average Expenses Row**
    - Label: "Average Expenses"
    - Value: Formatted currency amount
    - Subtitle: "Over [count] months"
    - Color: Red text

**Layout Benefits:**
- More compact design
- Better visual hierarchy
- Easier to scan all metrics at once
- Reduced visual clutter
- Better mobile experience

**States:**
- Loading: Skeleton card with placeholder content
- Error: Error message in card
- Disabled: Message indicating statistics are disabled
- No Data: Message indicating no statistics available

### 2. Trends Chart

**Component:** `AnalyticsChartDisplay`

**Display Type:** Interactive Chart (Area or Bar)

**Content:**
- **Chart Type:** Area chart or Bar chart (user toggleable)
- **Data Series:**
  - Income (green color: #ABF4B6)
  - Expenses (red color: #ef4444)
- **X-Axis:** Time periods (formatted dates)
- **Y-Axis:** Currency amounts
- **Features:**
  - Gradient fills for area charts
  - Tooltips with formatted currency values
  - Legend
  - Grid lines
  - Responsive design

**States:**
- Loading: Skeleton chart area
- Error: Error message in chart area
- No Data: "No data available for the selected period"

### 3. Monthly Breakdown Table

**Component:** `MonthlyBreakdown`

**Display Type:** Interactive Table/Cards

**Content:**
- **Desktop Table:**
  - Columns: Period, Transactions, Total Spent, Average, Trend (if enabled)
  - Clickable rows linking to monthly analytics
  - Trend column shows percentage change with up/down arrows

- **Mobile Cards:**
  - Period name with "Details" link
  - Transaction count
  - Total spent amount
  - Average amount
  - Spending trend (if enabled)

**Features:**
- Comparison to previous period (optional)
- Color-coded trends (red for increase, green for decrease)
- Navigation to monthly analytics pages

### 4. Top Categories

**Component:** `TopCategories`

**Display Type:** Table

**Content:**
- **Columns:** Category, Total, Count
- **Data:** Top 5 spending categories
- **Formatting:** Currency for totals, plain numbers for counts

**States:**
- Loading: Skeleton rows
- Error: Error message
- No Data: "No category data available for the selected period"

### 5. Top Merchants

**Component:** `TopMerchants`

**Display Type:** Table

**Content:**
- **Columns:** Merchant, Total, Count
- **Data:** Top 5 merchants by spending
- **Formatting:** Currency for totals, plain numbers for counts

**States:**
- Loading: Skeleton rows
- Error: Error message
- No Data: "No merchant data available for the selected period"

### 6. Budget History Chart

**Component:** `BudgetHistoryChart`

**Display Type:** Line Chart

**Content:**
- **Title:** "Budget Adherence Over Time (6 Months)"
- **Data Series:**
  - Total Budgeted (purple line: #8884d8)
  - Total Actual Spending (green line: #82ca9d)
- **X-Axis:** Dates
- **Y-Axis:** Currency amounts (formatted as $Xk)
- **Features:**
  - Tooltips with formatted currency values
  - Legend
  - Grid lines

**States:**
- Loading: Spinner with "Loading history data..." message
- Error: Error message with details
- No Data: "No historical data available for the selected period"

---

## Monthly Analytics

**Route:** `/analytics/monthly/[month]`

### 1. Monthly Summary Card

**Display Type:** Text Card

**Content:**
- **Net Income:** Currency amount (green if positive, red if negative)
- **Total Income:** Currency amount (green text)
- **Total Expenses:** Currency amount (red text)

### 2. Spending by Category

**Display Type:** List

**Content:**
- Category names with corresponding currency amounts
- Formatted as a list with borders between items
- "No spending recorded for this month" if no data

---

## Category Analytics

**Route:** `/analytics/categories`

### Categories Breakdown Table

**Display Type:** Interactive Table

**Content:**
- **Columns:** Category, Total, Count
- **Features:**
  - Clickable rows linking to category-specific analytics
  - Currency formatting for totals
  - Navigation to individual category analysis pages

**Route:** `/analytics/category/[category]`

### Category-Specific Analytics

**Components:** `AnalyticsChartDisplay` and `MonthlyBreakdown`

**Content:**
- Same as main analytics but filtered for specific category
- Chart shows income/expenses for that category over time
- Monthly breakdown shows spending for that category by month

---

## Budget Analytics

**Route:** `/budget`

### 1. Budget Tracking Summary Cards

**Component:** `BudgetTrackingSummaryCards`

**Display Type:** Text Cards (4 cards in a grid)

**Content:**
- **Total Budgeted Card**
  - Title: "Total Budgeted"
  - Value: Formatted currency amount
  - Icon: Target icon

- **Actual Spending Card**
  - Title: "Actual Spending"
  - Value: Formatted currency amount
  - Icon: TrendingUp (red) or TrendingDown (green)

- **Variance Card**
  - Title: "Variance"
  - Value: Formatted currency amount with +/- prefix
  - Subtitle: "Over budget" or "Under budget"
  - Color: Red for over budget, green for under budget

- **Budget Usage Card**
  - Title: "Budget Usage"
  - Value: Percentage with decimal
  - Progress bar showing usage percentage

### 2. Budget Category Details

**Component:** `BudgetCategoryDetails`

**Display Type:** Detailed Cards

**Content per Category:**
- **Header:** Category name with status indicator (on-track/warning/over-budget)
- **Status Badge:** Color-coded status text
- **Metrics Grid:**
  - Budgeted amount (blue text)
  - Actual amount
  - Variance (red/green based on over/under)
  - Usage percentage
  - Allocation percentage (purple text)
- **Progress Bar:** Visual representation of budget usage
- **Status Messages:** Over budget warnings or no spending messages

### 3. Budget History Chart

**Component:** `BudgetHistoryChart`

**Display Type:** Line Chart

**Content:**
- **Title:** "Budget Adherence Over Time (6 Months)"
- **Data Series:**
  - Total Budgeted (purple line)
  - Total Actual Spending (green line)
- **Features:** Same as main analytics budget chart

### 4. Savings Projection Chart

**Display Type:** Area Chart

**Content:**
- **Title:** "6-Month Savings Projection"
- **Data Series:**
  - Projected Savings (purple area)
- **Features:**
  - Tooltips with formatted currency values
  - Grid lines
  - Responsive design

---

## Financial Planning Tools

### 1. Runway Calculator

**Route:** `/finance/runway`

**Display Type:** Summary Cards + Line Chart

**Summary Cards:**
- **Current Balance:** Currency amount with dollar sign icon
- **Monthly Burn Rate:** Currency amount with trending down icon
- **Runway (Months):** Number or infinity symbol with calendar icon
- **Zero Date:** Date when balance reaches zero (if applicable)

**Runway Projection Chart:**
- **Title:** "12-Month Runway Projection"
- **Data Series:** Projected balance over time (green line)
- **Features:**
  - Reference line at zero (red dashed)
  - Color-coded dots (green for positive, red for negative)
  - Tooltips with formatted currency values

### 2. Purchase Impact Calculator

**Route:** `/budget/impact`

**Display Type:** Summary Cards + Area Chart

**Financial Reality Cards:**
- **Average Monthly Income:** Currency amount (green text)
- **Average Monthly Expenses:** Currency amount (red text)
- **Average Monthly Savings:** Currency amount (blue text)
- **Average Savings Rate:** Percentage

**Impact Summary:**
- Monthly cost
- Current vs new savings rate
- 12-month impact
- Payment schedule (for recurring purchases)

**Impact Chart:**
- **Title:** "12-Month Impact Projection"
- **Data Series:**
  - Without Purchase (purple area)
  - With Purchase (green area)
- **Features:** Tooltips with formatted currency values

**Actionable Insights:**
- Warning messages about impact on savings
- Recommendations based on spending patterns
- Color-coded alerts (red for danger, yellow for warning, blue for info)

### 3. Location Comparison

**Route:** `/finance/location-comparison`

**Display Type:** Multiple Bar Charts

**Tax Visualization:**
- **Tax Breakdown Comparison:** Stacked bar chart showing federal tax, state tax, and take-home pay
- **Effective Tax Rate Comparison:** Bar chart showing effective tax rates by location

**Cost of Living Analysis:**
- **Monthly Housing Cost Comparison:** Bar chart showing housing and utilities costs
- **Savings Rate Comparison:** Bar chart showing savings rates by location

**Features:**
- Interactive income slider
- Tooltips with formatted currency values and percentages
- Color-coded bars for different expense types

---

## Analytics Filters

**Component:** `AnalyticsFilters`

**Display Type:** Interactive Controls

**Content:**
- Date range pickers (from/to)
- Account selector dropdown
- Category selector dropdown
- Group by options (month/week/day)
- Toggle for including statistics
- Toggle for comparing to previous period
- Chart type selector (area/bar)

---

## Data States and Error Handling

All analytics components handle the following states:

1. **Loading State:** Skeleton placeholders or spinners with loading messages
2. **Error State:** Error messages with details when available
3. **Empty State:** Messages indicating no data available for the selected period
4. **Disabled State:** Messages when features are disabled or unavailable

## Currency and Number Formatting

- All currency values use the `formatCurrency` utility function
- Percentages are displayed with appropriate decimal places
- Large numbers use k/m suffixes where appropriate
- Negative values are color-coded (red) and positive values (green)

## Responsive Design

- Desktop: Full tables and detailed layouts
- Mobile: Card-based layouts and simplified views
- Charts: Responsive containers that adapt to screen size
- Navigation: Touch-friendly interactions on mobile devices

## Interactive Features

- Clickable rows/cards linking to detailed views
- Hover states for better UX
- Keyboard navigation support
- Tooltips on charts and interactive elements
- Real-time filtering and data updates 
