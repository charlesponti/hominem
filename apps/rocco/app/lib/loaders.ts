/**
 * Type definitions for loader/action arguments
 */
export interface LoaderArgs {
	params: Record<string, string>;
	request: Request;
}

/**
 * Error response for data loaders
 */
export class LoaderError extends Error {
	status: number;

	constructor(message: string, status = 400) {
		super(message);
		this.status = status;
	}
}

/**
 * Helper to handle async loader errors
 */
export async function handleLoaderData<T>(
	promise: Promise<T>,
	errorMessage = "Failed to load data",
): Promise<T> {
	try {
		return await promise;
	} catch (error) {
		console.error("Loader error:", error);
		throw new LoaderError(errorMessage);
	}
}
