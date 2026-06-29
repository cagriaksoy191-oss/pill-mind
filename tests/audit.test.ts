import { redactPII, writeAuditLog } from '../lib/audit';
import { prisma } from '../lib/prisma';

jest.mock('../lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: jest.fn(),
    },
  },
}));

describe('Audit Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('redactPII', () => {
    it('should leave non-PII text unchanged', () => {
      expect(redactPII('Hello World, this is normal text.')).toBe('Hello World, this is normal text.');
    });

    it('should mask standard email addresses', () => {
      expect(redactPII('Contact me at john.doe@example.com')).toBe('Contact me at j***e@example.com');
      expect(redactPII('test@test.com')).toBe('t***t@test.com');
    });

    it('should mask short email addresses', () => {
      expect(redactPII('ab@example.com')).toBe('***@example.com');
      expect(redactPII('a@example.com')).toBe('***@example.com');
    });

    it('should mask common phone numbers', () => {
      expect(redactPII('My phone is +1 555-123-4567.')).toBe('My phone is [TELEFON MASKELENDİ].');
      expect(redactPII('Call (555) 123-4567')).toBe('Call [TELEFON MASKELENDİ]');
      expect(redactPII('Or 555-123-4567')).toBe('Or [TELEFON MASKELENDİ]');
      expect(redactPII('+90 532 123 4567')).toBe('[TELEFON MASKELENDİ]');
    });

    it('should handle falsy values', () => {
      expect(redactPII('')).toBe('');
      // @ts-ignore
      expect(redactPII(null)).toBe(null);
    });

    it('should mask multiple instances in a string', () => {
      const text = 'Emails: a@b.com, long.name@domain.co.uk. Phones: 555-123-4567, +1 (555) 987-6543.';
      const expected = 'Emails: ***@b.com, l***e@domain.co.uk. Phones: [TELEFON MASKELENDİ], [TELEFON MASKELENDİ].';
      expect(redactPII(text)).toBe(expected);
    });
  });

  describe('writeAuditLog', () => {
    it('should call prisma.auditLog.create with redacted details', async () => {
      const payload = {
        eventType: 'USER_LOGIN',
        entityType: 'USER',
        entityId: 'user-123',
        userId: 'admin-456',
        details: 'User test.user@example.com logged in with phone 555-123-4567',
      };

      await writeAuditLog(payload);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          eventType: 'USER_LOGIN',
          entityType: 'USER',
          entityId: 'user-123',
          userId: 'admin-456',
          details: 'User t***r@example.com logged in with phone [TELEFON MASKELENDİ]',
        },
      });
    });

    it('should pass null to details if details is not provided', async () => {
      const payload = {
        eventType: 'SYSTEM_EVENT',
        entityType: 'SYSTEM',
      };

      await writeAuditLog(payload);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          eventType: 'SYSTEM_EVENT',
          entityType: 'SYSTEM',
          entityId: undefined,
          userId: undefined,
          details: null,
        },
      });
    });

    it('should catch errors and log them without throwing', async () => {
      const error = new Error('Database connection failed');
      (prisma.auditLog.create as jest.Mock).mockRejectedValueOnce(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const payload = {
        eventType: 'ERROR_EVENT',
        entityType: 'SYSTEM',
      };

      await expect(writeAuditLog(payload)).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PillMind Audit Service] Audit logging failed:',
        error
      );

      consoleSpy.mockRestore();
    });
  });
});
