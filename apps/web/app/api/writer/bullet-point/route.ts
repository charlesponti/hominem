import { enhanceBulletPoint } from "@ponti/utils/writer";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
	try {
		const { content } = await req.json();

		if (!content) {
			return NextResponse.json(
				{ error: "Content is required" },
				{ status: 400 },
			);
		}

		const noteDetails = await enhanceBulletPoint(content);
		return NextResponse.json(noteDetails, { status: 201 });
	} catch (error) {
		console.error("Error in bullet-point API:", error);
		return NextResponse.json(
			{ error: "Failed to process bullet point" },
			{ status: 500 },
		);
	}
}

// Optionally add OPTIONS handler if you need CORS
export async function OPTIONS() {
	return new Response(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST",
			"Access-Control-Allow-Headers": "Content-Type",
		},
	});
}
