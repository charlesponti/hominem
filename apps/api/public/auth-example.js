// Example of using Clerk authentication with the API

// In your client-side JavaScript/TypeScript

/**
 * Makes an authenticated API request using Clerk
 * @param {string} endpoint - API endpoint to call
 * @param {object} options - Fetch options
 * @returns {Promise<any>} Response data
 */
async function callAuthenticatedApi(endpoint, options = {}) {
  // Get the JWT token from Clerk
  const token = await window.Clerk.session.getToken();
  
  // Make the API request with the token
  const response = await fetch(`https://api.example.com${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  return response.json();
}

// Example usage
async function getUserProfile() {
  try {
    const userData = await callAuthenticatedApi('/me');
    console.log('User data:', userData);
    return userData;
  } catch (error) {
    console.error('Failed to get user profile:', error);
    return null;
  }
}

// Sample usage in your app
// getUserProfile().then(user => {
//   if (user) {
//     // Update UI with user data
//   } else {
//     // Handle authentication error
//   }
// });