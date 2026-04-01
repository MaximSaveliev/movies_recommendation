import httpx

from app.config import settings


async def fetch_titles(start_year: int, end_year: int, page_token: str | None = None) -> dict:
    """Fetch a page of movie titles from IMDB API filtered by year range."""
    params: dict = {"startYear": start_year, "endYear": end_year}
    if page_token:
        params["pageToken"] = page_token
    async with httpx.AsyncClient() as http:
        response = await http.get(
            f"{settings.imdb_api_base_url}/titles",
            params=params,
            timeout=30,
        )
        response.raise_for_status()
        return response.json()


async def fetch_title_detail(imdb_id: str) -> dict:
    """Fetch full details for a single movie by IMDB ID."""
    async with httpx.AsyncClient() as http:
        response = await http.get(
            f"{settings.imdb_api_base_url}/titles/{imdb_id}",
            timeout=30,
        )
        response.raise_for_status()
        return response.json()
