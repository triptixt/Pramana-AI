from sqlalchemy import Column, Integer, String, Text, ForeignKey

from app.database import Base


class Control(Base):
    __tablename__ = "controls"

    id = Column(Integer, primary_key=True, index=True)

    framework_version_id = Column(
        Integer,
        ForeignKey("framework_versions.id"),
        nullable=False,
        index=True
    )

    control_code = Column(
        String,
        nullable=False,
        index=True
    )

    title = Column(
        String,
        nullable=False
    )

    description = Column(
        Text,
        nullable=True
    )