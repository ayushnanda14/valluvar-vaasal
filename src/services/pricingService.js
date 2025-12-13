import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

// Default pricing config (fallback if Firestore config not available)
const DEFAULT_PRICING_CONFIG = {
  pothigai: {
    name: 'Pothigai',
    basePrice: 85,
    gst: 15,
    totalPrice: 100,
    chatDurationHours: 24,
    availabilityWindowHours: 24,
    phoneCallAvailable: false,
    videoCallAvailable: false
  },
  ganga: {
    name: 'Ganga',
    basePrice: 424,
    gst: 76,
    totalPrice: 500,
    chatDurationHours: 48,
    availabilityWindowHours: 48,
    phoneCallAvailable: false,
    videoCallAvailable: false
  },
  himalaya: {
    name: 'Himalaya',
    basePrice: 1695,
    gst: 305,
    totalPrice: 2000,
    chatDurationHours: 72,
    availabilityWindowHours: 72,
    phoneCallAvailable: false,
    videoCallAvailable: false
  }
};

// Cache for pricing config
let pricingConfigCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Load pricing configuration from Firestore
 * Falls back to default config if Firestore config is not available
 */
export async function getPricingConfig() {
  // Return cached config if still valid
  if (pricingConfigCache && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return pricingConfigCache;
  }

  try {
    const configDoc = await getDoc(doc(db, 'settings', 'pricingCategories'));
    
    if (configDoc.exists()) {
      const data = configDoc.data();
      pricingConfigCache = {
        pothigai: data.pothigai || DEFAULT_PRICING_CONFIG.pothigai,
        ganga: data.ganga || DEFAULT_PRICING_CONFIG.ganga,
        himalaya: data.himalaya || DEFAULT_PRICING_CONFIG.himalaya
      };
    } else {
      // Use default config if Firestore config doesn't exist
      pricingConfigCache = DEFAULT_PRICING_CONFIG;
    }
    
    cacheTimestamp = Date.now();
    return pricingConfigCache;
  } catch (error) {
    console.error('Error loading pricing config:', error);
    // Return default config on error
    return DEFAULT_PRICING_CONFIG;
  }
}

/**
 * Get a specific pricing plan by key
 */
export async function getPricingPlan(planKey) {
  const config = await getPricingConfig();
  return config[planKey] || null;
}

/**
 * Get all available pricing plans
 */
export async function getAllPricingPlans() {
  const config = await getPricingConfig();
  return [
    { key: 'pothigai', ...config.pothigai },
    { key: 'ganga', ...config.ganga },
    { key: 'himalaya', ...config.himalaya }
  ];
}

/**
 * Calculate total amount for a plan (including GST)
 */
export async function getPlanTotal(planKey) {
  const plan = await getPricingPlan(planKey);
  return plan ? plan.totalPrice : 0;
}

/**
 * Calculate base amount for a plan (excluding GST)
 */
export async function getPlanBase(planKey) {
  const plan = await getPricingPlan(planKey);
  return plan ? plan.basePrice : 0;
}

/**
 * Calculate GST for a plan
 */
export async function getPlanGST(planKey) {
  const plan = await getPricingPlan(planKey);
  return plan ? plan.gst : 0;
}


