function ErrorMessage({ message }) {
    if (!message) return null;
    
    return (
      <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded mb-4">
        {message}
      </div>
    );
  }

  export default ErrorMessage;