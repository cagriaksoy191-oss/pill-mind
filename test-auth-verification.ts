import { encryptSession, decryptSession } from './lib/auth';

const token = encryptSession({ email: 'test@example.com', otp: '123456', expires: Date.now() + 600000 });
console.log("Token generated:", token);

const decrypted = decryptSession(token);
console.log("Decrypted:", decrypted);
