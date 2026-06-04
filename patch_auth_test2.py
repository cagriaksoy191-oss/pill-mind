import re

with open("tests/auth.test.ts", "r") as f:
    content = f.read()

# Make sure we are importing VerificationData
content = content.replace(
    'import { encryptSession, decryptSession, SessionData } from "../lib/auth";',
    'import { encryptSession, decryptSession, SessionData, VerificationData } from "../lib/auth";'
)

with open("tests/auth.test.ts", "w") as f:
    f.write(content)
