import { writeAuditLog } from '../lib/audit';
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

  describe('PII Redaction via writeAuditLog', () => {
    it('should leave non-PII text unchanged in details', async () => {
      await writeAuditLog({
        eventType: 'TEST_EVENT',
        entityType: 'TEST',
        details: 'Hello World, this is normal text.',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          eventType: 'TEST_EVENT',
          entityType: 'TEST',
          entityId: undefined,
          userId: undefined,
          details: 'Hello World, this is normal text.',
        },
      });
    });

    it('should mask standard email addresses', async () => {
      await writeAuditLog({
        eventType: 'USER_LOGIN',
        entityType: 'USER',
        details: 'Contact me at john.doe@example.com or test@test.com',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          eventType: 'USER_LOGIN',
          entityType: 'USER',
          entityId: undefined,
          userId: undefined,
          details: 'Contact me at j***e@example.com or t***t@test.com',
        },
      });
    });

    it('should mask short email addresses', async () => {
      await writeAuditLog({
        eventType: 'USER_LOGIN',
        entityType: 'USER',
        details: 'Emails: ab@example.com and a@example.com',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          eventType: 'USER_LOGIN',
          entityType: 'USER',
          entityId: undefined,
          userId: undefined,
          details: 'Emails: ***@example.com and ***@example.com',
        },
      });
    });

    it('should mask common phone numbers', async () => {
      await writeAuditLog({
        eventType: 'USER_UPDATE',
        entityType: 'USER',
        details: 'My phone is +1 555-123-4567. Call (555) 123-4567 or 555-123-4567 or +90 532 123 4567.',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          eventType: 'USER_UPDATE',
          entityType: 'USER',
          entityId: undefined,
          userId: undefined,
          details: 'My phone is [TELEFON MASKELENDİ]. Call [TELEFON MASKELENDİ] or [TELEFON MASKELENDİ] or [TELEFON MASKELENDİ].',
        },
      });
    });

    it('should handle falsy or empty details', async () => {
      await writeAuditLog({
        eventType: 'SYSTEM_EVENT',
        entityType: 'SYSTEM',
        details: '',
      });

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

    it('should mask multiple instances in a string', async () => {
      const text = 'Emails: a@b.com, long.name@domain.co.uk. Phones: 555-123-4567, +1 (555) 987-6543.';
      const expected = 'Emails: ***@b.com, l***e@domain.co.uk. Phones: [TELEFON MASKELENDİ], [TELEFON MASKELENDİ].';

      await writeAuditLog({
        eventType: 'AUDIT_TEST',
        entityType: 'TEST',
        details: text,
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          eventType: 'AUDIT_TEST',
          entityType: 'TEST',
          entityId: undefined,
          userId: undefined,
          details: expected,
        },
      });
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
