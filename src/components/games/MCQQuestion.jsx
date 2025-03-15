function MCQQuestion({ question, options, questionId, selectedAnswer, onAnswerSelect }) {
    return (
      <div className="bg-gray-800/50 p-4 rounded-lg">
        <p className="font-medium text-white mb-3">
          {questionId + 1}. {question}
        </p>
        <div className="space-y-2 ml-4">
          {options.map((option, optIndex) => (
            <div
              key={optIndex}
              onClick={() => onAnswerSelect(questionId, optIndex)}
              className={`p-2 rounded flex items-center cursor-pointer ${
                selectedAnswer === optIndex
                  ? "bg-accent-900/30 border border-accent-700/50"
                  : "bg-gray-700/30 hover:bg-gray-700/50"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 text-sm ${
                  selectedAnswer === optIndex
                    ? "bg-accent-700 text-white"
                    : "bg-gray-600 text-gray-300"
                }`}
              >
                {String.fromCharCode(65 + optIndex)}
              </div>
              <span className="text-gray-300">{option}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  export default MCQQuestion;