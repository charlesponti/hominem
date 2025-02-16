"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

const SalesTaxCalculator = () => {
	const [price, setPrice] = useState(100);
	const TAX_RATE = 0.0875; // 8.75% tax rate - you can adjust this as needed

	const salesTax = price * TAX_RATE;
	const total = price + salesTax;

	const handleSliderChange = (value: number[]) => {
		setPrice(value[0]);
	};

	return (
		<Card className="w-full max-w-md">
			<CardHeader>
				<CardTitle>Sales Tax Calculator</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-6">
					<div>
						<label className="block text-sm font-medium mb-2" htmlFor="price">
							Price: ${price.toFixed(2)}
						</label>
						<Slider
							name="price"
							defaultValue={[price]}
							max={1000}
							step={1}
							onValueChange={handleSliderChange}
							className="w-full"
						/>
					</div>

					<div className="space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-gray-600">Base Price:</span>
							<span className="font-medium">${price.toFixed(2)}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-gray-600">
								Sales Tax ({(TAX_RATE * 100).toFixed(2)}%):
							</span>
							<span className="font-medium">${salesTax.toFixed(2)}</span>
						</div>
						<div className="h-px bg-gray-200 my-2" />
						<div className="flex justify-between font-medium">
							<span>Total:</span>
							<span>${total.toFixed(2)}</span>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

export default SalesTaxCalculator;
