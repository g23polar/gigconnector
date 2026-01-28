from fastapi import FastAPI

from app.api.routes.auth import router as auth_router
from app.api.routes.artists import router as artists_router
from app.api.routes.venues import router as venues_router
from app.api.routes.search import router as search_router
from app.api.routes.bookmarks import router as bookmarks_router
from app.api.routes.matches import router as matches_router
from app.api.routes.events import router as events_router
from app.api.routes.gigs import router as gigs_router
from app.core.cors import add_cors
from app.core.config import settings
from app.api.routes.users import router as users_router

app = FastAPI(title="Band x Venue Matching API")

app.include_router(auth_router)
app.include_router(artists_router)
app.include_router(venues_router)
app.include_router(search_router)
app.include_router(bookmarks_router)
app.include_router(users_router)
app.include_router(matches_router)
app.include_router(events_router)
app.include_router(gigs_router)
cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
add_cors(app, origins=cors_origins)




@app.get("/health")
def health():
    return {"ok": True}
