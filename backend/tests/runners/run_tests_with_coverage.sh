#!/bin/bash

# Activate virtual environment if needed
# source .venv/bin/activate

# Set PYTHONPATH to include the parent directory (backend)
export PYTHONPATH=$PYTHONPATH:$(pwd)/..

# Run pytest with coverage
cd .. && python -m pytest tests/ --cov=. --cov-report=term --cov-report=html -v