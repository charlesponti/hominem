"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { parseNoteDetails, type NoteDetails } from "@ponti/utils/notes";
import { Calendar, Hash, Tag } from "lucide-react";
import { useState, type ChangeEvent } from "react";

const SmartTaskInput = () => {
	const [inputValue, setInputValue] = useState("");
	const [task, setTask] = useState<NoteDetails>({
		content: "",
		dates: [],
		category: [],
		labels: [],
	});

	const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setInputValue(value);
		setTask(parseNoteDetails(value));
	};

	const formatDate = (date: Date) => {
		if (!date) return "";
		return date.toLocaleDateString("en-US", {
			weekday: "long",
			month: "short",
			day: "numeric",
		});
	};

	return (
		<div className="flex flex-col items-center justify-center pt-4">
			<Card className="container max-w-2xl">
				<CardContent className="pt-6">
					<div className="space-y-4">
						<Input
							value={inputValue}
							onChange={handleInputChange}
							placeholder="Add task (try: Buy groceries next Friday #shopping @errands)"
							className="w-full text-lg"
						/>

						{task.content ||
						task.date_time ||
						task.category ||
						(task.labels && task.labels.length > 0) ? (
							<div className="space-y-3 p-4 bg-gray-50 rounded-lg">
								{task.content && (
									<div className="font-medium">{task.content}</div>
								)}

								<div className="flex flex-wrap gap-2">
									{task.date_time && (
										<Badge
											variant="outline"
											className="flex items-center gap-1"
										>
											<Calendar className="w-3 h-3" />
											{formatDate(new Date(task.date_time))}
										</Badge>
									)}

									{task.category && (
										<Badge
											variant="secondary"
											className="flex items-center gap-1"
										>
											<Hash className="w-3 h-3" />
											{task.category}
										</Badge>
									)}

									{task.labels?.map((label) => (
										<Badge key={label} className="flex items-center gap-1">
											<Tag className="w-3 h-3" />
											{label}
										</Badge>
									))}
								</div>
							</div>
						) : null}
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default SmartTaskInput;
