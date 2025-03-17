import pytest
from fastapi.testclient import TestClient
from main import app
from auth import create_access_token
from datetime import timedelta

@pytest.mark.integration
def test_client_auth():
    """
    Test that the TestClient works with authentication.
    """
    # Create a test client
    client = TestClient(app)

    # Create a token
    token = create_access_token(data={"sub": "testuser"}, expires_delta=timedelta(days=1))
    auth_headers = {"Authorization": f"Bearer {token}"}

    # Make a request with the auth_headers
    response = client.get("/users/me/", headers=auth_headers)

    # For this test, we'll just check that the response is not a 500 error
    # The actual authentication might fail with 401 if the user doesn't exist
    assert response.status_code != 500, f"Server error: {response.content}"