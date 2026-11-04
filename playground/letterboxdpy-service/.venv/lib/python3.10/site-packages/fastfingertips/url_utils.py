from urllib.parse import urlparse


def is_valid_url(url: str) -> bool:
    """Validate if the string is a properly formatted URL with scheme (http/https) and netloc."""
    if not url or not isinstance(url, str):
        return False
    
    url = url.strip()
    if not url.startswith(('http://', 'https://')):
        return False
    
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except Exception:
        return False


def is_domain_url(url: str, domains: str | list[str], must_contain: str | list[str] | None = None) -> bool:
    """Check if URL belongs to domain(s) and optionally contains specific path segments."""
    if not is_valid_url(url):
        return False
    
    url_lower = url.lower()
    
    # 1. Check domains (ANY match)
    if isinstance(domains, str):
        domains = [domains]
    if not any(d.lower() in url_lower for d in domains):
        return False
        
    # 2. Check required content (ANY match from the list)
    if must_contain:
        if isinstance(must_contain, str):
            must_contain = [must_contain]
        return any(c.lower() in url_lower for c in must_contain)
    
    return True


def validate_url(url: str, allowed_domains: str | list[str] | None = None, must_contain: str | list[str] | None = None) -> tuple[bool, str]:
    """
    Validate URL with optional domain and content checks.
    
    Returns:
        tuple[bool, str]: (is_valid, error_message) - if valid, error_message is empty string.
    """
    if not url:
        return False, "URL is required"
    
    url = url.strip()
    
    if not is_valid_url(url):
        return False, "Invalid URL format (must start with http:// or https://)"
    
    if allowed_domains or must_contain:
        if not is_domain_url(url, allowed_domains or [], must_contain):
            domain_msg = f" ({allowed_domains})" if allowed_domains else ""
            return False, f"URL does not match required domain/content criteria{domain_msg}"
            
    return True, ""


def build_url(base: str, *paths, trailing_slash: bool = True) -> str:
    """
    Construct a URL from base and path segments, handling slashes automatically.
    
    Args:
        base: Base URL/Domain (e.g. "https://example.com")
        *paths: Path segments (e.g. "user", "profile")
        trailing_slash: Whether to end the URL with a slash
        
    Returns:
        Joined URL
    """
    # Remove trailing slash from base
    url = base.rstrip('/')
    
    for path in paths:
        # Remove leading/trailing slashes from segments
        clean_path = str(path).strip('/')
        if clean_path:
            url = f"{url}/{clean_path}"
            
    if trailing_slash and not url.endswith('/'):
        url += '/'
    elif not trailing_slash:
        url = url.rstrip('/')
        
    return url


def extract_path_segment(url: str, after: str, before: str | None = None) -> str | None:
    """
    Extract a specific path segment from URL.
    
    Args:
        url: URL to parse
        after: Extract segment after this string (e.g., '/film/')
        before: Optional - stop extraction before this string (e.g., '/', '?')
        
    Returns:
        Extracted segment or None
        
    Examples:
        >>> extract_path_segment("https://site.com/film/avatar-2009", after="/film/")
        "avatar-2009"
        >>> extract_path_segment("https://site.com/user/john/profile", after="/user/", before="/")
        "john"
    """
    if not url or after not in url:
        return None
    
    # Find the position after the 'after' string
    start_pos = url.find(after) + len(after)
    segment = url[start_pos:]
    
    # If 'before' is specified, cut at that point
    if before and before in segment:
        end_pos = segment.find(before)
        segment = segment[:end_pos]
    
    # Clean up trailing slashes and query parameters
    segment = segment.split('?')[0].split('#')[0].rstrip('/')
    
    return segment if segment else None


def parse_url_path(url: str, positions: list[int] | dict[str, int]) -> dict[str, str | None] | list[str | None]:
    """
    Extract specific path segments from URL by position.
    
    Args:
        url: URL to parse
        positions: Either list of indices or dict mapping names to indices
        
    Returns:
        Dict or list of extracted segments (None if position doesn't exist)
        
    Examples:
        >>> parse_url_path("https://site.com/user/john/list/favorites", [0, 2])
        ["user", "list"]
        
        >>> parse_url_path("https://letterboxd.com/jack/list/top-films", 
        ...                {"username": 0, "list_slug": 2})
        {"username": "jack", "list_slug": "top-films"}
    """
    if not url:
        return {} if isinstance(positions, dict) else []
    
    try:
        parsed = urlparse(url)
        path = parsed.path.strip('/')
        parts = path.split('/') if path else []
        
        # Dict mode: return named segments
        if isinstance(positions, dict):
            result = {}
            for name, index in positions.items():
                result[name] = parts[index] if 0 <= index < len(parts) else None
            return result
        
        # List mode: return segments by indices
        else:
            return [parts[i] if 0 <= i < len(parts) else None for i in positions]
            
    except Exception:
        return {} if isinstance(positions, dict) else []


def urls_match(url1: str, url2: str, ignore_trailing_slash: bool = True, symmetric: bool = True) -> bool:
    """
    Compare two URLs for equality.
    
    Args:
        url1: First URL to compare (base)
        url2: Second URL to compare (target)
        ignore_trailing_slash: If True, handles trailing slash differences
        symmetric: If True, normalizes both URLs (default).
                   If False, only checks if url1 or url1+"/" equals url2.
        
    Returns:
        True if URLs match, False otherwise
        
    Examples:
        >>> urls_match("https://example.com", "https://example.com/")
        True
        >>> urls_match("https://example.com/", "https://example.com", symmetric=False)
        False
        >>> urls_match("https://example.com", "https://example.com/", symmetric=False)
        True
    """
    if not url1 or not url2:
        return url1 == url2
    
    if ignore_trailing_slash:
        if symmetric:
            # Normalize both URLs
            url1 = url1.rstrip('/')
            url2 = url2.rstrip('/')
            return url1 == url2
        else:
            # Asymmetric: only add "/" to url1 (original behavior)
            return url1 == url2 or f'{url1}/' == url2
    
    return url1 == url2
