"""Proxy API adapter for bondai.cc (中转站).

Supports: text-to-image, image-to-image, inpainting/outpainting,
style transfer, upscaling, and batch generation.
"""

from typing import Optional, List, Dict, Any
import base64
import io
import requests
from PIL import Image
from app.adapters.base import BaseImageAdapter, ImageGenerationResult, GenerationRequest


class ProxyApiAdapter(BaseImageAdapter):
    """Adapter for the bondai.cc proxy API (OpenAI-compatible)."""

    def __init__(self, api_url: str = "https://api.bondai.cc/v1", api_key: str = ""):
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key
        # 使用 Session 保持连接复用，减少 TCP 握手时间
        self.session = requests.Session()
        # 设置更激进的超时和重试
        adapter = requests.adapters.HTTPAdapter(
            max_retries=requests.adapters.Retry(
                total=3,
                backoff_factor=2,
                status_forcelist=[429, 500, 502, 503, 504],
            )
        )
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)

    # ── helpers ──────────────────────────────────────────────

    @staticmethod
    def _file_to_base64(file_path: str) -> str:
        """Read a local file and return base64-encoded PNG data."""
        img = Image.open(file_path).convert("RGBA")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode("utf-8")

    def _build_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _post(self, endpoint: str, payload: Dict[str, Any], max_retries: int = 5) -> Dict[str, Any]:
        """Generic POST to the proxy API (using session with retry)."""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        last_error = None
        
        for attempt in range(max_retries):
            try:
                resp = self.session.post(url, json=payload, headers=self._build_headers(), timeout=300)
                
                # 检测 Cloudflare 错误页面（返回 HTML 而不是 JSON）
                if 'text/html' in resp.headers.get('Content-Type', ''):
                    import time
                    wait_time = 3 * (2 ** attempt)  # 指数退避：3s, 6s, 12s, 24s, 48s
                    print(f"[PROXY] Cloudflare HTML response on attempt {attempt+1}/{max_retries}, retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                
                # Cloudflare 524/520 错误 — 重试
                if resp.status_code in (520, 521, 522, 524):
                    import time
                    wait_time = 3 * (2 ** attempt)  # 指数退避：3s, 6s, 12s, 24s, 48s
                    print(f"[PROXY] Cloudflare {resp.status_code} on attempt {attempt+1}/{max_retries}, retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                
                if resp.status_code != 200:
                    raise RuntimeError(f"API error {resp.status_code}: {resp.text[:500]}")
                
                # 验证响应是 JSON
                try:
                    return resp.json()
                except ValueError:
                    print(f"[PROXY] Non-JSON response on attempt {attempt+1}/{max_retries}")
                    import time
                    time.sleep(3 * (2 ** attempt))
                    continue
                    
            except requests.exceptions.Timeout as e:
                last_error = e
                import time
                wait_time = 3 * (2 ** attempt)
                print(f"[PROXY] Timeout on attempt {attempt+1}/{max_retries}, retrying in {wait_time}s...")
                time.sleep(wait_time)
            except requests.exceptions.ConnectionError as e:
                last_error = e
                import time
                wait_time = 3 * (2 ** attempt)
                print(f"[PROXY] Connection error on attempt {attempt+1}/{max_retries}, retrying in {wait_time}s...")
                time.sleep(wait_time)
        
        raise RuntimeError(f"All {max_retries} retries failed. Last error: {last_error}")

    # ── BaseImageAdapter interface ───────────────────────────

    @property
    def name(self) -> str:
        return "proxy-api"

    @property
    def supported_models(self) -> List[str]:
        return ["gpt-image-2"]

    def generate(
        self,
        request: GenerationRequest,
    ) -> List[ImageGenerationResult]:
        """Generate images via the proxy API.

        Supports:
        - text-to-image (prompt only)
        - image-to-image (prompt + image_url or image_file)
        - batch (n > 1)
        """
        # Prepare base payload
        payload: Dict[str, Any] = {
            "model": request.model or "gpt-image-2",
            "prompt": request.prompt,
            "n": request.n or 1,
        }

        if request.size:
            payload["size"] = request.size

        if request.negative_prompt:
            payload["negative_prompt"] = request.negative_prompt

        if request.seed is not None:
            payload["seed"] = request.seed

        # Image-to-image: attach reference image
        if request.image_url:
            # /v1/images/edits expects images array with image_url
            payload["images"] = [{"image_url": request.image_url}]
        elif request.image_file:
            # image_file is a local path – encode to base64
            b64 = self._file_to_base64(request.image_file)
            payload["images"] = [{"image_url": f"data:image/png;base64,{b64}"}]

        if request.edit_mask and request.image_file:
            # Inpainting / outpainting
            mask_b64 = self._file_to_base64(request.edit_mask)
            payload["mask"] = f"data:image/png;base64,{mask_b64}"

        # Select endpoint based on whether image is provided
        # /v1/images/edits = img2img (requires images array)
        # /v1/images/generations = text-to-image (prompt only)
        if "images" in payload:
            endpoint = "images/edits"
            print(f"[PROXY] Using edits endpoint (img2img), images count: {len(payload['images'])}")
        else:
            endpoint = "images/generations"
            print(f"[PROXY] Using generations endpoint (text-to-image)")

        result = self._post(endpoint, payload)

        # Parse response — handle multiple possible formats
        images: List[ImageGenerationResult] = []

        def _parse_item(item: dict) -> ImageGenerationResult:
            return ImageGenerationResult(
                b64_json=item.get("b64_json", ""),
                url=item.get("url", ""),
                prompt=request.prompt,
            )

        # Try: result["data"]["images"]
        data = result.get("data")
        if isinstance(data, dict):
            img_list = data.get("images", [])
            if isinstance(img_list, list):
                for item in img_list:
                    if isinstance(item, dict):
                        images.append(_parse_item(item))
        # Try: result["images"]
        if not images:
            img_list = result.get("images", [])
            if isinstance(img_list, list):
                for item in img_list:
                    if isinstance(item, dict):
                        images.append(_parse_item(item))
        # Try: result["data"] is a list
        if not images and isinstance(data, list):
            for item in data:
                if isinstance(item, dict):
                    images.append(_parse_item(item))
        # Fallback: single image at top level
        if not images:
            if result.get("b64_json"):
                images.append(ImageGenerationResult(b64_json=result["b64_json"], prompt=request.prompt))
            elif result.get("url"):
                images.append(ImageGenerationResult(url=result["url"], prompt=request.prompt))

        return images

    def edit(
        self,
        image_path: str,
        prompt: str,
        operation: str = "inpaint",
        mask_path: Optional[str] = None,
    ) -> List[ImageGenerationResult]:
        """Edit an existing image (inpaint, outpaint, style transfer, upscale)."""
        b64 = self._file_to_base64(image_path)
        payload: Dict[str, Any] = {
            "model": "gpt-image-2",
            "image": f"data:image/png;base64,{b64}",
            "prompt": prompt,
            "operation": operation,
        }
        if mask_path:
            payload["mask"] = f"data:image/png;base64,{self._file_to_base64(mask_path)}"

        result = self._post("images/edits", payload)

        images: List[ImageGenerationResult] = []
        data = result.get("data")
        if isinstance(data, dict):
            for item in data.get("images", []) or []:
                if isinstance(item, dict):
                    images.append(ImageGenerationResult(b64_json=item.get("b64_json", ""), url=item.get("url", ""), prompt=prompt))
        if not images:
            for item in result.get("images", []) or []:
                if isinstance(item, dict):
                    images.append(ImageGenerationResult(b64_json=item.get("b64_json", ""), url=item.get("url", ""), prompt=prompt))
        if not images and isinstance(data, list):
            for item in data:
                if isinstance(item, dict):
                    images.append(ImageGenerationResult(b64_json=item.get("b64_json", ""), url=item.get("url", ""), prompt=prompt))
        if not images:
            if result.get("b64_json"):
                images.append(ImageGenerationResult(b64_json=result["b64_json"], prompt=prompt))
            elif result.get("url"):
                images.append(ImageGenerationResult(url=result["url"], prompt=prompt))
        return images

    def batch_generate(
        self,
        requests: List[GenerationRequest],
    ) -> List[List[ImageGenerationResult]]:
        """Generate multiple independent tasks in parallel using thread pool."""
        import concurrent.futures
        import asyncio
        
        def _generate_one(req: GenerationRequest) -> List[ImageGenerationResult]:
            payload: Dict[str, Any] = {
                "model": req.model or "gpt-image-2",
                "prompt": req.prompt,
                "n": req.n or 1,
            }
            if req.size:
                payload["size"] = req.size
            if req.negative_prompt:
                payload["negative_prompt"] = req.negative_prompt
            if req.seed is not None:
                payload["seed"] = req.seed
            if req.image_url:
                payload["image_url"] = req.image_url
            
            result = self._post("images/generations", payload)
            return self._parse_response(result, req.prompt)

        with concurrent.futures.ThreadPoolExecutor(max_workers=len(requests)) as executor:
            futures = [executor.submit(_generate_one, req) for req in requests]
            results = [f.result() for f in futures]
        
        return results

    def _parse_response(self, data: Dict[str, Any], prompt: str) -> List[ImageGenerationResult]:
        """Parse API response into ImageGenerationResult list."""
        images: List[ImageGenerationResult] = []
        
        def _parse(item: dict) -> ImageGenerationResult:
            return ImageGenerationResult(b64_json=item.get("b64_json", ""), url=item.get("url", ""), prompt=prompt)
        
        # Try data.images, then images, then data as list
        d = data.get("data")
        if isinstance(d, dict):
            for item in d.get("images", []) or []:
                if isinstance(item, dict):
                    images.append(_parse(item))
        if not images:
            for item in data.get("images", []) or []:
                if isinstance(item, dict):
                    images.append(_parse(item))
        if not images and isinstance(d, list):
            for item in d:
                if isinstance(item, dict):
                    images.append(_parse(item))
        if not images:
            if data.get("b64_json"):
                images.append(ImageGenerationResult(b64_json=data["b64_json"], prompt=prompt))
            elif data.get("url"):
                images.append(ImageGenerationResult(url=data["url"], prompt=prompt))
        return images
