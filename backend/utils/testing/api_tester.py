import httpx
import asyncio
import json
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# API base URL
BASE_URL = "http://localhost:8000"

# Test user credentials
TEST_USERNAME = "testuser"
TEST_PASSWORD = "testpassword"
TEST_EMAIL = "test@example.com"

async def register_user():
    """Register a test user if not already registered."""
    async with httpx.AsyncClient() as client:
        try:
            # Check if user exists by trying to login
            response = await client.post(
                f"{BASE_URL}/token",
                data={"username": TEST_USERNAME, "password": TEST_PASSWORD}
            )

            if response.status_code == 200:
                print(f"✅ User {TEST_USERNAME} already exists, logged in successfully")
                return response.json()["access_token"]

            # If login fails, register new user
            response = await client.post(
                f"{BASE_URL}/users/",
                json={
                    "username": TEST_USERNAME,
                    "email": TEST_EMAIL,
                    "password": TEST_PASSWORD,
                    "first_name": "Test",
"last_name": "User"
                }
            )

            if response.status_code == 200:
                print(f"✅ Successfully registered user {TEST_USERNAME}")

                # Login to get token
                response = await client.post(
                    f"{BASE_URL}/token",
                    data={"username": TEST_USERNAME, "password": TEST_PASSWORD}
                )

                return response.json()["access_token"]
            else:
                print(f"❌ Failed to register user: {response.text}")
                return None

        except Exception as e:
            print(f"❌ Error during user registration: {str(e)}")
            return None

