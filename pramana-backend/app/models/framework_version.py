from sqlalchemy import Column, Integer, String, Text, ForeignKey

from app.database import Base


class FrameworkVersion(Base):
    __tablename__ = "framework_versions"

    id = Column(Integer, primary_key=True, index=True)

    framework_id = Column(
        Integer,
        ForeignKey("frameworks.id"),
        nullable=False,
        index=True
    )

    version = Column(String, nullable=False)

    description = Column(Text, nullable=True)