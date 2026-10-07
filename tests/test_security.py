from backend.security import create_access_token, decode_access_token


def test_tokens_are_signed_and_expire():
    token = create_access_token(username="admin", role="admin", expires_in=60)
    payload = decode_access_token(token)
    assert payload["sub"] == "admin"
    assert payload["role"] == "admin"
    assert payload["exp"] > payload["iat"]


def test_invalid_token_is_rejected():
    try:
        decode_access_token("not-a-valid-jwt")
    except ValueError:
        pass
    else:
        raise AssertionError("Malformed token should be rejected")
