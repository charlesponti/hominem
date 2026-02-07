import { Card, CardContent, CardHeader, CardTitle } from '@hominem/ui/components/ui/card';
import { Building, Plane, Utensils } from 'lucide-react';

import { formatCurrency } from '~/lib/number.utils';

const DESTINATION = 'Tokyo, Japan';
const COSTS = {
  transportation: { flight: 500, localTransit: 100 },
  accommodation: { hotel: 800, taxes: 100 },
  food: { restaurants: 300, groceries: 100 },
};

const getTotalCost = (category: Category) => {
  return Object.values(category).reduce((acc, curr) => acc + curr, 0);
};

type Category = Record<string, number>;
const TravelCostCard = () => {
  const { transportation, accommodation, food } = COSTS;

  const getCategoryPercentage = (category: Category) => {
    const totalTrip =
      getTotalCost(transportation) + getTotalCost(accommodation) + getTotalCost(food);
    return ((getTotalCost(category) / totalTrip) * 100).toFixed(1);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">{DESTINATION} Travel Costs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {/* Transportation Section */}
          <div className="flex items-start space-x-4">
            <div className="p-2 border border-emphasis-highest">
              <Plane className="w-6 h-6 text-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Transportation</h3>
                <span className="text-sm text-muted-foreground">
                  {getCategoryPercentage(transportation)}% of total
                </span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Flights</span>
                  <span>{formatCurrency(transportation.flight)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Local Transit</span>
                  <span>{formatCurrency(transportation.localTransit)}</span>
                </div>
                <div className="flex justify-between font-semibold mt-1 pt-1 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(getTotalCost(transportation))}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Accommodation Section */}
          <div className="flex items-start space-x-4">
            <div className="p-2 border border-emphasis-high">
              <Building className="w-6 h-6 text-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Accommodation</h3>
                <span className="text-sm text-muted-foreground">
                  {getCategoryPercentage(accommodation)}% of total
                </span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Hotel</span>
                  <span>{formatCurrency(accommodation.hotel)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes & Fees</span>
                  <span>{formatCurrency(accommodation.taxes)}</span>
                </div>
                <div className="flex justify-between font-semibold mt-1 pt-1 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(getTotalCost(accommodation))}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Food Section */}
          <div className="flex items-start space-x-4">
            <div className="p-2 border border-emphasis-medium">
              <Utensils className="w-6 h-6 text-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Food</h3>
                <span className="text-sm text-muted-foreground">
                  {getCategoryPercentage(food)}% of total
                </span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Restaurants</span>
                  <span>{formatCurrency(food.restaurants)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Groceries</span>
                  <span>{formatCurrency(food.groceries)}</span>
                </div>
                <div className="flex justify-between font-semibold mt-1 pt-1 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(getTotalCost(food))}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Grand Total */}
          <div className="mt-4 pt-4 border-t-2">
            <div className="flex justify-between text-lg font-bold">
              <span>Total Trip Cost</span>
              <span>
                {formatCurrency(
                  getTotalCost(transportation) + getTotalCost(accommodation) + getTotalCost(food),
                )}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TravelCostCard;
