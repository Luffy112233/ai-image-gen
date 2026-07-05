"""Base adapter for all AI image providers."""

from abc import ABC, abstractmethod
from typing import Optional, List
from pydantic import BaseModel


class GenerationRequest(BaseModel):
    """Standardized request across all providers."""
    prompt: str
    model: str = "gpt-image-2"
    size: str = "1024x1024"
    n: int = 1
    negative_prompt: Optional[str] = None
    seed: Optional[int] = None
    image_url: Optional[str] = None       # for img2img / reference
    image_file: Optional[str] = None      # local path for img2img
    edit_mask: Optional[str] = None       # local path for inpainting
    operation: str = "generate"           # generate | inpaint | outpaint | upscale | stylize


class ImageGenerationResult(BaseModel):
    """Single image result."""
    b64_json: Optional[str] = None
    url: Optional[str] = None
    prompt: str = ""
    width: int = 1024
    height: int = 1024


class BaseImageAdapter(ABC):
    """Abstract base class — every provider implements these."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable provider name."""
        ...

    @property
    @abstractmethod
    def supported_models(self) -> List[str]:
        """Model IDs this adapter supports."""
        ...

    @abstractmethod
    async def generate(self, request: GenerationRequest) -> List[ImageGenerationResult]:
        """Generate image(s) from a prompt (text-to-image or img2img)."""
        ...

    async def edit(
        self,
        image_path: str,
        prompt: str,
        operation: str = "inpaint",
        mask_path: Optional[str] = None,
    ) -> List[ImageGenerationResult]:
        """Edit existing image. Default impl raises NotImplementedError."""
        raise NotImplementedError("This provider does not support editing")

    async def batch_generate(self, requests: List[GenerationRequest]) -> List[List[ImageGenerationResult]]:
        """Generate multiple independent tasks in parallel."""
        # Default: sequential. Override in subclasses for real parallelism.
        import asyncio
        results = []
        for req in requests:
            imgs = await self.generate(req)
            results.append(imgs)
        return results
