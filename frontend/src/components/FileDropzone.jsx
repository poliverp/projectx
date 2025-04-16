import React, { useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';

// Basic styling moved to index.css for better organization, but can keep specific styles here too
const baseStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '25px',
  borderWidth: 2,
  borderRadius: 4,
  borderColor: '#ccc',
  borderStyle: 'dashed',
  backgroundColor: '#fafafa',
  color: '#888',
  outline: 'none',
  transition: 'border .24s ease-in-out',
  cursor: 'pointer',
  minHeight: '100px',
  justifyContent: 'center',
  textAlign: 'center',
  marginTop: '15px',
  marginBottom: '15px',
};

const focusedStyle = { borderColor: '#2196f3' };
const acceptStyle = { borderColor: '#00e676', backgroundColor: '#e8f5e9' };
const rejectStyle = { borderColor: '#ff1744', backgroundColor: '#ffebee' };

// Component receives a function prop `onFilesAccepted` to handle the dropped files
function FileDropzone({
  onFilesAccepted,
  // Define accepted file types using MIME types or extensions
  // Example: PDF, DOCX, TXT
  acceptedFileTypes = {
     'application/pdf': ['.pdf'],
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
     'text/plain': ['.txt'],
  },
  multiple = true, // Allow multiple files by default
}) {

  const onDrop = useCallback(acceptedFiles => {
    // Pass the accepted files up to the parent component
    if (onFilesAccepted) {
      onFilesAccepted(acceptedFiles);
    }
  }, [onFilesAccepted]); // Dependency ensures the callback updates if the handler changes

  const {
    getRootProps,
    getInputProps,
    isFocused,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    multiple: multiple,
  });

  // Dynamically compute style based on dropzone state
  const style = useMemo(() => ({
    ...baseStyle,
    ...(isFocused ? focusedStyle : {}),
    ...(isDragAccept ? acceptStyle : {}),
    ...(isDragReject ? rejectStyle : {}),
  }), [isFocused, isDragAccept, isDragReject]);

  return (
    <div {...getRootProps({ style })}>
      <input {...getInputProps()} />
      {isDragAccept && (<p>Drop the files here ...</p>)}
      {isDragReject && (<p>Some files are not supported</p>)}
      {!isFocused && !isDragAccept && !isDragReject && (
        <p>Drag 'n' drop files here, or click to select</p>
      )}
      <p style={{ fontSize: '0.8em' }}>(Supports: .pdf, .docx, .txt)</p>
    </div>
  );
}

export default FileDropzone;