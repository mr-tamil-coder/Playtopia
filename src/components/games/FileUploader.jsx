import { useRef } from "react";

function FileUploader({ 
  onFileChange, 
  fileName, 
  fileType = "application/pdf",
  fileTypeDescription = "PDF",
  icon = "📄",
  error = "" 
}) {
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === fileType) {
      onFileChange(droppedFile);
    } else if (droppedFile) {
      onFileChange(null, `Please upload a ${fileTypeDescription} file`);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === fileType) {
      onFileChange(selectedFile);
    } else if (selectedFile) {
      onFileChange(null, `Please upload a ${fileTypeDescription} file`);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div
      className="border-2 border-dashed border-accent-600/50 rounded-lg p-8 text-center cursor-pointer hover:border-accent-500 transition-colors"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleBrowseClick}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={`.${fileTypeDescription.toLowerCase()}`}
        onChange={handleFileChange}
      />

      <div className="text-5xl mb-4 text-accent-400">{icon}</div>

      {!fileName ? (
        <div>
          <p className="text-gray-300 mb-2">
            Drag and drop your {fileTypeDescription} file here, or click to browse
          </p>
          <p className="text-gray-500 text-sm">
            Only {fileTypeDescription} files are accepted
          </p>
        </div>
      ) : (
        <div>
          <p className="text-accent-400 font-semibold mb-1">
            {fileName}
          </p>
          <p className="text-gray-400 text-sm">Click to change file</p>
        </div>
      )}

      {error && (
        <div className="mt-4 text-red-400 text-sm">{error}</div>
      )}
    </div>
  );
}

export default FileUploader;