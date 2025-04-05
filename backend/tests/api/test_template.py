"""
Template for API test files.

This template follows the standards and patterns from the working tests.
Use this as a reference when updating the remaining test files.

NOTE: This file is a template and not meant to be run directly.
The endpoints used in this file (/resources/) are placeholders and don't exist in the application.
When using this template, replace the endpoints with the actual endpoints you want to test.
"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi import HTTPException, status
from httpx import AsyncClient, Headers, ASGITransport

# Import the app and auth functions
from main import app
from auth import get_current_user, get_current_active_user

# Import standardized utilities
from utils.error_handlers import AuthenticationError, ResourceNotFoundError

# Import the MockUser class from conftest
from tests.conftest import MockUser

# Test data
test_data = {
    "id": "test_id",
    "name": "Test Name",
    "description": "Test Description"
}

# Dummy Resource ID
dummy_resource_id = "123"

@pytest.fixture(scope="function", autouse=True)
def clear_dependency_overrides():
    """Clear dependency overrides before and after each test."""
    # Clear any existing overrides
    app.dependency_overrides.clear()

    yield

    # Clear overrides after the test
    app.dependency_overrides.clear()

@pytest.fixture
def api_prefix():
    """API Prefix for endpoints."""
    return "/api/template"

@pytest.fixture
def sample_resource():
    """Sample resource data for testing."""
    return {
        "name": "Test Resource",
        "description": "This is a test resource.",
        "url": "https://example.com",
        "tags": ["test", "example"]
    }

@pytest.mark.skip(reason="This is a template test, skipping execution")
@pytest.mark.asyncio
async def test_get_resource_authenticated(async_client, auth_headers, api_prefix):
    """Test getting a resource when authenticated."""
    # Ensure test user is setup and auth_headers are available
    # GET request to fetch the resource
    response = await async_client.get(f"{api_prefix}/{dummy_resource_id}", headers=auth_headers)
    # Check for successful response
    assert response.status_code == 200
    # Verify response data structure and content
    resource_data = response.json()
    assert "id" in resource_data
    assert resource_data["name"] == "Test Resource"

@pytest.mark.skip(reason="This is a template test, skipping execution")
@pytest.mark.asyncio
async def test_get_resource_unauthenticated(async_client, api_prefix):
    """Test getting a resource when unauthenticated."""
    # GET request without authentication headers
    response = await async_client.get(f"{api_prefix}/{dummy_resource_id}")
    # Check for unauthorized status code
    assert response.status_code == 401

@pytest.mark.skip(reason="This is a template test, skipping execution")
@pytest.mark.asyncio
async def test_get_resource_not_found(async_client, auth_headers, api_prefix):
    """Test getting a non-existent resource."""
    # GET request for a non-existent resource ID
    non_existent_id = "nonexistent123"
    response = await async_client.get(f"{api_prefix}/{non_existent_id}", headers=auth_headers)
    # Check for not found status code
    assert response.status_code == 404

@pytest.mark.skip(reason="This is a template test, skipping execution")
@pytest.mark.asyncio
async def test_create_resource(async_client, auth_headers, api_prefix, sample_resource):
    """Test creating a new resource."""
    # POST request to create a new resource
    response = await async_client.post(api_prefix, json=sample_resource, headers=auth_headers)
    # Check for successful creation status code
    assert response.status_code == 201
    # Verify response data matches the created resource
    resource_data = response.json()
    assert resource_data["name"] == sample_resource["name"]
    assert "id" in resource_data

@pytest.mark.skip(reason="This is a template test, skipping execution")
@pytest.mark.asyncio
async def test_update_resource(async_client, auth_headers, api_prefix, sample_resource):
    """Test updating an existing resource."""
    # First, create a resource to update
    create_response = await async_client.post(api_prefix, json=sample_resource, headers=auth_headers)
    assert create_response.status_code == 201
    resource_id = create_response.json()["id"]
    # Data for updating the resource
    update_data = {"description": "Updated description.", "tags": ["updated"]}
    # PUT request to update the resource
    response = await async_client.put(f"{api_prefix}/{resource_id}", json=update_data, headers=auth_headers)
    # Check for successful update status code
    assert response.status_code == 200
    # Verify response data reflects the update
    updated_resource = response.json()
    assert updated_resource["description"] == update_data["description"]
    assert updated_resource["tags"] == update_data["tags"]

@pytest.mark.skip(reason="This is a template test, skipping execution")
@pytest.mark.asyncio
async def test_delete_resource(async_client, auth_headers, api_prefix, sample_resource):
    """Test deleting an existing resource."""
    # First, create a resource to delete
    create_response = await async_client.post(api_prefix, json=sample_resource, headers=auth_headers)
    assert create_response.status_code == 201
    resource_id = create_response.json()["id"]
    # DELETE request to remove the resource
    response = await async_client.delete(f"{api_prefix}/{resource_id}", headers=auth_headers)
    # Check for successful deletion status code (No Content)
    assert response.status_code == 204
    # Optionally, verify the resource is gone with a GET request
    get_response = await async_client.get(f"{api_prefix}/{resource_id}", headers=auth_headers)
    assert get_response.status_code == 404