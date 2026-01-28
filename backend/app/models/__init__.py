# Import models here so Alembic can easily load them if needed.
from app.models.user import User  # noqa: F401
from app.models.artist import ArtistProfile  # noqa: F401
from app.models.venue import VenueProfile  # noqa: F401
from app.models.genre import Genre  # noqa: F401
from app.models.bookmark import Bookmark  # noqa: F401
from app.models.event import Event  # noqa: F401
from app.models.gig import Gig  # noqa: F401
