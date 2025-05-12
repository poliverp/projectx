import React, { useState } from 'react';

const TestUpload = () => {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!file) {
      setError('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('test_field', 'test_value');

    try {
      // Try direct fetch API instead of axios
      const response = await fetch('/api/discovery/simple-upload-test', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error('Error details:', err);
      setError(err.message || 'Upload failed');
    }
  };

  return (
    <div>
      <h2>Basic Upload Test</h2>
      <form onSubmit={handleSubmit}>
        <input 
          type="file" 
          onChange={(e) => setFile(e.target.files[0])} 
        />
        <button type="submit">Test Upload</button>
      </form>
      
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {result && <div style={{ color: 'green' }}>Success: {JSON.stringify(result)}</div>}
    </div>
  );
};

export default TestUpload;