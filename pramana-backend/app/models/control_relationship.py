from sqlalchemy import Column, Integer, String, ForeignKey

from app.database import Base


class ControlRelationship(Base):
    __tablename__ = "control_relationships"

    id = Column(Integer, primary_key=True, index=True)

    source_control_id = Column(
        Integer,
        ForeignKey("controls.id"),
        nullable=False,
        index=True
    )

    target_control_id = Column(
        Integer,
        ForeignKey("controls.id"),
        nullable=False,
        index=True
    )

    relationship_type = Column(String, nullable=False)