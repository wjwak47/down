
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './screens/Dashboard';
import { FileProcessing } from './screens/FileProcessing';
import { MediaDownloader } from './screens/MediaDownloader';
import { TaskLibrary } from './screens/TaskLibrary';
import { Screen } from './types';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.Dashboard);

  const renderScreen = () => {
    switch (currentScreen) {
      case Screen.Dashboard:
        return <Dashboard onNavigate={setCurrentScreen} />;
      case Screen.Processing:
        return <FileProcessing />;
      case Screen.Downloader:
        return <MediaDownloader />;
      case Screen.Library:
        return <TaskLibrary />;
      default:
        return <Dashboard onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentScreen={currentScreen} onNavigate={setCurrentScreen} />
      <main className="flex-1 flex flex-col overflow-y-auto bg-background-light dark:bg-background-dark">
        <Header currentScreen={currentScreen} />
        {renderScreen()}
      </main>
    </div>
  );
};

export default App;
