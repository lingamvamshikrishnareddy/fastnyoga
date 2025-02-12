// validation.js

/**
 * Validates an email format.
 * @param {string} email 
 * @returns {boolean}
 */
function isEmailValid(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Checks if the password is strong (at least 8 characters, includes a number, and a special character).
 * @param {string} password 
 * @returns {boolean}
 */
function isPasswordStrong(password) {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
}

/**
 * Validates if the provided date is valid.
 * @param {Date} date - Date object to validate
 * @returns {boolean} True if date is valid, false otherwise
 */
function isValidDate(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) return false;
    const now = new Date();
    const minDate = new Date('2020-01-01');
    return date <= now && date >= minDate;
}

/**
 * Checks if a string is non-empty.
 * @param {string} value 
 * @returns {boolean}
 */
function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

module.exports = {
    isEmailValid,
    isPasswordStrong,
    isValidDate,
    isNonEmptyString
};
