import React, { useState, useCallback, useEffect } from 'react';

const API_TRANSCRIBE_URL = '/api/transcribe';
const API_FIX_GRAMMAR_URL = '/api/fix-grammar';
const MAX_FILE_SIZE_MB = 25;

function App() {
  const [file, setFile] = useState(null);
  const [originalTranscription, setOriginalTranscription] = useState('');
  const [correctedTranscription, setCorrectedTranscription] = useState('');
  const [isShowingCorrected, setIsShowingCorrected] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isFixingGrammar, setIsFixingGrammar] = useState(false);
  const [error, setError] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // State to control the fade animation
  const [textIsVisible, setTextIsVisible] = useState(true);

  const fullTextToDisplay = isShowingCorrected ? correctedTranscription : originalTranscription;

  // Handles the dark mode toggle
  useEffect(() => {
      const root = window.document.documentElement;
      root.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // Handles the fade-in animation whenever the text content changes
  useEffect(() => {
    if (fullTextToDisplay) {
      setTextIsVisible(false); // Hide text to prepare for fade-in
      const timer = setTimeout(() => {
        setTextIsVisible(true); // Make text visible to trigger the transition
      }, 50); // A short delay to allow React to render the hidden state first
      return () => clearTimeout(timer);
    }
  }, [fullTextToDisplay]);


  const handleFileChange = (e) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      if (uploadedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`File size exceeds the limit of ${MAX_FILE_SIZE_MB}MB.`);
        setFile(null);
        return;
      }
      setFile(uploadedFile);
      setOriginalTranscription('');
      setCorrectedTranscription('');
      setIsShowingCorrected(false);
      setError(null);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileChange({ target: { files: [droppedFile] } });
    }
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select an audio file first.');
      return;
    }
    setIsLoading(true);
    setOriginalTranscription('');
    setCorrectedTranscription('');
    setIsShowingCorrected(false);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(API_TRANSCRIBE_URL, { method: 'POST', body: formData });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setOriginalTranscription(data.transcription.normalize('NFC'));
    } catch (err) {
      setError(`Transcription failed: ${err.message}`);
      setOriginalTranscription('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFixGrammar = async () => {
    if (!originalTranscription) return;
    setIsFixingGrammar(true);
    setError(null);
    try {
      const response = await fetch(API_FIX_GRAMMAR_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: originalTranscription }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setCorrectedTranscription(data.corrected_text.normalize('NFC'));
      setIsShowingCorrected(true);
    } catch (err) {
      setError(`Grammar fix failed: ${err.message}`);
    } finally {
      setIsFixingGrammar(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fullTextToDisplay).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
        console.error('Could not copy text: ', err);
    });
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const fileContent = new Blob([fullTextToDisplay], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(fileContent);
    element.download = `${file?.name.split('.')[0] || 'transcription'}-${isShowingCorrected ? 'corrected' : 'original'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors duration-300 font-sans">
      <div className="absolute top-4 right-4 z-10">
          <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300 shadow-md transform hover:scale-110"
              title="Toggle Dark Mode"
          >
              {isDarkMode ? (
                  <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              ) : (
                  <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
              )}
          </button>
      </div>

      <div className="flex flex-col items-center p-4">
          <header className="py-8 text-center">
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 dark:text-gray-100 tracking-tight">Audio Scribe 🎙️</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Transcribe and correct audio with AI.</p>
          </header>

          <main className="w-full max-w-3xl bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-6 md:p-10 border border-gray-200 dark:border-gray-700">
              <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className={`border-2 border-dashed rounded-xl p-8 transition-all duration-300 ${
                      file ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
              >
                  <div className="flex flex-col items-center space-y-4">
                    <svg className={`w-12 h-12 transition-colors ${file ? 'text-indigo-600' : 'text-gray-400 dark:text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75M3 17.25V6.75A2.25 2.25 0 015.25 4.5h13.5A2.25 2.25 0 0121 6.75v10.5A2.25 2.25 0 0118.75 19.5H5.25A2.25 2.25 0 013 17.25z" />
                      </svg>
                      <p className="text-lg font-medium text-gray-700 dark:text-gray-300 text-center">
                          {file ? `Selected: ${file.name}` : 'Drag & drop your audio file'}
                      </p>
                      <label htmlFor="file-upload" className="cursor-pointer bg-indigo-600 text-white font-semibold py-2 px-5 rounded-full hover:bg-indigo-700 transition-transform hover:scale-105 shadow-md">
                          Browse Files
                      </label>
                      <input id="file-upload" type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
                      <p className="text-xs text-gray-400 dark:text-gray-500">Max file size: {MAX_FILE_SIZE_MB}MB</p>
                  </div>
              </div>

              <div className="mt-6 flex flex-col items-center">
                  <button
                      onClick={handleSubmit}
                      disabled={isLoading || !file}
                      className="w-full max-w-sm bg-green-500 text-white font-bold py-3 px-6 rounded-full text-lg hover:bg-green-600 transition-all shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center transform hover:scale-105"
                  >
                      {isLoading ? (
                          <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Transcribing...</>
                      ) : 'Transcribe Audio'}
                  </button>
                  {error && <p className="text-red-500 mt-4 text-sm font-medium">{error}</p>}
              </div>

              {originalTranscription && (
                  <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <div className="bg-gray-100 dark:bg-gray-900/50 rounded-xl p-4 shadow-inner">
                          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                              <div className="flex items-center gap-4">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Result</h2>
                                  <button
                                      onClick={handleFixGrammar}
                                      disabled={isFixingGrammar || isLoading || !!correctedTranscription}
                                      className="text-sm font-medium py-1.5 px-4 rounded-full border transition-all flex items-center justify-center gap-2 bg-blue-500 text-white border-blue-600 hover:bg-blue-600 shadow-md disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed disabled:scale-100 transform hover:scale-105"
                                  >
                                      {isFixingGrammar ? (
                                          <><svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Fixing...</span></>
                                      ) : correctedTranscription ? (
                                          <>✅ Grammar Fixed</>
                                      ) : (
                                          <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c.252 0 .497.023.738.066a2.25 2.25 0 011.666 1.88M9.75 3.104c-2.25 0-4.028 1.95-4.028 4.354v1.5a2.25 2.25 0 002.25 2.25h1.5M14.25 9v5.714c0 .822-.432 1.591-1.126 2.007L9.75 21.75M14.25 9c.252 0 .497.023.738.066a2.25 2.25 0 011.666 1.88M14.25 9c-2.25 0-4.028 1.95-4.028 4.354v1.5a2.25 2.25 0 002.25 2.25h1.5" /></svg><span>Fix Grammar</span></>
                                      )}
                                  </button>
                              </div>
                              <div className="flex items-center gap-2">
                                  {correctedTranscription && (
                                      <div className="flex items-center space-x-2 p-1.5 bg-gray-200 dark:bg-gray-900 rounded-full">
                                          <button onClick={() => setIsShowingCorrected(false)} className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${!isShowingCorrected ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>ORIGINAL</button>
                                          <button onClick={() => setIsShowingCorrected(true)} className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${isShowingCorrected ? 'bg-indigo-500 text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>CORRECTED</button>
                                      </div>
                                  )}
                                  <button onClick={handleCopy} className="p-2 rounded-full bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border border-gray-300 dark:border-gray-600 shadow-sm" title="Copy Text" disabled={!fullTextToDisplay}>
                                    {isCopied ? <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> : <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
                                  </button>
                                  <button onClick={handleDownload} className="p-2 rounded-full bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border border-gray-300 dark:border-gray-600 shadow-sm" title="Download .txt" disabled={!fullTextToDisplay}>
                                      <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                  </button>
                              </div>
                          </div>

                          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-300 dark:border-gray-600 font-mono grid min-h-[200px] w-full">
                              <div className={`whitespace-pre-wrap leading-relaxed break-words w-full transition-opacity duration-1500 ease-in-out ${textIsVisible ? 'opacity-100' : 'opacity-0'}`}>
                                  {fullTextToDisplay}
                              </div>
                          </div>
                      </div>
                  </div>
              )}
          </main>
          <footer className="mt-8 text-gray-500 dark:text-gray-400 text-sm">
              Powered by Gemini & OpenAI Whisper
          </footer>
      </div>
    </div>
  );
}

export default App;