from fastapi import FastAPI

from app.api.routes.auth import router as auth_router
from app.api.routes.artists import router as artists_router
from app.api.routes.venues import router as venues_router
from app.api.routes.search import router as search_router
from app.api.routes.bookmarks import router as bookmarks_router
from app.core.cors import add_cors
from app.api.routes.users import router as users_router

app = FastAPI(title="Band x Venue Matching API")

app.include_router(auth_router)
app.include_router(artists_router)
app.include_router(venues_router)
app.include_router(search_router)
app.include_router(bookmarks_router)
app.include_router(users_router)
add_cors(app, origins=["http://localhost:3000", "http://localhost:5173"])




@app.get("/health")
def health():
    return {"ok": True}
