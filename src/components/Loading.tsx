
import React from 'react';

const Loading: React.FC = () => {
  return (
    <div className="mt-[3rem]">
      <div
        className="flex min-h-screen mx-auto justify-center items-center"
        role="status"
        aria-live="polite"
      >
        <span className="loading loading-bars loading-lg" aria-hidden="true" />
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
};

export default Loading;
