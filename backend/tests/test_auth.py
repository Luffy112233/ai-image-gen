"""Tests for authentication API."""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.api.auth import create_access_token, verify_password, hash_password


class TestAuth:
    """Authentication unit tests."""

    def test_hash_and_verify_password(self):
        """Test password hashing and verification."""
        password = "test_password_123"
        hashed = hash_password(password)
        assert hashed != password
        assert verify_password(password, hashed) is True
        assert verify_password("wrong_password", hashed) is False

    def test_create_access_token(self):
        """Test JWT token creation."""
        token = create_access_token(data={"sub": "1"})
        assert token is not None
        assert len(token) > 0
        parts = token.split(".")
        assert len(parts) == 3

    def test_token_contains_expiry(self):
        """Test that token contains expiry claim."""
        token = create_access_token(data={"sub": "1"})
        import base64
        import json
        
        # Decode the payload (second part of JWT)
        payload_b64 = token.split(".")[1]
        # Add padding if needed
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += "=" * padding
        payload = json.loads(base64.b64decode(payload_b64))
        assert "exp" in payload
        assert payload["sub"] == "1"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
