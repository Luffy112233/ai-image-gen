"""动态 API 适配器 — 运行时根据配置创建 OpenAI 兼容的适配器。"""

import requests
import base64
import io
from typing import Optional, List, Dict, Any
from PIL import Image
from app.adapters.base import BaseImageAdapter, ImageGenerationResult, GenerationRequest


class DynamicApiAdapter(BaseImageAdapter):
    """通用 OpenAI 兼容的 API 适配器，支持任意提供商。"""

    def __init__(self, config_id: int, name: str, api_url: str, api_key: str):
        self.config_id = config_id
        self._name = name
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key
        self.session = requests.Session()
        adapter = requests.adapters.HTTPAdapter(
            max_retries=requests.adapters.Retry(
                total=3,
                backoff_factor=2,
                status_forcelist=[429, 500, 502, 503, 504],
            )
        )
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)
        # 缓存模型列表（通过 /v1/models 探测）
        self._models: Optional[List[str]] = None

    @property
    def name(self) -> str:
        return self._name

    @property
    def supported_models(self) -> List[str]:
        return self._models or []

    def _build_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _post(self, endpoint: str, payload: Dict[str, Any], max_retries: int = 5) -> Dict[str, Any]:
        """发送 POST 请求到 API。"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        last_error = None
        
        for attempt in range(max_retries):
            try:
                resp = self.session.post(url, json=payload, headers=self._build_headers(), timeout=300)
                
                if 'text/html' in resp.headers.get('Content-Type', ''):
                    import time
                    wait_time = 3 * (2 ** attempt)
                    print(f"[DYNAMIC] Cloudflare HTML on attempt {attempt+1}/{max_retries}, retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                
                if resp.status_code in (520, 521, 522, 524):
                    import time
                    wait_time = 3 * (2 ** attempt)
                    print(f"[DYNAMIC] Cloudflare {resp.status_code} on attempt {attempt+1}/{max_retries}, retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                
                if resp.status_code != 200:
                    raise RuntimeError(f"API error {resp.status_code}: {resp.text[:500]}")
                
                try:
                    return resp.json()
                except ValueError:
                    print(f"[DYNAMIC] Non-JSON response on attempt {attempt+1}/{max_retries}")
                    import time
                    time.sleep(3 * (2 ** attempt))
                    continue
                    
            except requests.exceptions.Timeout as e:
                last_error = e
                import time
                wait_time = 3 * (2 ** attempt)
                print(f"[DYNAMIC] Timeout on attempt {attempt+1}/{max_retries}, retrying in {wait_time}s...")
                time.sleep(wait_time)
            except requests.exceptions.ConnectionError as e:
                last_error = e
                import time
                wait_time = 3 * (2 ** attempt)
                print(f"[DYNAMIC] Connection error on attempt {attempt+1}/{max_retries}, retrying in {wait_time}s...")
                time.sleep(wait_time)
        
        raise RuntimeError(f"All {max_retries} retries failed. Last error: {last_error}")

    def _get(self, endpoint: str, max_retries: int = 3) -> Dict[str, Any]:
        """发送 GET 请求到 API。"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        for attempt in range(max_retries):
            try:
                resp = self.session.get(url, headers=self._build_headers(), timeout=30)
                if resp.status_code != 200:
                    raise RuntimeError(f"API error {resp.status_code}: {resp.text[:500]}")
                return resp.json()
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                import time
                time.sleep(2 ** attempt)
        raise RuntimeError("Max retries exceeded")

    def discover_models(self) -> List[str]:
        """通过 /v1/models 端点探测可用模型。"""
        try:
            result = self._get("v1/models")
            # OpenAI 兼容格式: {"data": [{"id": "..."}, ...]}
            models = []
            for item in result.get("data", []):
                if isinstance(item, dict) and "id" in item:
                    models.append(item["id"])
            self._models = models
            return models
        except Exception as e:
            print(f"[DYNAMIC] Failed to discover models: {e}")
            self._models = []
            return []

    def test_connection(self) -> Dict[str, Any]:
        """测试 API 连通性。"""
        try:
            # 先尝试获取模型列表
            models = self.discover_models()
            return {
                "success": True,
                "message": f"连接成功，发现 {len(models)} 个模型",
                "models": models,
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"连接失败: {str(e)[:200]}",
                "models": [],
            }

    def generate(self, request: GenerationRequest) -> List[ImageGenerationResult]:
        """生成图片。"""
        payload: Dict[str, Any] = {
            "model": request.model or (self._models[0] if self._models else ""),
            "prompt": request.prompt,
            "n": request.n or 1,
        }

        if request.size:
            payload["size"] = request.size

        if request.negative_prompt:
            payload["negative_prompt"] = request.negative_prompt

        if request.seed is not None:
            payload["seed"] = request.seed

        # 图生图
        if request.image_url:
            payload["images"] = [{"image_url": request.image_url}]
        elif request.image_file:
            b64 = self._file_to_base64(request.image_file)
            payload["images"] = [{"image_url": f"data:image/png;base64,{b64}"}]

        if request.edit_mask and request.image_file:
            mask_b64 = self._file_to_base64(request.edit_mask)
            payload["mask"] = f"data:image/png;base64,{mask_b64}"

        # 选择端点
        if "images" in payload:
            endpoint = "images/edits"
            print(f"[DYNAMIC] Using edits endpoint (img2img), images count: {len(payload['images'])}")
        else:
            endpoint = "images/generations"
            print(f"[DYNAMIC] Using generations endpoint (text-to-image)")

        result = self._post(endpoint, payload)
        return self._parse_response(result, request.prompt)

    @staticmethod
    def _file_to_base64(file_path: str) -> str:
        """读取本地文件并返回 base64 编码。"""
        img = Image.open(file_path).convert("RGBA")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode("utf-8")

    def _parse_response(self, data: Dict[str, Any], prompt: str) -> List[ImageGenerationResult]:
        """解析 API 响应。"""
        images: List[ImageGenerationResult] = []

        def _parse(item: dict) -> ImageGenerationResult:
            return ImageGenerationResult(
                b64_json=item.get("b64_json", ""),
                url=item.get("url", ""),
                prompt=prompt,
            )

        # 尝试多种响应格式
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
