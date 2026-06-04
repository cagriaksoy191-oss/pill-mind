import re

with open("tests/auth.test.ts", "r") as f:
    content = f.read()

# Update the assertion for decrypted.userId
content = content.replace("expect(decrypted?.userId).toBe(testSession.userId);", "expect((decrypted as SessionData)?.userId).toBe(testSession.userId);")

with open("tests/auth.test.ts", "w") as f:
    f.write(content)
