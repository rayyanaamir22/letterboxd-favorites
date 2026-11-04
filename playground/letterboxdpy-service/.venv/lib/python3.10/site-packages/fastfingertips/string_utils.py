import re
import unicodedata


def extract_pattern(text: str, pattern: str, group: int = 1) -> str | None:
    """Extract matching group from text using regex pattern."""
    if not text:
        return None
    
    try:
        match = re.search(pattern, text)
        if match:
            return match.group(group)
        return None
    except (ValueError, AttributeError):
        return None


def extract_year(text: str, min_year: int = 1880, max_year: int = 2030) -> int | None:
    """Extract year from string - supports parenthesis (2023), slug -2023, or loose formats."""
    if not text:
        return None
    
    try:
        # 1. Search in parenthesis first: "(YYYY)"
        year_str = extract_pattern(text, r'\((\d{4})\)')
        if year_str:
            year = int(year_str)
            if min_year <= year <= max_year:
                return year
        
        # 2. Search slug format: "-YYYY" (at end)
        year_str = extract_pattern(text, r'-(\d{4})$')
        if year_str:
            year = int(year_str)
            if min_year <= year <= max_year:
                return year
        
        # 3. Fallback: Search any 4-digit number in range
        year_matches = re.findall(r'\b(19\d{2}|20[0-3]\d)\b', text)
        if year_matches:
            year = int(year_matches[-1])
            if min_year <= year <= max_year:
                return year
            
        return None
    except (ValueError, AttributeError):
        return None


def extract_number_from_text(text: str, join: bool = False) -> int | None:
    """
    Extract number from text.
    
    Args:
        text (str): Input text
        join (bool): If True, joins all found digits (e.g. 'S1 E5' -> 15).
                     If False (default), extracts only the first number block (e.g. 'S1 E5' -> 1).
                     Handles comma-separated numbers in both cases.
                     
    Returns:
        int | None: Extracted number or None
    """
    if not text:
        return None
        
    if join:
        # Extract all digits
        number_str = re.sub(r"[^0-9]", '', text)
        if number_str:
            return int(number_str)
    else:
        # Extract first number block (supporting commas)
        match = re.search(r'\d[\d,]*', text)
        if match:
            number_str = match.group().replace(',', '')
            try:
                return int(number_str)
            except ValueError:
                pass
    
    return None


def clean_whitespace(text: str) -> str:
    """Clean excessive whitespace from text."""
    if not text:
        return ""
    
    # Reduce multiple spaces to single space
    text = re.sub(r'\s+', ' ', text)
    # Strip leading/trailing whitespace
    return text.strip()


def slugify(text: str, separator: str = '-', lowercase: bool = True) -> str:
    """
    Convert text to URL-friendly slug format.
    Handles accented characters from all languages (Turkish, French, Spanish, etc.)
    
    Args:
        text: Text to slugify
        separator: Character to use as separator (default: '-')
        lowercase: Convert to lowercase (default: True)
        
    Returns:
        Slugified text
    """
    if not text:
        return ""
    
    # Normalize Unicode characters (é -> e, ğ -> g, ñ -> n, etc.)
    text = unicodedata.normalize('NFKD', text)
    text = text.encode('ascii', 'ignore').decode('ascii')
    
    # Convert to lowercase if requested
    if lowercase:
        text = text.lower()
    
    # Replace non-alphanumeric characters with separator
    text = re.sub(r'[^a-zA-Z0-9]+', separator, text)
    
    # Remove leading/trailing separators
    text = text.strip(separator)
    
    # Collapse multiple separators into one
    text = re.sub(f'{re.escape(separator)}+', separator, text)
    
    return text


def is_valid_email(value: str) -> bool:
    """
    Check if the given string is a valid email address.
    
    Args:
        value: String to validate
        
    Returns:
        True if valid email format, False otherwise
        
    Examples:
        >>> is_valid_email("user@example.com")
        True
        >>> is_valid_email("invalid-email")
        False
    """
    if not value or not isinstance(value, str):
        return False
    
    email_pattern = r"^[\w\.-]+@[\w\.-]+\.\w+$"
    return bool(re.match(email_pattern, value))


def is_boolean(value) -> bool:
    """
    Check if the given value is a boolean.
    
    Args:
        value: Value to check
        
    Returns:
        True if value is a boolean, False otherwise
        
    Examples:
        >>> is_boolean(True)
        True
        >>> is_boolean("true")
        False
    """
    return isinstance(value, bool)


def is_null_or_empty(value) -> bool:
    """Check if the given value is null or empty string."""
    return value is None or value == ""


def is_whitespace_or_empty(value) -> bool:
    """Check if the given string is whitespace or empty."""
    if not isinstance(value, str):
        return False
    return not value.strip()


def is_non_negative_integer(value) -> bool:
    """Check if the given value is a non-negative integer."""
    return isinstance(value, int) and value >= 0


def is_positive_float(value) -> bool:
    """Check if the given value is a positive float."""
    try:
        number = float(value)
        return number > 0
    except (ValueError, TypeError):
        return False
