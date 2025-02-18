"use client";

import {
	CategoryScale,
	Chart as ChartJS,
	Legend,
	LineElement,
	LinearScale,
	PointElement,
	Title,
	Tooltip,
} from "chart.js";
import { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";

ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
);

interface PlannedPurchase {
	description: string;
	amount: number;
	date: string;
}

export default function RunwayPage() {
	const [initialBalance, setInitialBalance] = useState(0);
	const [monthlyExpenses, setMonthlyExpenses] = useState(0);
	const [plannedPurchases, setPlannedPurchases] = useState<PlannedPurchase[]>(
		[],
	);
	const [newPurchase, setNewPurchase] = useState<PlannedPurchase>({
		description: "",
		amount: 0,
		date: "",
	});

	const chartData = useMemo(() => {
		const today = new Date();
		const dates = Array.from({ length: 12 }, (_, i) => {
			const date = new Date(today);
			date.setMonth(today.getMonth() + i);
			return date.toLocaleDateString("en-US", {
				month: "short",
				year: "numeric",
			});
		});

		let balance = initialBalance;
		const balances = dates.map((date) => {
			balance -= monthlyExpenses;
			for (const purchase of plannedPurchases) {
				const purchaseDate = new Date(purchase.date);
				const currentDate = new Date(date);
				if (
					purchaseDate.getMonth() === currentDate.getMonth() &&
					purchaseDate.getFullYear() === currentDate.getFullYear()
				) {
					balance -= purchase.amount;
				}
			}
			return balance;
		});

		return {
			labels: dates,
			datasets: [
				{
					label: "Projected Balance",
					data: balances,
					borderColor: "rgb(75, 192, 192)",
					tension: 0.1,
				},
			],
		};
	}, [initialBalance, monthlyExpenses, plannedPurchases]);

	const handleAddPurchase = () => {
		setPlannedPurchases([...plannedPurchases, newPurchase]);
		setNewPurchase({ description: "", amount: 0, date: "" });
	};

	return (
		<div className="p-6 max-w-4xl mx-auto">
			<h1 className="text-2xl font-bold mb-6">Financial Runway Calculator</h1>

			<div className="grid grid-cols-2 gap-6 mb-8">
				<div>
					<label htmlFor="initialBalance" className="block mb-2">
						Initial Balance ($)
					</label>
					<input
						type="number"
						id="initialBalance"
						name="initialBalance"
						value={initialBalance}
						onChange={(e) => setInitialBalance(Number(e.target.value))}
						className="w-full p-2 border rounded"
					/>
				</div>
				<div>
					<label htmlFor="monthlyExpenses" className="block mb-2">
						Monthly Expenses ($)
					</label>
					<input
						type="number"
						id="monthlyExpenses"
						name="monthlyExpenses"
						value={monthlyExpenses}
						onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
						className="w-full p-2 border rounded"
					/>
				</div>
			</div>

			<div className="mb-8">
				<h2 className="text-xl font-semibold mb-4">Planned Purchases</h2>
				<div className="grid grid-cols-3 gap-4 mb-4">
					<input
						placeholder="Description"
						value={newPurchase.description}
						onChange={(e) =>
							setNewPurchase({ ...newPurchase, description: e.target.value })
						}
						className="p-2 border rounded"
					/>
					<input
						type="number"
						placeholder="Amount"
						value={newPurchase.amount}
						onChange={(e) =>
							setNewPurchase({ ...newPurchase, amount: Number(e.target.value) })
						}
						className="p-2 border rounded"
					/>
					<input
						type="date"
						value={newPurchase.date}
						onChange={(e) =>
							setNewPurchase({ ...newPurchase, date: e.target.value })
						}
						className="p-2 border rounded"
					/>
				</div>
				<button
					type="button"
					onClick={handleAddPurchase}
					className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
				>
					Add Purchase
				</button>

				<ul className="mt-4 space-y-2">
					{plannedPurchases.map((purchase) => (
						<li
							key={crypto.getRandomValues(new Uint32Array(1))[0]}
							className="flex justify-between items-center bg-gray-50 p-2 rounded"
						>
							<span>{purchase.description}</span>
							<span>
								${purchase.amount} on{" "}
								{new Date(purchase.date).toLocaleDateString()}
							</span>
						</li>
					))}
				</ul>
			</div>

			<div className="h-[400px]">
				<Line data={chartData} options={{ maintainAspectRatio: false }} />
			</div>
		</div>
	);
}
