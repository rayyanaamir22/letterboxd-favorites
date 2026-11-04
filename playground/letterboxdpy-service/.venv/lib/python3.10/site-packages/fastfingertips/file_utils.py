import csv
from io import StringIO


def to_csv_string(rows: list[dict], columns: list[str] = None) -> str:
    """
    Convert a list of dictionaries to a CSV string.

    Args:
        rows: List of dictionaries to convert
        columns: Column names to use (default: keys from first row)

    Returns:
        CSV formatted string
    """
    if not rows:
        return ""
    
    if columns is None:
        columns = list(rows[0].keys())
    
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(columns)
    
    for row in rows:
        writer.writerow([row.get(col, "") for col in columns])
    
    return output.getvalue()


def from_csv_string(csv_string: str) -> list[dict]:
    """
    Parse a CSV string into a list of dictionaries.

    Args:
        csv_string: CSV formatted string

    Returns:
        List of dictionaries
    """
    if not csv_string:
        return []
    
    reader = csv.DictReader(StringIO(csv_string))
    return list(reader)
