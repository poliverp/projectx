// src/utils/dateUtils.js

/**
 * Format a date string to "Month Day, Year" format
 * @param {string} dateString - The date string to format (could be ISO or any valid date format)
 * @returns {string} - Formatted date or original value if not a valid date
 */
export const formatDate = (dateString) => {
  if (!dateString || dateString === 'N/A') return 'N/A';
  
  try {
    // Parse the date - works with both ISO format (from backend) and other standard formats
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return dateString;
    
    // Format as "Month Day, Year"
    const options = { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      timeZone: 'UTC' // Ensure consistent timezone handling
    };
    return date.toLocaleDateString('en-US', options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

/**
 * Compare two dates for equality regardless of format
 * @param {string} date1 - First date string to compare
 * @param {string} date2 - Second date string to compare
 * @returns {boolean} - Whether the dates represent the same calendar day
 */
export const datesAreEqual = (date1, date2) => {
  if (!date1 || !date2) return false;
  
  try {
    // Parse dates and set to UTC midnight for comparison
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    // Check if both dates are valid
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
    
    // Set both dates to UTC midnight for comparison
    const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
    
    return utc1 === utc2;
  } catch (error) {
    console.error('Error comparing dates:', error);
    return false;
  }
};