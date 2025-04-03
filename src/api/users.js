import { getIdToken } from '../utils/auth';

// Get all users (admin only)
export async function getAllUsers() {
  try {
    const token = await getIdToken();
    
    const response = await fetch('/api/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch users');
    }
    
    const data = await response.json();
    return data.users;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
}

// Update user roles (admin only)
export async function updateUserRoles(userId, roles) {
  try {
    const token = await getIdToken();
    
    const response = await fetch('/api/users/roles', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId, roles })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update user roles');
    }
    
    return true;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
}

// Get all astrologers
export async function getAstrologers() {
  try {
    const token = await getIdToken();
    
    const response = await fetch('/api/astrologers', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch astrologers');
    }
    
    const data = await response.json();
    return data.astrologers;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
} 