"""Test script to inspect proxy API response format."""

import asyncio
import aiohttp
import json

async def test_api():
    url = "https://api.bondai.cc/v1/chat/completions"
    headers = {
        "Authorization": "Bearer YOUR_API_KEY_HERE",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "gpt-image-2",
        "messages": [{"role": "user", "content": "test"}],
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(url, headers=headers, json=payload, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            print(f"Status: {resp.status}")
            try:
                data = await resp.json()
                print(json.dumps(data, indent=2, ensure_ascii=False)[:3000])
            except Exception as e:
                text = await resp.text()
                print(f"Raw response: {text[:1000]}")

asyncio.run(test_api())
