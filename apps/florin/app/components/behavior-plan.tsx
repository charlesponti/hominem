import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useState } from "react";

const initialBehaviors = [
	{
		phase: "Social and Emotional Mastery",
		items: [
			{
				id: 1,
				title: "Initiating Conversations with Strangers",
				start: "Day 1",
				end: "Day 7",
				duration: 7,
			},
			{
				id: 2,
				title: "Public Speaking",
				start: "Day 8",
				end: "Day 14",
				duration: 7,
			},
			{
				id: 3,
				title: "Asking for Help or Favors",
				start: "Day 15",
				end: "Day 20",
				duration: 6,
			},
		],
	},
	{
		phase: "Professional and Persuasion Skills",
		items: [
			{
				id: 4,
				title: "Cold Calling/Selling",
				start: "Day 21",
				end: "Day 30",
				duration: 10,
			},
			{
				id: 5,
				title: "Negotiating",
				start: "Day 31",
				end: "Day 40",
				duration: 10,
			},
			{
				id: 6,
				title: "Giving and Receiving Honest Feedback",
				start: "Day 41",
				end: "Day 50",
				duration: 10,
			},
		],
	},
];

export default function App() {
	const [behaviors, setBehaviors] = useState(initialBehaviors);
	const [newBehavior, setNewBehavior] = useState({
		phase: "",
		title: "",
		start: "",
		end: "",
		duration: "",
	});

	const addBehavior = () => {
		if (!newBehavior.phase || !newBehavior.title) return;
		const updatedBehaviors = [...behaviors];
		const phaseIndex = updatedBehaviors.findIndex(
			(p) => p.phase === newBehavior.phase,
		);
		if (phaseIndex !== -1) {
			updatedBehaviors[phaseIndex].items.push({
				id: Date.now(),
				title: newBehavior.title,
				start: newBehavior.start,
				end: newBehavior.end,
				duration: Number.parseInt(newBehavior.duration),
			});
		} else {
			updatedBehaviors.push({
				phase: newBehavior.phase,
				items: [
					{
						id: Date.now(),
						title: newBehavior.title,
						start: newBehavior.start,
						end: newBehavior.end,
						duration: Number.parseInt(newBehavior.duration),
					},
				],
			});
		}
		setBehaviors(updatedBehaviors);
		setNewBehavior({ phase: "", title: "", start: "", end: "", duration: "" });
	};

	return (
		<div className="p-6 max-w-4xl mx-auto">
			<h1 className="text-3xl font-bold text-center mb-6">
				90-Day Behavioral Challenge
			</h1>
			<div className="mb-6">
				<Input
					placeholder="Phase"
					value={newBehavior.phase}
					onChange={(e) =>
						setNewBehavior({ ...newBehavior, phase: e.target.value })
					}
					className="mb-2"
				/>
				<Input
					placeholder="Title"
					value={newBehavior.title}
					onChange={(e) =>
						setNewBehavior({ ...newBehavior, title: e.target.value })
					}
					className="mb-2"
				/>
				<Input
					placeholder="Start Date"
					value={newBehavior.start}
					onChange={(e) =>
						setNewBehavior({ ...newBehavior, start: e.target.value })
					}
					className="mb-2"
				/>
				<Input
					placeholder="End Date"
					value={newBehavior.end}
					onChange={(e) =>
						setNewBehavior({ ...newBehavior, end: e.target.value })
					}
					className="mb-2"
				/>
				<Input
					placeholder="Duration"
					value={newBehavior.duration}
					onChange={(e) =>
						setNewBehavior({ ...newBehavior, duration: e.target.value })
					}
					className="mb-2"
				/>
				<Button onClick={addBehavior}>Add Behavior</Button>
			</div>
			{behaviors.map((phase, index) => (
				<div
					key={crypto.getRandomValues(new Uint32Array(1))[0]}
					className="mb-6"
				>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{phase.items.map((behavior) => (
							<motion.div
								key={behavior.id}
								whileHover={{ scale: 1.05 }}
								className="transition-transform"
							>
								<Card className="p-4 shadow-md rounded-lg border border-gray-200">
									<CardContent>
										<Badge className="mb-2">{phase.phase}</Badge>
										<h3 className="text-lg font-medium">{behavior.title}</h3>
										<p className="text-sm text-gray-600">
											{behavior.start} - {behavior.end}
										</p>
										<p className="text-sm text-gray-500">
											Duration: {behavior.duration} days
										</p>
									</CardContent>
								</Card>
							</motion.div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
