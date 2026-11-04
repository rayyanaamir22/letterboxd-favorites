from datetime import datetime


def parse_datetime(date_string: str | None, formats: list[str] | None = None) -> datetime | None:
    """
    Parse date string to datetime object with support for multiple formats.
    
    Args:
        date_string: Date string to parse
        formats: Optional list of custom formats to try. If None, uses common formats.
        
    Returns:
        datetime object or None if parsing fails
        
    Examples:
        >>> parse_datetime("2025-09-12T22:33:05.358621")
        datetime(2025, 9, 12, 22, 33, 5, 358621)
        >>> parse_datetime("2025-09-28 07:15:21")
        datetime(2025, 9, 28, 7, 15, 21)
        >>> parse_datetime("12/25/2024", formats=["%m/%d/%Y"])
        datetime(2024, 12, 25, 0, 0)
    """
    if not date_string:
        return None
    
    # Default common formats
    default_formats = [
        "%Y-%m-%d %H:%M:%S",           # 2025-09-28 07:15:21
        "%Y-%m-%d",                     # 2025-09-28
        "%d/%m/%Y",                     # 28/09/2025
        "%m/%d/%Y",                     # 09/28/2025
        "%d-%m-%Y",                     # 28-09-2025
        "%Y/%m/%d",                     # 2025/09/28
        "%d.%m.%Y",                     # 28.09.2025
        "%Y-%m-%d %H:%M:%S.%f",        # 2025-09-28 07:15:21.123456
    ]
    
    formats_to_try = formats if formats else default_formats
    
    # Try ISO format first (most common)
    if 'T' in date_string:
        try:
            return datetime.fromisoformat(date_string.replace('Z', '+00:00'))
        except (ValueError, TypeError):
            pass
    
    # Try each format
    for fmt in formats_to_try:
        try:
            return datetime.strptime(date_string, fmt)
        except (ValueError, TypeError):
            continue
    
    return None


def format_datetime(dt: datetime | None, format_string: str = "%Y-%m-%d %H:%M:%S") -> str | None:
    """
    Format datetime object to string.
    
    Args:
        dt: datetime object to format
        format_string: Output format (default: "YYYY-MM-DD HH:MM:SS")
        
    Returns:
        Formatted string or None
    """
    if not dt:
        return None
    
    try:
        return dt.strftime(format_string)
    except (ValueError, AttributeError):
        return None


def now() -> datetime:
    """Get current datetime."""
    return datetime.now()


def today() -> datetime:
    """Get today's date at midnight."""
    return datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)


def smart_format_datetime(date_obj: datetime | str | None, format_string: str = "%Y-%m-%d %H:%M:%S") -> str | None:
    """
    Format datetime to string, accepting both datetime objects and date strings.
    If a string is provided, it will be parsed first then formatted.
    
    Args:
        date_obj: datetime object, date string, or None
        format_string: Output format (default: STANDARD_DATE_FORMAT)
        
    Returns:
        Formatted date string or None
        
    Examples:
        >>> smart_format_datetime(datetime(2025, 9, 28, 7, 15, 21))
        "2025-09-28 07:15:21"
        >>> smart_format_datetime("2025-09-12T22:33:05.358621")
        "2025-09-12 22:33:05"
        >>> smart_format_datetime("28/09/2025", "%Y-%m-%d")
        "2025-09-28"
    """
    if not date_obj:
        return None
    
    # If string, parse it first
    if isinstance(date_obj, str):
        date_obj = parse_datetime(date_obj)
        if not date_obj:
            return None
    
    # Format the datetime object
    return format_datetime(date_obj, format_string)


def get_timestamp(format_string: str = "%Y-%m-%d %H:%M:%S") -> str:
    """
    Get current timestamp as formatted string.
    
    Args:
        format_string: Output format (default: "YYYY-MM-DD HH:MM:SS")
        
    Returns:
        Formatted current timestamp
        
    Examples:
        >>> get_timestamp()
        "2025-12-22 01:52:39"
        >>> get_timestamp("%Y%m%d_%H%M%S")
        "20251222_015239"
    """
    return now().strftime(format_string)


def is_newer(date1: datetime | str | None, date2: datetime | str | None) -> bool:
    """
    Check if first date is newer (more recent) than second date.
    Accepts both datetime objects and date strings.
    
    Args:
        date1: First date (datetime or string)
        date2: Second date (datetime or string)
        
    Returns:
        True if date1 is newer than date2
        False if date1 is None or invalid
        True if date2 is None or invalid (assuming date1 is valid)
        
    Examples:
        >>> is_newer("2025-12-22", "2025-12-21")
        True
        >>> is_newer("2025-12-20", "2025-12-21")
        False
        >>> is_newer(datetime(2025, 12, 22), datetime(2025, 12, 21))
        True
    """
    # Parse if strings
    if isinstance(date1, str):
        date1 = parse_datetime(date1)
    if isinstance(date2, str):
        date2 = parse_datetime(date2)
    
    # If first date is invalid, return False
    if not date1:
        return False
    
    # If second date is invalid but first is valid, return True
    if not date2:
        return True
    
    return date1 > date2


