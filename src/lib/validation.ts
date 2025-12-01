import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * Uses DOMPurify with a whitelist of allowed tags and attributes
 */
export const sanitizeHtml = (html: string): string => {
  if (typeof window === 'undefined') {
    // Server-side: strip all HTML as DOMPurify requires DOM
    return html.replace(/<[^>]*>/g, '');
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
      'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote',
      'a', 'mark', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'span', 'div', 'label', 'input',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'data-type', 'data-checked', 'type', 'checked'],
    ALLOW_DATA_ATTR: true,
    FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur'],
  });
};

/**
 * Sanitizes plain text by stripping HTML and limiting length
 */
export const sanitizeText = (text: string, maxLength: number = 255): string => {
  return text
    .replace(/<[^>]*>/g, '') // Strip HTML
    .trim()
    .slice(0, maxLength);
};

/**
 * Validates a note title
 */
export const validateNoteTitle = (title: string): { valid: boolean; error?: string } => {
  const sanitized = sanitizeText(title, 255);

  if (!sanitized) {
    return { valid: false, error: 'Title cannot be empty' };
  }

  if (sanitized.length < 1) {
    return { valid: false, error: 'Title must be at least 1 character' };
  }

  if (sanitized.length > 255) {
    return { valid: false, error: 'Title must be less than 255 characters' };
  }

  return { valid: true };
};

/**
 * Validates an email address format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates a calendar ID format
 */
export const validateCalendarId = (calendarId: string): boolean => {
  // Allow 'primary' or email-like format
  const calendarIdRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$|^primary$/;
  return calendarIdRegex.test(calendarId);
};
