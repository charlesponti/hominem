import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import React, { useState } from "react";

const WeightGoalCalculator = () => {
	const [startWeight, setStartWeight] = useState("");
	const [goalWeight, setGoalWeight] = useState("");
	const [targetDate, setTargetDate] = useState("");
	const [result, setResult] = useState(null);
	const [error, setError] = useState("");

	// Function to calculate days between two dates
	const calculateDaysDifference = (date1Str, date2Str) => {
		const date1 = new Date(date1Str);
		const date2 = new Date(date2Str);
		const diffTime = Math.abs(date2 - date1);
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	};

	// Get today's date in YYYY-MM-DD format for min attribute
	const getTodayString = () => {
		const today = new Date();
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, "0");
		const day = String(today.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	};

	// Format date as MM/DD/YYYY
	const formatDate = (dateStr) => {
		const date = new Date(dateStr);
		return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
	};

	// Calculate date after adding days to a date
	const addDaysToDate = (dateStr, days) => {
		const date = new Date(dateStr);
		date.setDate(date.getDate() + days);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	};

	const calculateGoal = () => {
		// Clear previous results
		setError("");
		setResult(null);

		// Validate inputs
		if (!startWeight || !goalWeight || !targetDate) {
			setError("Please fill in all fields");
			return;
		}

		const startWeightNum = parseFloat(startWeight);
		const goalWeightNum = parseFloat(goalWeight);

		if (isNaN(startWeightNum) || isNaN(goalWeightNum)) {
			setError("Please enter valid numbers for weights");
			return;
		}

		if (goalWeightNum >= startWeightNum) {
			setError("Goal weight must be less than starting weight for weight loss");
			return;
		}

		const today = getTodayString();
		const daysUntilTarget = calculateDaysDifference(today, targetDate);

		if (daysUntilTarget <= 0) {
			setError("Target date must be in the future");
			return;
		}

		// Calculate weight to lose
		const poundsToLose = startWeightNum - goalWeightNum;

		// Calculate daily calorie deficit (3500 calories = 1 pound of fat)
		const totalCaloriesToBurn = poundsToLose * 3500;
		const dailyCaloriesToBurn = Math.round(
			totalCaloriesToBurn / daysUntilTarget,
		);

		// Calculate date with fixed 1700 calorie deficit
		const daysWithFixedDeficit = Math.ceil(totalCaloriesToBurn / 1700);
		const dateWithFixedDeficit = addDaysToDate(today, daysWithFixedDeficit);

		// Check if the goal is healthy (no more than 2 pounds per week is generally recommended)
		const maxHealthyWeeklyLoss = 2;
		const maxHealthyDailyCalorieDeficit = (maxHealthyWeeklyLoss * 3500) / 7;
		const isHealthyRate = dailyCaloriesToBurn <= maxHealthyDailyCalorieDeficit;

		setResult({
			poundsToLose,
			daysUntilTarget,
			dailyCaloriesToBurn,
			isHealthyRate,
			dateWithFixedDeficit,
			daysWithFixedDeficit,
		});
	};

	return (
		<Card className="w-full max-w-md mx-auto">
			<CardHeader>
				<CardTitle>Weight Loss Goal Calculator</CardTitle>
				<CardDescription>
					Calculate your daily calorie deficit to reach your target weight
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="startWeight">Current Weight (lbs)</Label>
					<Input
						id="startWeight"
						type="number"
						min="0"
						placeholder="Enter your current weight"
						value={startWeight}
						onChange={(e) => setStartWeight(e.target.value)}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="goalWeight">Goal Weight (lbs)</Label>
					<Input
						id="goalWeight"
						type="number"
						min="0"
						placeholder="Enter your target weight"
						value={goalWeight}
						onChange={(e) => setGoalWeight(e.target.value)}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="targetDate">Target Date</Label>
					<Input
						id="targetDate"
						type="date"
						min={getTodayString()}
						value={targetDate}
						onChange={(e) => setTargetDate(e.target.value)}
					/>
				</div>

				{error && (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertTitle>Error</AlertTitle>
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				{result && (
					<div className="space-y-4 mt-4">
						<Alert>
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>Your Goal Summary</AlertTitle>
							<AlertDescription className="mt-2">
								<ul className="list-disc pl-4 space-y-1">
									<li>
										Weight to lose:{" "}
										<strong>{result.poundsToLose.toFixed(1)} lbs</strong>
									</li>
									<li>
										Time frame: <strong>{result.daysUntilTarget} days</strong>
									</li>
									<li>
										Required daily calorie deficit:{" "}
										<strong>{result.dailyCaloriesToBurn} calories</strong>
									</li>
									<li>
										With 1700 calorie daily deficit:{" "}
										<strong>{formatDate(result.dateWithFixedDeficit)}</strong> (
										{result.daysWithFixedDeficit} days)
									</li>
								</ul>
							</AlertDescription>
						</Alert>

						{!result.isHealthyRate && (
							<Alert variant="warning">
								<AlertCircle className="h-4 w-4" />
								<AlertTitle>Health Warning</AlertTitle>
								<AlertDescription>
									This goal requires losing more than 2 pounds per week, which
									may not be healthy. Consider extending your timeline or
									consulting a healthcare professional.
								</AlertDescription>
							</Alert>
						)}
					</div>
				)}
			</CardContent>
			<CardFooter>
				<Button onClick={calculateGoal} className="w-full">
					Calculate
				</Button>
			</CardFooter>
		</Card>
	);
};

export default WeightGoalCalculator;
