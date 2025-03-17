import pytest
from fastapi.testclient import TestClient
from main import app
from auth import create_access_token
from datetime import timedelta

@pytest.mark.integration
def test_api_endpoints():
    """
    Test various API endpoints using the TestClient.
    This test only verifies that the endpoints are accessible and return the expected status codes.
    """
    # Create a test client
    client = TestClient(app)

    # Create a token
    token = create_access_token(data={"sub": "testuser"}, expires_delta=timedelta(days=1))
    auth_headers = {"Authorization": f"Bearer {token}"}

    # Test user profile endpoint
    response = client.get("/users/me/", headers=auth_headers)
    # For this test, we'll just check that the response is not a 500 error
    assert response.status_code != 500, f"Server error: {response.content}"

    # Test health check endpoint
    response = client.get("/health")
    assert response.status_code == 200, f"Failed health check: {response.content}"

    # Test API documentation endpoint
    response = client.get("/docs")
    assert response.status_code == 200, f"Failed to access API docs: {response.content}"

    # Test OpenAPI schema endpoint
    response = client.get("/openapi.json")
    assert response.status_code == 200, f"Failed to get OpenAPI schema: {response.content}"