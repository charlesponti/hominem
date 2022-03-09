const budget = {
  types: [
    { name: "fixed", amount: 0.5 },
    { name: "flexible", amount: 0.3 },
    { name: "goals", amount: 0.2 }
  ],
  categories: {
    Housing: { amount: 0.3, type: "fixed" },
    "Living Expenses": {
      amount: 0.1,
      type: "fixed",
      includes: ["electricity"]
    },
    Food: {
      amount: 0.1,
      type: "fixed",
      includes: ["groceries", "dining out"]
    },
    Savings: { amount: 0.2, type: "goals" },
    Debt: { amount: 0.1, type: "goals" },
    Transportation: { amount: 0.05, type: "fixed" },
    Personal: { amount: 0.15, type: "flexible" }
  }
};

/**
 * # 'One Number' Budget
 *
 * Calculate the weekly flexible spending budget. This done
 * by subtracting monthly fixed costs from  monthly income
 * and dividing the remainder by 4.3.
 *
 * NOTE: 4.3 is used instead of 4 to account for months with 5 weeks.
 *
 * @param {number} monthlyIncome
 * @param {number} fixedCosts
 * @return {number}
 */
const flex = function getFlexBudget(monthlyIncome, fixedCosts) {
  return (monthlyIncome - fixedCosts) / 4.3;
};

module.exports = {
    types: [
        budget,
        flex
    ],
    categories
}