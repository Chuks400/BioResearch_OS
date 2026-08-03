from __future__ import annotations

import importlib.util
import platform
import sys


PACKAGES = [
    "datasets",
    "evaluate",
    "gradio",
    "pypdf",
    "torch",
    "transformers",
    "accelerate",
    "bitsandbytes",
]


def has_package(name: str) -> bool:
    return importlib.util.find_spec(name) is not None


def main() -> None:
    print(f"Python: {sys.version.split()[0]}")
    print(f"Platform: {platform.platform()}")
    for package in PACKAGES:
        print(f"{package}: {'installed' if has_package(package) else 'missing'}")
    if has_package("torch"):
        import torch

        print(f"torch version: {torch.__version__}")
        print(f"cuda available: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"cuda device: {torch.cuda.get_device_name(0)}")


if __name__ == "__main__":
    main()
