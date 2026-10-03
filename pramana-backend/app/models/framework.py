from sqlalchemy import Column, Integer, String, Text

from app.database import Base


class Framework(Base):
    __tablename__ = "frameworks"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        nullable=False
    )

    code = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    description = Column(
        Text,
        nullable=True
    )