import re

with open("lib/auth.ts", "r") as f:
    content = f.read()

replacement = """export interface SessionData {
  userId: string;
  email: string;
  expires: number;
}

export interface VerificationData {
  email: string;
  otp: string;
  expires: number;
}
"""

content = re.sub(r'export interface SessionData \{\s*userId: string;\s*email: string;\s*expires: number;\s*\}', replacement, content)

# Also update encryptSession to accept VerificationData or SessionData
# Wait, encryptSession currently explicitly accepts SessionData: `export function encryptSession(data: SessionData): string`
# We should change it to `export function encryptSession(data: SessionData | VerificationData): string`
content = content.replace("export function encryptSession(data: SessionData): string", "export function encryptSession(data: SessionData | VerificationData): string")

# And decryptSession to return SessionData | VerificationData | null
content = content.replace("export function decryptSession(token: string): SessionData | null", "export function decryptSession(token: string): SessionData | VerificationData | null")
content = content.replace("const data = JSON.parse(decrypted) as SessionData;", "const data = JSON.parse(decrypted) as SessionData | VerificationData;")
# For getSession, it expects SessionData
content = content.replace("const session = decryptSession(cookie.value);", "const session = decryptSession(cookie.value) as SessionData | null;")


with open("lib/auth.ts", "w") as f:
    f.write(content)
