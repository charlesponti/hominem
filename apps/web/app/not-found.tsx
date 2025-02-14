import React from "react";
import { Home } from "lucide-react";
import Link from "next/link";
import "./animations.css"; // Import CSS animations
import { BackgroundElements } from "@/components/404-background-elements";

const NotFound = () => {
	return (
		<div className="w-full min-h-screen bg-gradient-to-b from-white to-pink-50 flex flex-col items-center justify-center p-4">
			{/* Main content container with fade-in/up animation */}
			<div className="text-center animate-fadeInUp">
				{/* Large 404 with continuous bounce animation */}
				<h1 className="text-8xl font-bold text-primary mb-4 animate-bounce">
					404
				</h1>

				{/* Funny message */}
				<h2 className="text-2xl font-semibold text-gray-700 mb-6">
					Oops! Looks like this page took a vacation 🏖️
				</h2>

				{/* Witty subtext */}
				<p className="text-gray-600 mb-8 max-w-md mx-auto">
					We searched high and low, through digital mountains and cyber valleys,
					but this page seems to have gone on an adventure without us!
				</p>

				{/* Home button with hover effect */}
				<Link
					href="/"
					className="inline-flex items-center px-6 py-3 bg-pink-600 text-white rounded-lg transition-all duration-300 hover:bg-purple-700 hover:shadow-lg transform hover:-translate-y-1"
				>
					<Home className="mr-2 h-5 w-5" />
					Take Me Home
				</Link>
			</div>
			{/* Background decorative elements */}
			<BackgroundElements />
		</div>
	);
};

export default NotFound;
