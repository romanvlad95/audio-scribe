import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../App.jsx';

// Mock the global fetch function and other APIs before each test
beforeEach(() => {
  // Mock clipboard API using vi.spyOn for proper tracking
  // We must ensure the object exists before we can spy on it.
  if (!navigator.clipboard) {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: () => Promise.resolve(),
      },
      configurable: true,
      writable: true,
    });
  }
  vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

  global.fetch = vi.fn();
});

// Restore all mocks after each test to ensure test isolation
afterEach(() => {
  vi.restoreAllMocks();
});


describe('App Component', () => {
  it('renders the main heading and initial state correctly', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /audio scribe/i })).toBeInTheDocument();
    expect(screen.getByText(/drag & drop your audio file/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /transcribe audio/i })).toBeDisabled();
  });

  it('allows a user to select a file and enables the transcribe button', async () => {
    render(<App />);
    const user = userEvent.setup();
    const file = new File(['hello'], 'hello.mp3', { type: 'audio/mpeg' });
    const fileInput = screen.getByLabelText(/browse files/i);

    await user.upload(fileInput, file);

    expect(screen.getByText(/selected: hello.mp3/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /transcribe audio/i })).toBeEnabled();
  });

  it('handles successful transcription and displays the result', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ transcription: 'This is a test transcription.' }),
    });

    render(<App />);
    const user = userEvent.setup();
    const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
    await user.upload(screen.getByLabelText(/browse files/i), file);
    await user.click(screen.getByRole('button', { name: /transcribe audio/i }));

    expect(await screen.findByText('This is a test transcription.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fix grammar/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /transcribe audio/i })).toBeEnabled();
  });

  it('handles a failed transcription and displays an error message', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ detail: 'Server-side failure.' }),
    });

    render(<App />);
    const user = userEvent.setup();
    const file = new File(['fail'], 'fail.mp3', { type: 'audio/mpeg' });
    await user.upload(screen.getByLabelText(/browse files/i), file);
    await user.click(screen.getByRole('button', { name: /transcribe audio/i }));

    const errorMessage = await screen.findByText(/transcription failed: server-side failure./i);
    expect(errorMessage).toBeInTheDocument();
    expect(screen.queryByText(/result/i)).not.toBeInTheDocument();
  });

  it('handles successful grammar fix and toggles between views', async () => {
    // Mock transcription first
    fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ transcription: 'original text' }),
    });

    render(<App />);
    const user = userEvent.setup();
    const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
    await user.upload(screen.getByLabelText(/browse files/i), file);
    await user.click(screen.getByRole('button', { name: /transcribe audio/i }));

    // Wait for original text to appear
    await screen.findByText('original text');

    // Mock grammar fix API call
    fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ corrected_text: 'corrected text' }),
    });

    // Click "Fix Grammar"
    const fixGrammarButton = screen.getByRole('button', { name: /fix grammar/i });
    await user.click(fixGrammarButton);

    // Wait for the corrected text to appear
    expect(await screen.findByText('corrected text')).toBeInTheDocument();
    expect(screen.getByText('✅ Grammar Fixed')).toBeInTheDocument();

    // Toggle back to original
    const originalButton = screen.getByRole('button', { name: 'ORIGINAL' });
    await user.click(originalButton);
    expect(screen.getByText('original text')).toBeInTheDocument();
    expect(screen.queryByText('corrected text')).not.toBeInTheDocument();

    // Toggle back to corrected
    const correctedButton = screen.getByRole('button', { name: 'CORRECTED' });
    await user.click(correctedButton);
    expect(screen.getByText('corrected text')).toBeInTheDocument();
  });

  it('handles dark mode toggle', async () => {
    render(<App />);
    const user = userEvent.setup();
    const toggleButton = screen.getByTitle('Toggle Dark Mode');

    // Check initial state (no dark class)
    expect(document.documentElement).not.toHaveClass('dark');

    // Click to enable dark mode
    await user.click(toggleButton);
    expect(document.documentElement).toHaveClass('dark');

    // Click again to disable dark mode
    await user.click(toggleButton);
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('handles the copy to clipboard functionality', async () => {
    render(<App />);
    const user = userEvent.setup();

    // Mock transcription to show some text and the copy button
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ transcription: 'text to copy' }),
    });
    const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
    await user.upload(screen.getByLabelText(/browse files/i), file);
    await user.click(screen.getByRole('button', { name: /transcribe audio/i }));
    await screen.findByText('text to copy');

    // Click the copy button
    const copyButton = screen.getByTitle('Copy Text');
    await user.click(copyButton);

    // Verify the clipboard API was called with the correct text
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('text to copy');
  });

  it('shows an error if the selected file is too large', async () => {
    render(<App />);
    const user = userEvent.setup();
    // Create a file larger than 25MB
    const largeFile = new File([new ArrayBuffer(26 * 1024 * 1024)], 'large.mp3', { type: 'audio/mpeg' });
    const fileInput = screen.getByLabelText(/browse files/i);

    await user.upload(fileInput, largeFile);

    expect(await screen.findByText(/file size exceeds the limit of 25mb/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /transcribe audio/i })).toBeDisabled();
  });

  it('allows a user to drop a file', async () => {
    render(<App />);
    const file = new File(['hello'], 'drop.mp3', { type: 'audio/mpeg' });
    const dropzone = screen.getByText(/drag & drop your audio file/i).closest('div');

    fireEvent.dragOver(dropzone, {
      dataTransfer: { files: [file] },
    });
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [file] },
    });

    expect(await screen.findByText(/selected: drop.mp3/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /transcribe audio/i })).toBeEnabled();
  });

  it('handles a failed grammar fix and displays an error', async () => {
    // Mock transcription first
    fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ transcription: 'original text' }),
    });

    render(<App />);
    const user = userEvent.setup();
    const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
    await user.upload(screen.getByLabelText(/browse files/i), file);
    await user.click(screen.getByRole('button', { name: /transcribe audio/i }));
    await screen.findByText('original text');

    // Mock failing grammar fix
    fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ detail: 'Grammar fix failure.' }),
    });

    await user.click(screen.getByRole('button', { name: /fix grammar/i }));

    expect(await screen.findByText(/grammar fix failed: grammar fix failure./i)).toBeInTheDocument();
  });

  it('handles a failing clipboard write', async () => {
    // Mock console.error
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock clipboard API to reject
    navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard error'));

    render(<App />);
    const user = userEvent.setup();

    // Transcribe to make text available
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ transcription: 'text to copy' }),
    });
    const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
    await user.upload(screen.getByLabelText(/browse files/i), file);
    await user.click(screen.getByRole('button', { name: /transcribe audio/i }));
    await screen.findByText('text to copy');

    // Click copy
    const copyButton = screen.getByTitle('Copy Text');
    await user.click(copyButton);

    // Check that console.error was called
    expect(consoleErrorSpy).toHaveBeenCalledWith('Could not copy text: ', new Error('Clipboard error'));

    // Restore console.error
    consoleErrorSpy.mockRestore();
  });

  it('handles download functionality', async () => {
    // Mock URL APIs
    window.URL.createObjectURL = vi.fn(() => 'blob:mock');
    window.URL.revokeObjectURL = vi.fn();

    render(<App />);
    const user = userEvent.setup();

    // Get text on screen
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ transcription: 'text to download' }),
    });
    const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
    await user.upload(screen.getByLabelText(/browse files/i), file);
    await user.click(screen.getByRole('button', { name: /transcribe audio/i }));
    await screen.findByText('text to download');

    // Create a real anchor element to spy on
    const anchor = document.createElement('a');
    const clickSpy = vi.spyOn(anchor, 'click');
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');

    // Spy on createElement and return our spied-on anchor
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchor);

    // Click download
    const downloadButton = screen.getByTitle(/download .txt/i);
    await user.click(downloadButton);

    // Assertions
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(anchor.download).toBe('test-original.txt');
    expect(anchor.href).toContain('blob:'); // URL.createObjectURL is mocked
    expect(clickSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalledWith(anchor);

    // Cleanup
    createElementSpy.mockRestore();
    clickSpy.mockRestore();
    removeChildSpy.mockRestore();
    delete window.URL.createObjectURL;
    delete window.URL.revokeObjectURL;
  });
});
