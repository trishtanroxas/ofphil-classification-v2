"""
Centralized Supabase & Database Connection Module for OFPHIL Classification V2.
Manages HTTP connection pooling and authenticated access to the Supabase REST gateway
using service-role authentication for privileged backend operations and least-privilege
caller contexts.
"""
from typing import Any, Dict, List, Optional
import httpx
from app.core.config import get_settings


class SupabaseClient:
    def __init__(self):
        settings = get_settings()
        self.base_url = settings.SUPABASE_URL.rstrip("/")
        self.anon_key = settings.SUPABASE_ANON_KEY
        self.service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY
        self.rest_url = f"{self.base_url}/rest/v1"

    def is_configured(self) -> bool:
        """Returns True if Supabase URL and service key are populated."""
        return bool(self.base_url and self.service_role_key)

    def _get_headers(self, use_service_role: bool = True, extra_headers: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        key = self.service_role_key if use_service_role else self.anon_key
        headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        if extra_headers:
            headers.update(extra_headers)
        return headers

    async def check_health(self) -> Dict[str, Any]:
        """Checks API connectivity to the Supabase REST cluster."""
        if not self.is_configured():
            return {"status": "unconfigured", "message": "Supabase credentials not configured."}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(f"{self.rest_url}/", headers=self._get_headers(use_service_role=True))
                if res.status_code == 200:
                    return {"status": "connected", "endpoint": self.base_url}
                return {"status": "error", "status_code": res.status_code, "detail": res.text}
        except Exception as e:
            return {"status": "connection_failed", "error": str(e)}

    async def select(self, table: str, params: Optional[Dict[str, Any]] = None, use_service_role: bool = True) -> List[Dict[str, Any]]:
        """Executes a SELECT query on a Supabase table."""
        url = f"{self.rest_url}/{table}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(url, headers=self._get_headers(use_service_role=use_service_role), params=params)
            if res.status_code >= 400:
                raise httpx.HTTPStatusError(f"Supabase error: {res.text}", request=res.request, response=res)
            return res.json()

    async def insert(self, table: str, data: Dict[str, Any], use_service_role: bool = True) -> List[Dict[str, Any]]:
        """Executes an INSERT on a Supabase table."""
        url = f"{self.rest_url}/{table}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(url, headers=self._get_headers(use_service_role=use_service_role), json=data)
            if res.status_code >= 400:
                raise httpx.HTTPStatusError(f"Supabase error: {res.text}", request=res.request, response=res)
            return res.json()

    async def update(self, table: str, data: Dict[str, Any], query_params: Dict[str, Any], use_service_role: bool = True) -> List[Dict[str, Any]]:
        """Executes an UPDATE on a Supabase table matching query parameters."""
        url = f"{self.rest_url}/{table}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.patch(url, headers=self._get_headers(use_service_role=use_service_role), params=query_params, json=data)
            if res.status_code >= 400:
                raise httpx.HTTPStatusError(f"Supabase error: {res.text}", request=res.request, response=res)
            return res.json()

    async def delete(self, table: str, query_params: Dict[str, Any], use_service_role: bool = True) -> List[Dict[str, Any]]:
        """Executes a DELETE on a Supabase table matching query parameters."""
        url = f"{self.rest_url}/{table}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.delete(url, headers=self._get_headers(use_service_role=use_service_role), params=query_params)
            if res.status_code >= 400:
                raise httpx.HTTPStatusError(f"Supabase error: {res.text}", request=res.request, response=res)
            return res.json()


supabase_db = SupabaseClient()
