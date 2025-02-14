"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTasks } from "@/lib/hooks/use-tasks";
import { TaskSchema } from "@/lib/tasks/types";
import { ListChecks, StopCircle, Timer } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

const TaskTimerApp = () => {
	const [currentTask, setCurrentTask] = useState("");
	const [error, setError] = useState<string | null>(null);
	const { tasks, createTask, startTask, stopTask } = useTasks();

	const onStartTask = () => {
		if (currentTask.trim()) {
			try {
				const newTask = TaskSchema.parse({
					id: crypto.randomUUID(),
					title: currentTask,
					startTime: new Date(),
					duration: 0,
					isActive: true,
				});

				createTask(newTask);
				setCurrentTask("");
				setError(null);
			} catch (err) {
				setError("Invalid task data");
				console.error("Validation error:", err);
			}
		}
	};

	const onStopTask = useCallback(
		(taskId: string) => {
			try {
				stopTask({ taskId });
				setError(null);
			} catch (err) {
				setError("Failed to stop timer");
				console.error("Validation error:", err);
			}
		},
		[stopTask],
	);

	const formatTime = (seconds: number) => {
		const hrs = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	};

	return (
		<div className="container mx-auto p-4 max-w-2xl">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Timer /> Task Timer Tracker
					</CardTitle>
					{error && <div className="text-red-500 text-sm">{error}</div>}
				</CardHeader>
				<CardContent>
					<div className="flex space-x-2 mb-12 pb-8 border-b-gray-200 border-b">
						<Input
							value={currentTask}
							onChange={(e) => setCurrentTask(e.target.value)}
							placeholder="Enter task name"
						/>
						<Button onClick={onStartTask} disabled={!currentTask.trim()}>
							Start Task
						</Button>
					</div>

					<div className="space-y-4">
						<h2 className="flex items-center gap-2 text-lg">
							<ListChecks /> Task History
						</h2>
						<div className="space-y-2">
							{tasks.map((task) => (
								<div
									key={task.id}
									className="flex justify-between items-center border p-2 rounded"
								>
									<div className="grow">
										<div className="font-medium">{task.title}</div>
										<div className="text-sm text-gray-500">
											Started: {task.startTime.toLocaleString()}
										</div>
									</div>
									{task.isActive ? (
										<div className="flex items-center space-x-2">
											<div className="font-light text-sm">
												<TaskElapseTimer startTime={task.startTime} />
											</div>

											<Button
												variant="destructive"
												size="sm"
												className="flex items-center gap-2"
												onClick={() => onStopTask(task.id)}
											>
												<StopCircle /> Stop
											</Button>
										</div>
									) : (
										<Button
											variant="secondary"
											size="sm"
											className="flex items-center gap-2"
											onClick={() => startTask({ taskId: task.id })}
										>
											<Timer /> Start
										</Button>
									)}
								</div>
							))}
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default TaskTimerApp;

const getElapsedTime = (startTime: Date, unit: "seconds" | "minutes") => {
	let value = 0;

	switch (unit) {
		case "seconds":
			value = Math.floor((Date.now() - startTime.getTime()) / 1000);
			break;
		default:
			value = Math.floor((Date.now() - startTime.getTime()) / 1000) / 60;
			break;
	}

	// Return value to 2 decimal places
	return value.toFixed(2);
};

function TaskElapseTimer({ startTime }: { startTime: Date }) {
	const [elapsedTime, setElapsedTime] = useState(
		getElapsedTime(startTime, "minutes"),
	);

	useEffect(() => {
		const interval = setInterval(() => {
			setElapsedTime(getElapsedTime(startTime, "minutes"));
		}, 1000);

		return () => clearInterval(interval);
	}, [startTime]);

	return <div>{elapsedTime} seconds</div>;
}
