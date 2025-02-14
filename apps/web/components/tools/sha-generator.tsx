import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, RefreshCw, Key, Lock } from "lucide-react";
import type { CheckedState } from "@radix-ui/react-checkbox";

const HashGenerator = () => {
	const [input, setInput] = useState("");
	const [hash, setHash] = useState("");
	const [treatLines, setTreatLines] = useState<CheckedState>(false);
	const [lowercase, setLowercase] = useState<CheckedState>(false);
	const [notification, setNotification] = useState("");

	// Show notification for 3 seconds
	const showNotification = (message: string) => {
		setNotification(message);
		setTimeout(() => setNotification(""), 3000);
	};

	// Mock hash generation - in a real app, you'd use a crypto library
	const generateHash = (type: string) => {
		if (!input) {
			showNotification("Please enter some text to generate a hash");
			return;
		}
		// This is just a mock implementation
		const mockHash = Array.from(Array(64), () =>
			Math.floor(Math.random() * 16).toString(16),
		).join("");
		setHash(lowercase ? mockHash.toLowerCase() : mockHash);
	};

	const copyToClipboard = async () => {
		if (hash) {
			await navigator.clipboard.writeText(hash);
			showNotification("Hash copied to clipboard");
		}
	};

	const clearAll = () => {
		setInput("");
		setHash("");
	};

	return (
		<Card className="w-full max-w-2xl mx-auto">
			<CardHeader className="space-y-1">
				<CardTitle className="text-2xl font-bold text-center">
					SHA256 Hash Generator
				</CardTitle>
				<p className="text-gray-500 dark:text-gray-400 text-center">
					Generate secure SHA256 hashes from any text input
				</p>
			</CardHeader>
			<CardContent className="space-y-4">
				{notification && (
					<div className="bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 p-3 rounded-md text-sm">
						{notification}
					</div>
				)}

				<Textarea
					placeholder="Enter your text here..."
					value={input}
					onChange={(e) => setInput(e.target.value)}
					className="min-h-[200px] font-mono"
				/>

				<div className="flex flex-col sm:flex-row gap-2 justify-between">
					<div className="flex items-center space-x-2">
						<Checkbox
							id="treatLines"
							checked={treatLines}
							onCheckedChange={setTreatLines}
						/>
						<label htmlFor="treatLines" className="text-sm">
							Treat each line as separate
						</label>
					</div>
					<div className="flex items-center space-x-2">
						<Checkbox
							id="lowercase"
							checked={lowercase}
							onCheckedChange={setLowercase}
						/>
						<label htmlFor="lowercase" className="text-sm">
							Lowercase hash(es)
						</label>
					</div>
				</div>

				<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
					<Button onClick={() => generateHash("sha256")} className="w-full">
						<Lock className="w-4 h-4 mr-2" />
						Generate
					</Button>
					<Button onClick={clearAll} variant="outline" className="w-full">
						<RefreshCw className="w-4 h-4 mr-2" />
						Clear All
					</Button>
					<Button
						onClick={() => generateHash("password")}
						variant="secondary"
						className="w-full col-span-2 sm:col-span-1"
					>
						<Key className="w-4 h-4 mr-2" />
						Password Generator
					</Button>
				</div>

				{hash && (
					<div className="mt-4 space-y-2">
						<div className="text-sm font-medium">Generated Hash:</div>
						<div className="relative">
							<div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-sm break-all">
								{hash}
							</div>
							<Button
								size="icon"
								variant="ghost"
								className="absolute top-2 right-2"
								onClick={copyToClipboard}
							>
								<Copy className="w-4 h-4" />
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
};

export default HashGenerator;
