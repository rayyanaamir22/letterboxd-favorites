import sys
import os
import time
from termcolor import colored

def setup_encoding():
    """
    Ensure that the terminal output handles UTF-8 characters correctly.
    This is especially important on Windows to avoid UnicodeEncodeError.
    """
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            # Fallback if reconfiguration fails in non-standard environments
            pass



def get_input(prompt: str, *, index: int = None, expected_type: type = str) -> any:
    """"Retrieve value from command-line argument or prompt user for input."""
    def convert(value):
        return expected_type(value)

    if index:
        try:
            return convert(sys.argv[index])
        except (IndexError, ValueError):
            pass

    while True:
        try:
            value = input(prompt).strip()
            if value:
                return convert(value)
        except ValueError:
            pass
        except KeyboardInterrupt:
            print("\nKeyboard interrupt detected. Exiting...")
            sys.exit(0)


def args_exists() -> bool:
    """Check if command-line arguments exist."""
    return len(sys.argv) > 1


def get_arg(index: int, default: str = None) -> str:
    """Retrieve command-line argument at a given index."""
    if index < 0:
        raise ValueError("Index cannot be negative")
    if len(sys.argv) > index:
        return sys.argv[index]
    return default


def ask_confirmation(prompt: str = "Do you want to continue? (y/n): ") -> bool:
    """Prompt the user for confirmation and return boolean response."""
    response = input(prompt).lower()
    return response in ['y', 'yes']


def clear_screen() -> None:
    """Clear the terminal screen based on the operating system."""
    os_name = os.name
    if os_name == 'nt':
        os.system('cls')
    elif os_name == 'posix':
        os.system('clear')
    else:
        raise NotImplementedError("Unsupported operating system")


def print_status(message: str, success: bool = True) -> None:
    """Print a colored status message to the terminal."""
    color = "green" if success else "red"
    print(colored(message, color))


def wait_with_progress(seconds: int, message: str = "Waiting") -> None:
    """Wait for specified seconds with a visual progress bar."""
    for i in range(seconds, 0, -1):
        percent = (seconds - i) / seconds
        bar_length = 20
        filled_length = int(bar_length * percent)
        bar = "=" * filled_length + "-" * (bar_length - filled_length)
        sys.stdout.write(f"\r{message}: [{bar}] {i}s left   ")
        sys.stdout.flush()
        time.sleep(1)
    sys.stdout.write(f"\r{message}: Done!                      \n")
