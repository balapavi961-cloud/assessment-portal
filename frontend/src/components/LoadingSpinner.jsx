const LoadingSpinner = ({ fullScreen, size = 'md' }) => {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
  const spinner = (
    <div
      className={`${sizes[size]} border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin`}
    />
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        {spinner}
      </div>
    );
  }
  return <div className="flex justify-center p-8">{spinner}</div>;
};

export default LoadingSpinner;
