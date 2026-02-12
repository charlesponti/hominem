import { useSupabaseAuthContext } from '@hominem/auth';
import { Button } from '@hominem/ui/button';
import { Plus, User } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router';

import { ChatList } from '~/components/chat/ChatList';
import { cn } from '~/lib/utils';

interface ChatSidebarProps {
  userId?: string;
  onNewChat?: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

export function ChatSidebar({ userId, onNewChat, isMobile = false, onClose }: ChatSidebarProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const { signIn } = useSupabaseAuthContext();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const isLoggedIn = !!userId;

  const handleNewChatClick = useCallback(() => {
    if (onNewChat) {
      onNewChat();
    } else {
      navigate('/chat');
    }
    if (isMobile && onClose) {
      onClose();
    }
  }, [onNewChat, navigate, isMobile, onClose]);

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signIn();
    } catch (error) {
      console.error('Sign in failed:', error);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleNavigation = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <div className="flex flex-col h-full bg-muted/10">
      {/* Header with Logo */}
      <div className="p-4 border-b shrink-0">
        <RouterLink
          to="/chat"
          className="flex items-center space-x-2 mb-4"
          onClick={handleNavigation}
        >
          <span className="text-2xl">💬</span>
          <span className="font-bold text-lg">AI Assistant</span>
        </RouterLink>

        {isLoggedIn && (
          <Button
            onClick={handleNewChatClick}
            className="w-full justify-start gap-2"
            variant="outline"
          >
            <Plus className="size-4" />
            New Chat
          </Button>
        )}
      </div>

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Chat functionality - only show if logged in */}
        {isLoggedIn && userId && (
          <ChatList userId={userId} onChatSelect={handleNavigation} showSearch={true} />
        )}

        {/* Unauthenticated state - show navigation links */}
        {!isLoggedIn && (
          <div className="flex-1 p-4">
            <nav className="space-y-2">
              <RouterLink
                to="/"
                className={cn(
                  'block p-2 text-sm font-medium hover:bg-muted/50',
                  pathname === '/' ? 'bg-muted text-foreground' : 'text-muted-foreground',
                )}
                onClick={handleNavigation}
              >
                Home
              </RouterLink>
            </nav>
          </div>
        )}
      </div>

      {/* Bottom Profile Section - Fixed */}
      <div className="p-4 border-t shrink-0">
        {isLoggedIn ? (
          <RouterLink
            to="/account"
            className="flex items-center gap-2 p-2 hover:bg-muted/50"
            onClick={handleNavigation}
          >
            <User className="size-5" />
            <span className="text-sm font-medium">Account</span>
          </RouterLink>
        ) : (
          <Button onClick={handleSignIn} disabled={isSigningIn} className="w-full">
            {isSigningIn ? 'Signing in...' : 'Sign In'}
          </Button>
        )}
      </div>
    </div>
  );
}
