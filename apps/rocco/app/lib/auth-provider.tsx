import type { Session, User } from "@supabase/supabase-js";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { createClient } from "./supabase/client";

interface AuthContextType {
	user: User | null;
	session: Session | null;
	isLoading: boolean;
	isSignedIn: boolean;
	signInWithPassword: ReturnType<
		typeof createClient
	>["auth"]["signInWithPassword"];
	signUp: ReturnType<typeof createClient>["auth"]["signUp"];
	signOut: ReturnType<typeof createClient>["auth"]["signOut"];
	signInWithOAuth: ReturnType<typeof createClient>["auth"]["signInWithOAuth"];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<User | null>(null);
	const [session, setSession] = useState<Session | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const supabase = createClient();

	const getUser = useCallback(async () => {
		const {
			data: { user: currentUser },
			error,
		} = await supabase.auth.getUser();
		return { user: currentUser, error };
	}, [supabase.auth]);

	useEffect(() => {
		setIsLoading(true);

		// Get initial authenticated user
		getUser().then(({ user: currentUser }) => {
			setUser(currentUser);
			// Get session for access token after user verification
			if (currentUser) {
				supabase.auth
					.getSession()
					.then(({ data: { session: currentSession } }) => {
						setSession(currentSession);
					});
			}
			setIsLoading(false);
		});

		// Listen for auth changes
		const { data: authListener } = supabase.auth.onAuthStateChange(
			async (_event, newSession) => {
				// Verify the user data by calling getUser
				if (newSession?.user) {
					const {
						data: { user: verifiedUser },
					} = await supabase.auth.getUser();
					setUser(verifiedUser);
					setSession(newSession);
				} else {
					setUser(null);
					setSession(null);
				}
				setIsLoading(false);
			},
		);

		return () => {
			authListener?.subscription.unsubscribe();
		};
	}, [getUser, supabase.auth]);

	const value = {
		user,
		session,
		isLoading,
		isSignedIn: !!user,
		signInWithPassword: supabase.auth.signInWithPassword,
		signUp: supabase.auth.signUp,
		signOut: supabase.auth.signOut,
		signInWithOAuth: supabase.auth.signInWithOAuth,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};

// Convenience hooks for compatibility with existing code
export const useUser = () => {
	const { user, isLoading } = useAuth();
	return {
		user: user
			? {
					id: user.id,
					email: user.email,
					fullName: user.user_metadata?.full_name || user.user_metadata?.name,
					firstName: user.user_metadata?.first_name,
					lastName: user.user_metadata?.last_name,
					primaryEmailAddress: { emailAddress: user.email },
					imageUrl: user.user_metadata?.avatar_url,
				}
			: null,
		isLoaded: !isLoading,
	};
};
