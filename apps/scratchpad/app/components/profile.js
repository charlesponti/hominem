"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Profile = Profile;
var auth_context_1 = require("app/lib/supabase/auth-context");
function Profile() {
    var _a = (0, auth_context_1.useAuth)(), user = _a.user, logout = _a.logout, isLoading = _a.isLoading;
    if (isLoading) {
        return <div className="loading">Loading user data...</div>;
    }
    if (!user) {
        return <div className="error-message">Not authenticated</div>;
    }
    return (<div className="profile-container">
      <h2>User Profile</h2>
      <div className="profile-info">
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <p>
          <strong>User ID:</strong> {user.id}
        </p>
        <p>
          <strong>Last Sign In:</strong> {new Date(user.last_sign_in_at || '').toLocaleString()}
        </p>
      </div>

      <button type="button" className="logout-button" onClick={function () { return logout(); }} disabled={isLoading}>
        Logout
      </button>
    </div>);
}
