import { getIdToken } from '../utils/auth';

// Get testimonials
export async function getTestimonials(approved = true, limit = 6) {
  try {
    const response = await fetch(`/api/testimonials?approved=${approved}&limitCount=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch testimonials');
    }
    
    const data = await response.json();
    return data.testimonials;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
}

// Submit a testimonial
export async function submitTestimonial(testimonialData) {
  try {
    const token = await getIdToken();
    
    const response = await fetch('/api/testimonials/submit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testimonialData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit testimonial');
    }
    
    return true;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
}

// Moderate a testimonial (admin only)
export async function moderateTestimonial(testimonialId, approved) {
  try {
    const token = await getIdToken();
    
    const response = await fetch('/api/testimonials/moderate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ testimonialId, approved })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to moderate testimonial');
    }
    
    return true;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
}

// Delete a testimonial (admin only)
export async function deleteTestimonial(testimonialId) {
  try {
    const token = await getIdToken();
    
    const response = await fetch(`/api/testimonials/${testimonialId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete testimonial');
    }
    
    return true;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
} 