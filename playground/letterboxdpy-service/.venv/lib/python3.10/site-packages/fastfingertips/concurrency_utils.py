from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Callable, Iterable, Any

def run_parallel(func: Callable, items: Iterable, max_workers: int = 5) -> list[Any]:
    """Runs a function against multiple items in parallel using threads."""
    results = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_item = {executor.submit(func, item): item for item in items}
        for future in as_completed(future_to_item):
            try:
                data = future.result()
                results.append(data)
            except Exception as e:
                # In case of error, we can return the exception or a custom message
                results.append(e)
    return results
