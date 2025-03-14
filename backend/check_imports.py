import sys
import os

print("Python version:", sys.version)
print("Current directory:", os.getcwd())

try:
    print("\nChecking for routers directory...")
    if os.path.exists("routers"):
        print("✅ Routers directory exists")
        print("Contents of routers directory:", os.listdir("routers"))
    else:
        print("❌ Routers directory does not exist")

    print("\nChecking for router modules...")
    try:
        from routers import resources
        print("✅ Successfully imported resources router")
    except ImportError as e:
        print(f"❌ Failed to import resources router: {str(e)}")

    try:
        from routers import progress
        print("✅ Successfully imported progress router")
    except ImportError as e:
        print(f"❌ Failed to import progress router: {str(e)}")

    try:
        from routers import reviews
        print("✅ Successfully imported reviews router")
    except ImportError as e:
        print(f"❌ Failed to import reviews router: {str(e)}")

    try:
        from routers import learning_path
        print("✅ Successfully imported learning_path router")
    except ImportError as e:
        print(f"❌ Failed to import learning_path router: {str(e)}")

    print("\nChecking for main.py...")
    if os.path.exists("main.py"):
        print("✅ main.py exists")
    else:
        print("❌ main.py does not exist")

    print("\nChecking for circular imports...")
    try:
        import main
        print("✅ Successfully imported main module")
    except ImportError as e:
        print(f"❌ Failed to import main module: {str(e)}")

except Exception as e:
    print(f"❌ Error during import check: {str(e)}")