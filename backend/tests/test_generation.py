"""Tests for image generation API."""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.adapters.proxy_api import ProxyApiAdapter


class TestProxyAdapter:
    """Proxy API adapter tests."""

    def test_adapter_initialization(self):
        """Test adapter can be instantiated."""
        adapter = ProxyApiAdapter()
        assert adapter.api_url == "https://api.bondai.cc/v1"
        assert adapter.name == "proxy-api"

    def test_supported_models(self):
        """Test supported models list."""
        adapter = ProxyApiAdapter()
        models = adapter.supported_models
        assert isinstance(models, list)
        assert "gpt-image-2" in models

    @pytest.mark.asyncio
    async def test_build_headers(self):
        """Test header construction."""
        adapter = ProxyApiAdapter(api_key="test_key")
        headers = adapter._build_headers()
        assert "Authorization" in headers
        assert "Bearer test_key" in headers["Authorization"]
        assert "Content-Type" in headers


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
