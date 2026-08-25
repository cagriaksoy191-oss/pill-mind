/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUserPanel } from '../hooks/useUserPanel';

describe('useUserPanel', () => {
  const mockUser = { id: 'user-1', email: 'test@example.com' };
  const mockPillboxes = [
    {
      id: 'box-1',
      name: 'Test Box',
      drugIds: ['d1', 'd2'],
      createdAt: '2025-01-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as jest.Mock;
  });

  describe('Initial session check (checkSession)', () => {
    it('initializes loading as true and sets user and fetches saved boxes if authenticated', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ authenticated: true, user: mockUser }),
          });
        }
        if (url === '/api/pillbox/list?limit=50') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ pillboxes: mockPillboxes }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useUserPanel());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.savedBoxes).toEqual(mockPillboxes);
    });

    it('sets loading to false and leaves user null if unauthenticated', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: false }),
      });

      const { result } = renderHook(() => useUserPanel());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.savedBoxes).toEqual([]);
    });

    it('handles non-ok response from /api/auth/me', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const { result } = renderHook(() => useUserPanel());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });

    it('handles error during checkSession gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useUserPanel());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[PillMind Auth] Oturum kontrolü başarısız:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('fetchSavedBoxes', () => {
    it('fetches saved boxes and updates listBoxesLoading state', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ authenticated: false }),
          });
        }
        if (url === '/api/pillbox/list?limit=50') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ pillboxes: mockPillboxes }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useUserPanel());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.fetchSavedBoxes();
      });

      await waitFor(() => {
        expect(result.current.listBoxesLoading).toBe(false);
      });

      expect(result.current.savedBoxes).toEqual(mockPillboxes);
    });

    it('handles non-ok response during fetchSavedBoxes', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ authenticated: false }),
          });
        }
        if (url === '/api/pillbox/list?limit=50') {
          return Promise.resolve({
            ok: false,
            status: 500,
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useUserPanel());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.fetchSavedBoxes();
      });

      await waitFor(() => {
        expect(result.current.listBoxesLoading).toBe(false);
      });

      expect(result.current.savedBoxes).toEqual([]);
    });

    it('handles network error during fetchSavedBoxes', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ authenticated: false }),
          });
        }
        if (url === '/api/pillbox/list?limit=50') {
          return Promise.reject(new Error('Fetch boxes error'));
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useUserPanel());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.fetchSavedBoxes();
      });

      await waitFor(() => {
        expect(result.current.listBoxesLoading).toBe(false);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Pillbox List] Çekilirken hata:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('handleLogout', () => {
    it('logs out successfully and resets user, savedBoxes, and showDropdown', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ authenticated: true, user: mockUser }),
          });
        }
        if (url === '/api/pillbox/list?limit=50') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ pillboxes: mockPillboxes }),
          });
        }
        if (url === '/api/auth/logout') {
          return Promise.resolve({
            ok: true,
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useUserPanel());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      act(() => {
        result.current.setShowDropdown(true);
      });

      expect(result.current.showDropdown).toBe(true);

      await act(async () => {
        await result.current.handleLogout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.savedBoxes).toEqual([]);
      expect(result.current.showDropdown).toBe(false);
    });

    it('handles non-ok response from logout API without clearing state', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ authenticated: true, user: mockUser }),
          });
        }
        if (url === '/api/pillbox/list?limit=50') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ pillboxes: mockPillboxes }),
          });
        }
        if (url === '/api/auth/logout') {
          return Promise.resolve({
            ok: false,
            status: 500,
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useUserPanel());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.handleLogout();
      });

      expect(result.current.user).toEqual(mockUser);
    });

    it('handles network error during logout', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ authenticated: true, user: mockUser }),
          });
        }
        if (url === '/api/pillbox/list?limit=50') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ pillboxes: mockPillboxes }),
          });
        }
        if (url === '/api/auth/logout') {
          return Promise.reject(new Error('Logout network error'));
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useUserPanel());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.handleLogout();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Pillbox Logout] Hata:',
        expect.any(Error)
      );
      expect(result.current.user).toEqual(mockUser);

      consoleSpy.mockRestore();
    });
  });

  describe('handleDeleteBox', () => {
    it('returns early when confirmation is cancelled', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ authenticated: false }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useUserPanel());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.handleDeleteBox('box-1');
      });

      expect(confirmSpy).toHaveBeenCalledWith('Bu kayıtlı ilaç kutusunu silmek istediğinize emin misiniz?');
      expect((global.fetch as jest.Mock).mock.calls.some((c) => c[0] === '/api/pillbox/delete')).toBe(false);

      confirmSpy.mockRestore();
    });

    it('deletes pillbox and re-fetches saved boxes on confirmation and success', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

      (global.fetch as jest.Mock).mockImplementation((url: string, opts?: { method?: string }) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ authenticated: true, user: mockUser }),
          });
        }
        if (url === '/api/pillbox/list?limit=50') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ pillboxes: mockPillboxes }),
          });
        }
        if (url === '/api/pillbox/delete' && opts?.method === 'POST') {
          return Promise.resolve({
            ok: true,
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useUserPanel());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.handleDeleteBox('box-1');
      });

      expect(confirmSpy).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith('/api/pillbox/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'box-1' }),
      });

      confirmSpy.mockRestore();
    });

    it('shows alert with custom error when delete API returns non-ok response', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      (global.fetch as jest.Mock).mockImplementation((url: string, opts?: { method?: string }) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ authenticated: true, user: mockUser }),
          });
        }
        if (url === '/api/pillbox/list?limit=50') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ pillboxes: mockPillboxes }),
          });
        }
        if (url === '/api/pillbox/delete' && opts?.method === 'POST') {
          return Promise.resolve({
            ok: false,
            json: async () => ({ error: 'Unauthorized delete' }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useUserPanel());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.handleDeleteBox('box-1');
      });

      expect(alertSpy).toHaveBeenCalledWith('Unauthorized delete');

      confirmSpy.mockRestore();
      alertSpy.mockRestore();
    });

    it('shows fallback alert when delete API returns non-ok response with no error field', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      (global.fetch as jest.Mock).mockImplementation((url: string, opts?: { method?: string }) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ authenticated: true, user: mockUser }),
          });
        }
        if (url === '/api/pillbox/list?limit=50') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ pillboxes: mockPillboxes }),
          });
        }
        if (url === '/api/pillbox/delete' && opts?.method === 'POST') {
          return Promise.resolve({
            ok: false,
            json: async () => ({}),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useUserPanel());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.handleDeleteBox('box-1');
      });

      expect(alertSpy).toHaveBeenCalledWith('Silinemedi.');

      confirmSpy.mockRestore();
      alertSpy.mockRestore();
    });

    it('handles network error during deleteBox with log and alert', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      (global.fetch as jest.Mock).mockImplementation((url: string, opts?: { method?: string }) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ authenticated: true, user: mockUser }),
          });
        }
        if (url === '/api/pillbox/list?limit=50') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ pillboxes: mockPillboxes }),
          });
        }
        if (url === '/api/pillbox/delete' && opts?.method === 'POST') {
          return Promise.reject(new Error('Delete connection dropped'));
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useUserPanel());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.handleDeleteBox('box-1');
      });

      expect(consoleSpy).toHaveBeenCalledWith('[Pillbox Delete] Hata:', expect.any(Error));
      expect(alertSpy).toHaveBeenCalledWith('İlaç kutusu silinirken bir hata oluştu.');

      confirmSpy.mockRestore();
      alertSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('State setters', () => {
    it('allows updating user, showModal, showSavePrompt, and showDropdown state', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: false }),
      });

      const { result } = renderHook(() => useUserPanel());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setUser(mockUser);
        result.current.setShowModal(true);
        result.current.setShowSavePrompt(true);
        result.current.setShowDropdown(true);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.showModal).toBe(true);
      expect(result.current.showSavePrompt).toBe(true);
      expect(result.current.showDropdown).toBe(true);
    });
  });
});
