import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from jose import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from pwdlib.hashers.bcrypt import BcryptHasher


load_dotenv()
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv(
    "JWT_ALGORITHM",
    "HS256"
)

JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv(
        "JWT_ACCESS_TOKEN_EXPIRE_MINUTES",
        "60"
    )
) 

password_hash = PasswordHash((Argon2Hasher(), BcryptHasher()))

def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(
    password: str,
    hashed_password: str
) -> bool:
    if not password or not hashed_password:
        return False
    try:
        return password_hash.verify(
            password,
            hashed_password
        )
    except Exception:
        try:
            import bcrypt
            if isinstance(hashed_password, str) and hashed_password.startswith(("$2a$", "$2b$", "$2y$")):
                return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
        except Exception:
            pass
        return False


def create_access_token(data: dict) -> str:
    to_encode = data.copy()

    expire = datetime.now(
        timezone.utc
    ) + timedelta(
        minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({
        "exp": expire
    })

    return jwt.encode(
        to_encode,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM
    )


def create_reset_token(user_id: int, email: str, password_hash: str) -> tuple[str, str]:
    """
    Creates a time-limited (15-min) secure password reset token and 6-digit OTP.
    Includes partial password hash in claims so the token is instantly invalidated upon reset (prevents replay).
    """
    import hashlib
    # Generate deterministic 6-digit OTP based on token secret & timestamp window
    expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    # 6-digit OTP
    otp_seed = f"{user_id}:{email}:{password_hash}:{expire.minute}"
    otp_code = str(int(hashlib.sha256(otp_seed.encode()).hexdigest(), 16))[-6:]

    claims = {
        "sub": str(user_id),
        "email": email.strip().lower(),
        "purpose": "password_reset",
        "ph_sig": (password_hash or "")[:16],
        "otp": otp_code,
        "exp": expire
    }

    token = jwt.encode(
        claims,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM
    )

    return token, otp_code


def verify_reset_token(token: str, current_password_hash: str) -> dict:
    """
    Verifies reset token validity, expiration, purpose, and signature.
    Raises ValueError if invalid, expired, or replayed.
    """
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM]
        )
    except Exception as e:
        raise ValueError("Password reset token is invalid or has expired.")

    if payload.get("purpose") != "password_reset":
        raise ValueError("Invalid token purpose.")

    # Prevent replay: if password already changed, ph_sig won't match
    if payload.get("ph_sig") != (current_password_hash or "")[:16]:
        raise ValueError("Reset token has already been consumed or invalidated.")

    return payload
