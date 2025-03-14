import asyncio
import httpx
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# API base URL
BASE_URL = "http://localhost:8001"

# Test user credentials
TEST_USERNAME = "testuser"
TEST_PASSWORD = "testpassword"

async def get_token():
    """Get an authentication token."""
    async with httpx.AsyncClient() as client:
        try:
            print(f"Attempting to authenticate with {TEST_USERNAME}...")
            response = await client.post(
                f"{BASE_URL}/token",
                data={"username": TEST_USERNAME, "password": TEST_PASSWORD},
                timeout=10.0
            )

            print(f"Authentication response status: {response.status_code}")

            if response.status_code == 200:
                token_data = response.json()
                print("Authentication successful")
                return token_data["access_token"]
            else:
                print(f"Authentication failed: {response.text}")
                return None

        except httpx.RequestError as e:
            print(f"Request error during authentication: {str(e)}")
            return None
        except Exception as e:
            print(f"Unexpected error during authentication: {str(e)}")
            return None

async def test_url_extractor(token):
    """Test the URL extractor endpoint."""
    headers = {"Authorization": f"Bearer {token}"}

    # Test URLs
    test_urls = [
        "https://www.tensorflow.org/tutorials/keras/classification",
        "https://www.youtube.com/watch?v=aircAruvnKk",
        "https://www.coursera.org/learn/machine-learning",
        "https://www.amazon.com/Hands-Machine-Learning-Scikit-Learn-TensorFlow/dp/1492032646"
    ]

    async with httpx.AsyncClient() as client:
        for url in test_urls:
            try:
                print(f"\n🔍 Testing URL extraction for: {url}")

                response = await client.post(
                    f"{BASE_URL}/api/url/extract",
                    json={"url": url},
                    headers=headers,
                    timeout=30.0
                )

                if response.status_code == 200:
                    metadata = response.json()
                    print("✅ Successfully extracted metadata")
                    print(f"Title: {metadata.get('title', 'N/A')}")
                    print(f"Description: {metadata.get('description', 'N/A')[:100]}...")
                    print(f"Resource Type: {metadata.get('resource_type', 'N/A')}")
                    print(f"Estimated Time: {metadata.get('estimated_time', 'N/A')} minutes")
                    print(f"Difficulty: {metadata.get('difficulty', 'N/A')}")
                    print(f"Topics: {', '.join(metadata.get('topics', []))}")
                else:
                    print(f"❌ Failed to extract metadata: {response.text}")

            except httpx.RequestError as e:
                print(f"❌ Request error during URL extraction: {str(e)}")
            except Exception as e:
                print(f"❌ Unexpected error during URL extraction: {str(e)}")

async def main():
    print("🔍 Testing URL Extractor Service...")
    print(f"API Base URL: {BASE_URL}")

    # Get authentication token
    token = await get_token()

    if token:
        await test_url_extractor(token)
    else:
        print("❌ Failed to authenticate. Cannot proceed with tests.")

if __name__ == "__main__":
    asyncio.run(main())