import type { HominemUser } from '@hominem/auth/types';

import { useAuthContext } from '@hominem/auth';

interface ProfileProps {
  user: HominemUser;
}

export function Profile({ user }: ProfileProps) {
  const { authClient } = useAuthContext();

  const handleLogout = async () => {
    try {
      const { error } = await authClient.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="profile-container">
      <h2>User Profile</h2>
      <div className="profile-info">
        <p>
          <strong>Email:</strong> {user.email || 'No email'}
        </p>
        <p>
          <strong>User ID:</strong> {user.id}
        </p>
      </div>

      <button type="button" className="logout-button" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}
