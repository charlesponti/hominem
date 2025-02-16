"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useMutation } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";

export default function WordToolPage() {
	const [word, setWord] = useState("");
	const [sentence, setSentence] = useState("");

	const mutation = useMutation({
		mutationFn: async ({
			action,
			sentence,
			word,
		}: {
			action: string;
			sentence?: string;
			word: string;
		}) => {
			const response = await fetch("/api/writer", {
				method: "POST",
				body: JSON.stringify({ action, sentence, word }),
			});

			return response.json();
		},
	});

	return (
		<div className="container mx-auto p-6 space-y-6">
			<h1 className="text-3xl font-bold">Word Tool</h1>
			<Input
				className="max-w-md"
				placeholder="Enter a word"
				value={word}
				onChange={(e) => setWord(e.target.value)}
			/>

			<Tabs defaultValue="describe" className="max-w-2xl">
				<TabsList>
					<TabsTrigger value="describe">Describe Word</TabsTrigger>
					<TabsTrigger value="rewrite">Rewrite Sentence</TabsTrigger>
				</TabsList>

				<TabsContent value="describe" className="space-y-4">
					<button
						type="button"
						className="btn btn-primary"
						onClick={() => mutation.mutate({ word, action: "describe_word" })}
						disabled={!word || mutation.isPending}
					>
						Get Description
					</button>
					{mutation.data && <p className="mt-4">{mutation.data.result}</p>}
				</TabsContent>

				<TabsContent value="rewrite" className="space-y-4">
					<Textarea
						placeholder="Enter sentence to rewrite"
						value={sentence}
						onChange={(e) => setSentence(e.target.value)}
					/>
					<Button
						onClick={() =>
							mutation.mutate({ sentence, word, action: "rewrite" })
						}
						disabled={!word || !sentence || mutation.isPending}
					>
						Rewrite Sentence
					</Button>
					{mutation.data?.result && (
						<p className="mt-4">{mutation.data.result}</p>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
