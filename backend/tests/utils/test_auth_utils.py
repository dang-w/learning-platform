import pytest
from httpx import AsyncClient, Headers
from unittest.mock import patch, AsyncMock
from jose import jwt
from datetime import datetime, timedelta, timezone
from auth import create_access_token, get_password_hash, verify_password, ALGORITHM, SECRET_KEY, UserInDB, TokenData

# Test token creation
def test_create_access_token():
    """Test that access token is created correctly."""
    data = {"sub": "testuser"}
    expires_delta = timedelta(minutes=15)
    token = create_access_token(data, expires_delta)
    assert isinstance(token, str)

    # Decode token to verify content and expiry
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == "testuser"
    assert "exp" in payload
    expire_time = datetime.fromtimestamp(payload["exp"], tz=timezone.utc) # Decode as UTC
    # Compare using timezone-aware datetimes
    now_utc = datetime.now(timezone.utc)
    assert expire_time > now_utc
    assert expire_time < now_utc + expires_delta + timedelta(seconds=10) # Allow some leeway

# Test password hashing and verification
def test_password_hashing():
    """Test password hashing and verification."""
    password = "plainpassword"
    hashed_password = get_password_hash(password)
    assert isinstance(hashed_password, str)
    assert password != hashed_password

    # Verify correct password
    assert verify_password(password, hashed_password) is True

    # Verify incorrect password
    assert verify_password("wrongpassword", hashed_password) is False

# Although get_current_user and get_current_active_user are dependencies and tested
# implicitly via endpoint tests, we might add specific unit tests if they had complex logic.
# Example test structure (requires mocking dependencies like `request` or database calls):

# @pytest.mark.asyncio
# async def test_get_current_user_valid_token():
#     """Test getting user from a valid token."""
#     token = create_access_token({"sub": "testuser"})
#     with patch("auth.db") as mock_db:
#         mock_db.users.find_one = AsyncMock(return_value={
#             "username": "testuser", "email": "test@example.com", "hashed_password": "...", "disabled": False
#         })
#         # Need to mock the SecurityScopes dependency or provide it if needed
#         user = await get_current_user(token=token, security_scopes=SecurityScopes([]))
#         assert user.username == "testuser"
#         mock_db.users.find_one.assert_called_once_with({"username": "testuser"})

# @pytest.mark.asyncio
# async def test_get_current_user_invalid_token():
#     """Test getting user with an invalid/expired token."""
#     # Create an expired token
#     expired_token = create_access_token({"sub": "testuser"}, expires_delta=timedelta(minutes=-1))
#     with pytest.raises(HTTPException) as excinfo:
#         await get_current_user(token=expired_token, security_scopes=SecurityScopes([]))
#     assert excinfo.value.status_code == 401
#     assert "Could not validate credentials" in excinfo.value.detail

# @pytest.mark.asyncio
# async def test_get_current_active_user():
#     """Test getting an active user."""
#     # Mock the get_current_user dependency to return a non-disabled user
#     mock_user = UserInDB(username="activeuser", email="a@e.com", hashed_password="...", disabled=False)
#     active_user = await get_current_active_user(current_user=mock_user)
#     assert active_user == mock_user

# @pytest.mark.asyncio
# async def test_get_current_active_user_disabled():
#     """Test getting a disabled user raises exception."""
#     # Mock the get_current_user dependency to return a disabled user
#     mock_user = UserInDB(username="disableduser", email="d@e.com", hashed_password="...", disabled=True)
#     with pytest.raises(HTTPException) as excinfo:
#         await get_current_active_user(current_user=mock_user)
#     assert excinfo.value.status_code == 400
#     assert "Inactive user" in excinfo.value.detail