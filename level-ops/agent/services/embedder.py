"""
Embedding generation service with caching and rate limiting
"""

import hashlib
import asyncio
from typing import List, Optional
from openai import AsyncOpenAI
import tiktoken

from config import settings


class EmbeddingService:
    """
    Service for generating embeddings with deduplication and rate limiting
    """

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_EMBED_MODEL
        self.dimensions = settings.OPENAI_EMBED_DIMENSIONS
        self.encoding = tiktoken.encoding_for_model("gpt-4")
        self._semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_EMBEDDINGS)

    def compute_content_hash(self, text: str) -> str:
        """
        Generate SHA256 hash of content for deduplication
        """
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    def count_tokens(self, text: str) -> int:
        """
        Count tokens in text using tiktoken
        """
        return len(self.encoding.encode(text))

    async def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for a single text
        Rate-limited by semaphore
        """
        async with self._semaphore:
            response = await self.client.embeddings.create(
                model=self.model, input=text, dimensions=self.dimensions
            )
            return response.data[0].embedding

    async def embed_batch(
        self, texts: List[str], batch_size: int = 100
    ) -> List[List[float]]:
        """
        Generate embeddings for multiple texts in batches
        """
        embeddings = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            tasks = [self.embed_text(text) for text in batch]
            batch_embeddings = await asyncio.gather(*tasks)
            embeddings.extend(batch_embeddings)
        return embeddings

    async def embed_with_metadata(
        self, text: str
    ) -> dict:
        """
        Embed text and return with metadata (hash, token count)
        """
        content_hash = self.compute_content_hash(text)
        token_count = self.count_tokens(text)
        embedding = await self.embed_text(text)

        return {
            "embedding": embedding,
            "content_sha256": content_hash,
            "token_count": token_count,
        }