async def test_health_check():
    """Test the health check endpoint."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BASE_URL}/health")
            if response.status_code == 200:
                print("✅ Health check endpoint is working")
            else:
                print(f"❌ Health check failed: {response.text}")
        except Exception as e:
            print(f"❌ Error during health check: {str(e)}")

async def test_resources_endpoints(token):
    """Test the resources endpoints."""
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient() as client:
        try:
            # Get all resources
            response = await client.get(f"{BASE_URL}/api/resources/", headers=headers)
            if response.status_code == 200:
                print("✅ Get all resources endpoint is working")
            else:
                print(f"❌ Get all resources failed: {response.text}")

            # Create a resource
            resource_data = {
                "title": "Test Resource",
                "url": "https://example.com/test",
                "topics": ["python", "fastapi"],
                "difficulty": "beginner",
                "estimated_time": 60
            }

            response = await client.post(
                f"{BASE_URL}/api/resources/articles",
                json=resource_data,
                headers=headers
            )

            if response.status_code == 201:
                print("✅ Create resource endpoint is working")
                resource_id = response.json()["id"]

                # Update the resource
                update_data = {
                    "title": "Updated Test Resource",
                    "notes": "This is a test note"
                }

                response = await client.put(
                    f"{BASE_URL}/api/resources/articles/{resource_id}",
                    json=update_data,
                    headers=headers
                )

                if response.status_code == 200:
                    print("✅ Update resource endpoint is working")
                else:
                    print(f"❌ Update resource failed: {response.text}")

                # Mark resource as completed
                response = await client.post(
                    f"{BASE_URL}/api/resources/articles/{resource_id}/complete",
                    json={"notes": "Completed test resource"},
                    headers=headers
                )

                if response.status_code == 200:
                    print("✅ Mark resource as completed endpoint is working")
                else:
                    print(f"❌ Mark resource as completed failed: {response.text}")

                # Delete the resource
                response = await client.delete(
                    f"{BASE_URL}/api/resources/articles/{resource_id}",
                    headers=headers
                )

                if response.status_code == 204:
                    print("✅ Delete resource endpoint is working")
                else:
                    print(f"❌ Delete resource failed: {response.text}")
            else:
                print(f"❌ Create resource failed: {response.text}")

        except Exception as e:
            print(f"❌ Error during resources endpoints test: {str(e)}")

async def test_progress_endpoints(token):
    """Test the progress endpoints."""
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient() as client:
        try:
            # Add daily metrics
            today = datetime.now().strftime("%Y-%m-%d")
            metric_data = {
                "date": today,
                "study_hours": 2.5,
                "topics": "python,fastapi,mongodb",
                "focus_score": 4,
                "notes": "Productive study session"
            }

            response = await client.post(
                f"{BASE_URL}/api/progress/metrics",
                json=metric_data,
                headers=headers
            )

            if response.status_code == 201:
                print("✅ Add daily metrics endpoint is working")
                metric_id = response.json()["id"]

                # Get metrics
                response = await client.get(
                    f"{BASE_URL}/api/progress/metrics",
                    headers=headers
                )

                if response.status_code == 200:
                    print("✅ Get metrics endpoint is working")
                else:
                    print(f"❌ Get metrics failed: {response.text}")

                # Get recent metrics
                response = await client.get(
                    f"{BASE_URL}/api/progress/metrics/recent",
                    headers=headers
                )

                if response.status_code == 200:
                    print("✅ Get recent metrics endpoint is working")
                else:
                    print(f"❌ Get recent metrics failed: {response.text}")

                # Generate weekly report
                response = await client.get(
                    f"{BASE_URL}/api/progress/report/weekly",
                    headers=headers
                )

                if response.status_code == 200:
                    print("✅ Generate weekly report endpoint is working")
                else:
                    print(f"❌ Generate weekly report failed: {response.text}")

                # Delete the metric
                response = await client.delete(
                    f"{BASE_URL}/api/progress/metrics/{metric_id}",
                    headers=headers
                )

                if response.status_code == 204:
                    print("✅ Delete metric endpoint is working")
                else:
                    print(f"❌ Delete metric failed: {response.text}")
            else:
                print(f"❌ Add daily metrics failed: {response.text}")

        except Exception as e:
            print(f"❌ Error during progress endpoints test: {str(e)}")

async def test_reviews_endpoints(token):
    """Test the reviews endpoints."""
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient() as client:
        try:
            # Create a concept
            concept_data = {
                "title": "Test Concept",
                "content": "This is a test concept for spaced repetition",
                "topics": ["python", "fastapi"]
            }

            response = await client.post(
                f"{BASE_URL}/api/reviews/concepts",
                json=concept_data,
                headers=headers
            )

            if response.status_code == 201:
                print("✅ Create concept endpoint is working")
                concept_id = response.json()["id"]

                # Get concepts
                response = await client.get(
                    f"{BASE_URL}/api/reviews/concepts",
                    headers=headers
                )

                if response.status_code == 200:
                    print("✅ Get concepts endpoint is working")
                else:
                    print(f"❌ Get concepts failed: {response.text}")

                # Update the concept
                update_data = {
                    "title": "Updated Test Concept",
                    "content": "This is an updated test concept"
                }

                response = await client.put(
                    f"{BASE_URL}/api/reviews/concepts/{concept_id}",
                    json=update_data,
                    headers=headers
                )

                if response.status_code == 200:
                    print("✅ Update concept endpoint is working")
                else:
                    print(f"❌ Update concept failed: {response.text}")

                # Mark concept as reviewed
                review_data = {
                    "confidence": 4
                }

                response = await client.post(
                    f"{BASE_URL}/api/reviews/concepts/{concept_id}/review",
                    json=review_data,
                    headers=headers
                )

                if response.status_code == 200:
                    print("✅ Mark concept as reviewed endpoint is working")
                else:
                    print(f"❌ Mark concept as reviewed failed: {response.text}")

                # Get due concepts
                response = await client.get(
                    f"{BASE_URL}/api/reviews/due",
                    headers=headers
                )

                if response.status_code == 200:
                    print("✅ Get due concepts endpoint is working")
                else:
                    print(f"❌ Get due concepts failed: {response.text}")

                # Generate review session
                response = await client.get(
                    f"{BASE_URL}/api/reviews/session",
                    headers=headers
                )

                if response.status_code == 200:
                    print("✅ Generate review session endpoint is working")
                else:
                    print(f"❌ Generate review session failed: {response.text}")

                # Delete the concept
                response = await client.delete(
                    f"{BASE_URL}/api/reviews/concepts/{concept_id}",
                    headers=headers
                )

                if response.status_code == 204:
                    print("✅ Delete concept endpoint is working")
                else:
                    print(f"❌ Delete concept failed: {response.text}")
            else:
                print(f"❌ Create concept failed: {response.text}")

        except Exception as e:
            print(f"❌ Error during reviews endpoints test: {str(e)}")

async def test_learning_path_endpoints(token):
    """Test the learning path endpoints."""
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient() as client:
        try:
            # Create a milestone
            target_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
            milestone_data = {
                "title": "Test Milestone",
                "description": "This is a test milestone",
                "target_date": target_date,
                "verification_method": "Complete a project",
                "resources": ["https://example.com/resource1"]
            }

            response = await client.post(
                f"{BASE_URL}/api/learning-path/milestones",
                json=milestone_data,
                headers=headers
            )

            if response.status_code == 201:
                print("✅ Create milestone endpoint is working")
                milestone_id = response.json()["id"]

                # Get milestones
                response = await client.get(
                    f"{BASE_URL}/api/learning-path/milestones",
                    headers=headers
                )

                if response.status_code == 200:
                    print("✅ Get milestones endpoint is working")
                else:
                    print(f"❌ Get milestones failed: {response.text}")

                # Update the milestone
                update_data = {
                    "title": "Updated Test Milestone",
                    "notes": "This is a test note"
                }

                response = await client.put(
                    f"{BASE_URL}/api/learning-path/milestones/{milestone_id}",
                    json=update_data,
                    headers=headers
                )

                if response.status_code == 200:
                    print("✅ Update milestone endpoint is working")
                else:
                    print(f"❌ Update milestone failed: {response.text}")

                # Create a goal
                goal_data = {
                    "title": "Test Goal",
                    "description": "This is a test goal",
                    "target_date": target_date,
                    "priority": 2,
                    "category": "learning"
                }

                response = await client.post(
                    f"{BASE_URL}/api/learning-path/goals",
                    json=goal_data,
                    headers=headers
                )

                if response.status_code == 201:
                    print("✅ Create goal endpoint is working")
                    goal_id = response.json()["id"]

                    # Get goals
                    response = await client.get(
                        f"{BASE_URL}/api/learning-path/goals",
                        headers=headers
                    )

                    if response.status_code == 200:
                        print("✅ Get goals endpoint is working")
                    else:
                        print(f"❌ Get goals failed: {response.text}")

                    # Update the goal
                    update_data = {
                        "title": "Updated Test Goal",
                        "notes": "This is a test note"
                    }

                    response = await client.put(
                        f"{BASE_URL}/api/learning-path/goals/{goal_id}",
                        json=update_data,
                        headers=headers
                    )

                    if response.status_code == 200:
                        print("✅ Update goal endpoint is working")
                    else:
                        print(f"❌ Update goal failed: {response.text}")

                    # Delete the goal
                    response = await client.delete(
                        f"{BASE_URL}/api/learning-path/goals/{goal_id}",
                        headers=headers
                    )

                    if response.status_code == 204:
                        print("✅ Delete goal endpoint is working")
                    else:
                        print(f"❌ Delete goal failed: {response.text}")
                else:
                    print(f"❌ Create goal failed: {response.text}")

                # Delete the milestone
                response = await client.delete(
                    f"{BASE_URL}/api/learning-path/milestones/{milestone_id}",
                    headers=headers
                )

                if response.status_code == 204:
                    print("✅ Delete milestone endpoint is working")
                else:
                    print(f"❌ Delete milestone failed: {response.text}")

                # Create a roadmap
                roadmap_data = {
                    "title": "Test Roadmap",
                    "description": "This is a test roadmap",
                    "phases": [
                        {
                            "title": "Phase 1",
                            "description": "Getting started",
                            "resources": ["https://example.com/resource1"]
                        },
                        {
                            "title": "Phase 2",
                            "description": "Advanced topics",
                            "resources": ["https://example.com/resource2"]
                        }
                    ]
                }

                response = await client.post(
                    f"{BASE_URL}/api/learning-path/roadmap",
                    json=roadmap_data,
                    headers=headers
                )

                if response.status_code == 201:
                    print("✅ Create roadmap endpoint is working")

                    # Get roadmap
                    response = await client.get(
                        f"{BASE_URL}/api/learning-path/roadmap",
                        headers=headers
                    )

                    if response.status_code == 200:
                        print("✅ Get roadmap endpoint is working")
                    else:
                        print(f"❌ Get roadmap failed: {response.text}")

                    # Update the roadmap
                    update_data = {
                        "title": "Updated Test Roadmap",
                        "description": "This is an updated test roadmap"
                    }

                    response = await client.put(
                        f"{BASE_URL}/api/learning-path/roadmap",
                        json=update_data,
                        headers=headers
                    )

                    if response.status_code == 200:
                        print("✅ Update roadmap endpoint is working")
                    else:
                        print(f"❌ Update roadmap failed: {response.text}")
                else:
                    print(f"❌ Create roadmap failed: {response.text}")

                # Get learning path progress
                response = await client.get(
                    f"{BASE_URL}/api/learning-path/progress",
                    headers=headers
                )

                if response.status_code == 200:
                    print("✅ Get learning path progress endpoint is working")
                else:
                    print(f"❌ Get learning path progress failed: {response.text}")
            else:
                print(f"❌ Create milestone failed: {response.text}")

        except Exception as e:
            print(f"❌ Error during learning path endpoints test: {str(e)}")

async def main():
    print("🔍 Testing AI/ML Learning Platform API...")

    # Test health check
    await test_health_check()

    # Register user and get token
    token = await register_user()

    if token:
        print("\n🔍 Testing Resources API...")
        await test_resources_endpoints(token)

        print("\n🔍 Testing Progress API...")
        await test_progress_endpoints(token)

        print("\n🔍 Testing Reviews API...")
        await test_reviews_endpoints(token)

        print("\n🔍 Testing Learning Path API...")
        await test_learning_path_endpoints(token)

        print("\n✅ API testing completed!")
    else:
        print("\n❌ Failed to authenticate. Cannot proceed with API tests.")

if __name__ == "__main__":
    asyncio.run(main())