import { FaSpinner } from "react-icons/fa";

function LoadingButton({ 
  isLoading, 
  onClick, 
  className = "btn-primary", 
  loadingText = "Processing...", 
  defaultText = "Submit" 
}) {
  return (
    <button
      className={className}
      onClick={onClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <FaSpinner className="animate-spin inline mr-2" />
          {loadingText}
        </>
      ) : (
        defaultText
      )}
    </button>
  );
}

export default LoadingButton;