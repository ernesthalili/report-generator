const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// ============================================================================
// CONFIGURATION
// ============================================================================

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

// Rate limiting: 1 request per 2 seconds per user
const userRateLimits = new Map(); // userId -> { lastRequest: timestamp }
const RATE_LIMIT_WINDOW = 2000; // 2 seconds in milliseconds

// Simple in-memory cache: hash(text+action) -> enhanced text
const enhancementCache = new Map();
const CACHE_MAX_SIZE = 100;

// ============================================================================
// SENSITIVE DATA PATTERNS - Comprehensive regex patterns
// ============================================================================

const PATTERNS = {
  // IPv4: Standard format (e.g., 192.168.1.1)
  ipv4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
  
  // IPv6: Full and compressed formats
  ipv6: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|\b(?:[0-9a-fA-F]{1,4}:){1,7}:\b|\b::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}\b/g,
  
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // URLs: http, https, ftp
  url: /\b(?:https?|ftp):\/\/[^\s<>"{}|\\^`\[\]]+\b/g,
  
  // Credit card numbers (with or without spaces/dashes)
  creditCard: /\b(?:\d{4}[\s-]?){3}\d{4}\b/g,
  
  // Phone numbers (various formats)
  phone: /\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b/g,
  
  // Social Security Numbers (US format)
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  
  // API Keys and tokens (common patterns)
  apiKey: /\b(?:api[_-]?key|token|bearer|auth[_-]?token)[:\s=]+['\"]?([A-Za-z0-9_\-\.]+)['\"]?\b/gi,
  
  // AWS Access Keys
  awsAccessKey: /\b(AKIA[0-9A-Z]{16})\b/g,
  
  // AWS Secret Keys (40 chars base64)
  awsSecretKey: /\b([A-Za-z0-9/+=]{40})\b/g,
  
  // Private keys (PEM format start)
  privateKey: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC )?PRIVATE KEY-----/g,
  
  // Password patterns in text
  password: /\b(?:password|pwd|pass)[:\s=]+['\"]?([^\s'"<>]+)['\"]?\b/gi,
  
  // JWT tokens
  jwt: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
};

// ============================================================================
// MASKING FUNCTIONS
// ============================================================================

/**
 * Mask sensitive data in text and return both masked text and mapping
 * @param {string} text - Original text
 * @returns {Object} { maskedText, maskMap, detectedTypes }
 */
function maskSensitiveData(text) {
  if (!text || typeof text !== 'string') {
    return { maskedText: text, maskMap: {}, detectedTypes: [] };
  }

  let maskedText = text;
  const maskMap = {}; // token -> original value
  const detectedTypes = new Set();
  let tokenCounter = 0;

  // Process each pattern type
  Object.entries(PATTERNS).forEach(([type, pattern]) => {
    const matches = maskedText.match(pattern);
    
    if (matches && matches.length > 0) {
      detectedTypes.add(type);
      
      matches.forEach((match) => {
        // Create unique token for this match
        const token = `${type.toUpperCase()}_${tokenCounter}`;
        tokenCounter++;
        
        // Store mapping
        maskMap[token] = match;
        
        // Replace in text (escape special regex chars in match)
        const escapedMatch = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        maskedText = maskedText.replace(new RegExp(escapedMatch, 'g'), token);
      });
    }
  });

  return {
    maskedText,
    maskMap,
    detectedTypes: Array.from(detectedTypes)
  };
}

/**
 * Unmask text by replacing tokens with original values
 * @param {string} maskedText - Text with tokens
 * @param {Object} maskMap - Token to original value mapping
 * @returns {string} Original text
 */
function unmaskText(maskedText, maskMap) {
  if (!maskedText || !maskMap) return maskedText;
  
  let unmaskedText = maskedText;
  
  // Replace each token with its original value
  Object.entries(maskMap).forEach(([token, original]) => {
    unmaskedText = unmaskedText.replace(new RegExp(token, 'g'), original);
  });
  
  return unmaskedText;
}

// ============================================================================
// GROQ API INTEGRATION
// ============================================================================

/**
 * Get system prompt based on enhancement action
 * @param {string} action - Enhancement type
 * @param {string} customPrompt - Optional custom prompt from user
 * @returns {string} System prompt
 */
function getSystemPrompt(action, customPrompt) {
  // If custom prompt provided, use it directly
  if (customPrompt && customPrompt.trim().length > 0) {
    return `You are a professional penetration testing report writer. ${customPrompt.trim()}
    
Preserve all placeholder tokens (like IP_0, EMAIL_1, etc.) exactly as they appear.`;
  }

  // Default prompts for standard actions
  const prompts = {
    grammar: `You are a professional text editor. Fix any grammar, spelling, and punctuation errors in the text. 
Maintain the original meaning and technical terminology. Do not add new information or change the structure significantly.
Preserve all placeholder tokens (like IP_0, EMAIL_1, etc.) exactly as they appear.`,
    
    professional: `You are a professional cybersecurity report writer. Rewrite the text in a professional, formal tone 
suitable for a penetration testing report. Maintain technical accuracy and all key information.
Preserve all placeholder tokens (like IP_0, EMAIL_1, etc.) exactly as they appear.`,
    
    technical: `You are a senior penetration tester. Enhance the text by adding relevant technical details, 
such as CVE references, attack vectors, technical explanations, and security implications. 
Keep the enhancement concise and focused on technical accuracy.
Preserve all placeholder tokens (like IP_0, EMAIL_1, etc.) exactly as they appear.`
  };
  
  return prompts[action] || prompts.grammar;
}

/**
 * Call Groq API to enhance text
 * @param {string} text - Text to enhance
 * @param {string} action - Enhancement action
 * @param {string} customPrompt - Optional custom prompt
 * @returns {Promise<string>} Enhanced text
 */
async function enhanceWithGroq(text, action, customPrompt = null) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const systemPrompt = getSystemPrompt(action, customPrompt);
  
  const requestBody = {
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text }
    ],
    temperature: 0.3, // Lower temperature for more consistent results
    max_tokens: 2000,
    top_p: 0.9
  };

  try {
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from Groq API');
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Groq API Error:', error);
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check rate limit for user
 * @param {string} userId - User ID
 * @returns {boolean} True if allowed, false if rate limited
 */
function checkRateLimit(userId) {
  const now = Date.now();
  const userLimit = userRateLimits.get(userId);
  
  if (!userLimit) {
    userRateLimits.set(userId, { lastRequest: now });
    return true;
  }
  
  const timeSinceLastRequest = now - userLimit.lastRequest;
  
  if (timeSinceLastRequest < RATE_LIMIT_WINDOW) {
    return false;
  }
  
  userLimit.lastRequest = now;
  return true;
}

/**
 * Generate cache key from text and action
 * @param {string} text - Input text
 * @param {string} action - Action type
 * @returns {string} Cache key
 */
function getCacheKey(text, action) {
  // Simple hash function for cache key
  const str = `${text}_${action}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `cache_${hash}`;
}

/**
 * Get from cache
 * @param {string} key - Cache key
 * @returns {string|null} Cached value or null
 */
function getFromCache(key) {
  return enhancementCache.get(key) || null;
}

/**
 * Save to cache with size limit
 * @param {string} key - Cache key
 * @param {string} value - Value to cache
 */
function saveToCache(key, value) {
  // If cache is full, remove oldest entry (first one)
  if (enhancementCache.size >= CACHE_MAX_SIZE) {
    const firstKey = enhancementCache.keys().next().value;
    enhancementCache.delete(firstKey);
  }
  
  enhancementCache.set(key, value);
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/ai/enhance-text
 * Enhance text with AI (requires authentication)
 * 
 * Body: {
 *   text: string,      // Text to enhance
 *   action: string     // 'grammar' | 'professional' | 'technical'
 * }
 * 
 * Response: {
 *   success: boolean,
 *   enhanced: string,       // Enhanced text
 *   cached: boolean,        // Was result from cache
 *   masked_items: number,   // Number of sensitive items masked
 *   detected_types: array   // Types of sensitive data detected
 * }
 */
router.post('/enhance-text', protect, async (req, res) => {
  try {
    const { text, action, customPrompt } = req.body;
    
    // Validation
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Text is required and must be a string'
      });
    }
    
    if (!action || !['grammar', 'professional', 'technical', 'custom'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be one of: grammar, professional, technical, custom'
      });
    }

    // If action is custom, customPrompt is required
    if (action === 'custom' && (!customPrompt || customPrompt.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Custom prompt is required when using custom action'
      });
    }
    
    if (text.length > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Text is too long (max 10,000 characters)'
      });
    }

    // Validate custom prompt length if provided
    if (customPrompt && customPrompt.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Custom prompt is too long (max 1,000 characters)'
      });
    }
    
    // Rate limiting check
    const userId = req.user._id.toString();
    if (!checkRateLimit(userId)) {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded. Please wait 2 seconds between requests.'
      });
    }
    
    // Check cache first (include customPrompt in cache key for custom actions)
    const cacheKey = getCacheKey(text + (customPrompt || ''), action);
    const cachedResult = getFromCache(cacheKey);
    
    if (cachedResult) {
      return res.json({
        success: true,
        enhanced: cachedResult,
        cached: true,
        masked_items: 0,
        detected_types: []
      });
    }
    
    // Frontend now sends pre-masked and pre-edited text
    // We don't need to mask again, just enhance and return
    // The frontend will handle unmasking since it has the mask map
    
    // Enhance with Groq AI (pass customPrompt if provided)
    const enhancedText = await enhanceWithGroq(text, action, customPrompt);
    
    // Save to cache
    saveToCache(cacheKey, enhancedText);
    
    // Return result (no masking info since frontend handles it)
    res.json({
      success: true,
      enhanced: enhancedText,
      cached: false,
      masked_items: 0,
      detected_types: []
    });
    
  } catch (error) {
    console.error('Enhancement error:', error);
    
    // Handle specific error types
    if (error.message.includes('GROQ_API_KEY')) {
      return res.status(500).json({
        success: false,
        message: 'AI service not configured. Please contact administrator.'
      });
    }
    
    if (error.message.includes('Groq API error')) {
      return res.status(503).json({
        success: false,
        message: 'AI service temporarily unavailable. Please try again later.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to enhance text. Please try again.'
    });
  }
});

/**
 * POST /api/ai/preview-mask
 * Preview what will be masked before sending to AI
 * 
 * Body: {
 *   text: string
 * }
 * 
 * Response: {
 *   success: boolean,
 *   masked_text: string,
 *   masked_items: number,
 *   detected_types: array
 * }
 */
router.post('/preview-mask', protect, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Text is required'
      });
    }
    
    const { maskedText, maskMap, detectedTypes } = maskSensitiveData(text);
    
    res.json({
      success: true,
      masked_text: maskedText,
      masked_items: Object.keys(maskMap).length,
      detected_types: detectedTypes
    });
    
  } catch (error) {
    console.error('Preview mask error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview masking'
    });
  }
});

module.exports = router;
