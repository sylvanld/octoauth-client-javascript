import base64
import hashlib


def compute_challenge(code_verifier: str, code_challenge_method: str):
    """
    Compute code_challenge from code_verifier and challenge_method
    """
    if code_challenge_method == "S256":
        code_challenge = base64.b64encode(hashlib.sha256(code_verifier.encode("ascii")).hexdigest().encode("ascii")).decode("ascii")
    else:
        raise ValueError(f"Unsupported code_challenge_method '{code_challenge_method}'")

    return code_challenge


# parameter stored previously on authorization code generation
STORED_CHALLENGE = "OGFkNTNhNWQ3NmQwMjljNGEyYzMyODkwNTkyNTA3NTljZjViYTA0NmU2MmEwMjQ5ZmFmZGY3NjRiMmJjNzhiZg=="

# parameters received in access_token request
code_verifier = "y0AlzK4~4D-TGMuDfB3mpKfC6xRjhqJJ60aUACs_OcH-UJzUo8I3Me8usL3zm2sm"
code_challenge_method = "S256"


if __name__ == "__main__":
    received_challenge = compute_challenge(code_verifier, code_challenge_method)
    print("received challenge", received_challenge)

    assert STORED_CHALLENGE == received_challenge, "code_verifier does not matches code_challenge"
    print("code_verifier is valid !")
