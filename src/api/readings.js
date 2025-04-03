import { getIdToken } from '../utils/auth';

// Get readings for astrologer
export async function getAstrologerReadings() {
  try {
    const token = await getIdToken();
    
    const response = await fetch('/api/readings/astrologer', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch readings');
    }
    
    const data = await response.json();
    return data.readings;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
} 