def should_update(existing_date: datetime | str | None, new_date: datetime | str | None) -> bool:
    """
    Determine if existing date should be updated with new date.
    Returns True if new_date is newer than existing_date, or if existing_date is None/invalid.
    
    Args:
        existing_date: Current/existing date (datetime or string)
        new_date: New date to potentially update with (datetime or string)
        
    Returns:
        True if update should happen, False otherwise
        
    Examples:
        >>> should_update(None, "2025-12-22")
        True  # No existing date, use new one
        >>> should_update("2025-12-21", "2025-12-22")
        True  # New date is newer
        >>> should_update("2025-12-22", "2025-12-21")
        False  # Existing date is already newer
        >>> should_update("2025-12-22", None)
        False  # No new date to update with
    """
    # If no existing date, update if new date exists
    if not existing_date:
        return bool(new_date)
    
    # If no new date, don't update
    if not new_date:
        return False
    
    # Update if new date is newer
    return is_newer(new_date, existing_date)


def from_timestamp(timestamp: float, format_string: str = "%Y-%m-%d %H:%M:%S") -> str:
    """
    Convert Unix timestamp to formatted date string.
    
    Args:
        timestamp: Unix timestamp (seconds since epoch)
        format_string: Output format (default: "YYYY-MM-DD HH:MM:SS")
        
    Returns:
        Formatted date string
        
    Examples:
        >>> from_timestamp(1703203200)
        "2023-12-22 00:00:00"
        >>> from_timestamp(1703203200, "%Y-%m-%d")
        "2023-12-22"
    """
    dt_obj = datetime.fromtimestamp(timestamp)
    return dt_obj.strftime(format_string)


def to_timestamp(date_obj: datetime | str) -> float | None:
    """
    Convert datetime or date string to Unix timestamp.
    
    Args:
        date_obj: datetime object or date string
        
    Returns:
        Unix timestamp (seconds since epoch) or None if invalid
        
    Examples:
        >>> to_timestamp(datetime(2023, 12, 22))
        1703203200.0
        >>> to_timestamp("2023-12-22 00:00:00")
        1703203200.0
    """
    # Parse if string
    if isinstance(date_obj, str):
        date_obj = parse_datetime(date_obj)
    
    if not date_obj:
        return None
    
    return date_obj.timestamp()


def get_latest(*dates: datetime | str | None) -> datetime | str | None:
    """
    Get the most recent (latest) date from multiple dates.
    Returns the date in its original format (datetime or string).
    
    Args:
        *dates: Variable number of dates (datetime objects or strings)
        
    Returns:
        The latest date in original format, or None if all dates are invalid
        
    Examples:
        >>> get_latest("2025-12-20", "2025-12-22", "2025-12-21")
        "2025-12-22"
        >>> get_latest(datetime(2025, 12, 20), datetime(2025, 12, 22))
        datetime(2025, 12, 22)
        >>> get_latest(None, "invalid", "2025-12-22")
        "2025-12-22"
    """
    valid_dates = []
    
    for date in dates:
        if not date:
            continue
            
        # Parse if string
        parsed = parse_datetime(date) if isinstance(date, str) else date
        
        if parsed:
            valid_dates.append((parsed, date))  # Store both parsed and original
    
    if not valid_dates:
        return None
    
    # Find the latest date and return in original format
    _, original = max(valid_dates, key=lambda x: x[0])
    return original


def get_earliest(*dates: datetime | str | None) -> datetime | str | None:
    """
    Get the oldest (earliest) date from multiple dates.
    Returns the date in its original format (datetime or string).
    
    Args:
        *dates: Variable number of dates (datetime objects or strings)
        
    Returns:
        The earliest date in original format, or None if all dates are invalid
        
    Examples:
        >>> get_earliest("2025-12-20", "2025-12-22", "2025-12-21")
        "2025-12-20"
        >>> get_earliest(datetime(2025, 12, 20), datetime(2025, 12, 22))
        datetime(2025, 12, 20)
    """
    valid_dates = []
    
    for date in dates:
        if not date:
            continue
            
        # Parse if string
        parsed = parse_datetime(date) if isinstance(date, str) else date
        
        if parsed:
            valid_dates.append((parsed, date))  # Store both parsed and original
    
    if not valid_dates:
        return None
    
    # Find the earliest date and return in original format
    _, original = min(valid_dates, key=lambda x: x[0])
    return original
