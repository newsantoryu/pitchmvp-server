from sqlalchemy import Column, Integer, String, Float, JSON
from app.database import Base

class Score(Base):

    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String, index=True)
    
    artist = Column(String, index=True)  # Novo: nome do artista

    language = Column(String)

    duration = Column(Float)

    words = Column(JSON)
