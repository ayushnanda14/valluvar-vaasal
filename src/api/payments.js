import { getIdToken } from '../utils/auth';

// Get payments for astrologer
export async function getAstrologerPayments() {
  try {
    const token = await getIdToken();
    
    const response = await fetch('/api/payments/astrologer', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch payments');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
}

// Get all payments (admin only)
export async function getAllPayments() {
  try {
    const token = await getIdToken();
    
    const response = await fetch('/api/payments', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch payments');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
} 