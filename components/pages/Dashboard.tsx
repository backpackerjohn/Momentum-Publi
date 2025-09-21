import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <main className="container mx-auto p-8">
      <div className="text-center mt-10">
        <h1 className="text-5xl font-extrabold text-[var(--color-text-primary)] mb-4 tracking-tight">
          Welcome to Momentum AI
        </h1>
        <p className="text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto">
          Your journey to peak productivity starts here. This dashboard will help you visualize progress and organize your ideas effortlessly.
        </p>
        <div className="mt-12 p-10 bg-[var(--color-surface)] rounded-2xl shadow-lg border border-[var(--color-border)]">
           <p className="text-[var(--color-text-secondary)] text-lg">Application content will be built here in subsequent steps.</p>
        </div>
      </div>
    </main>
  );
};

export default Dashboard;