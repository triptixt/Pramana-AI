from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "app": "Pramana Compliance API",
        "version": "1.0.0",
        "message": "Pramana backend is running"
    }