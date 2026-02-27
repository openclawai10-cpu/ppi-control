import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ToastContainer from './components/Toast';
import Feed from './pages/Feed';
import Kanban from './pages/Kanban';
import Channels from './pages/Channels';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Documents from './pages/Documents';
import Purchases from './pages/Purchases';
import Analysis from './pages/Analysis';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/kanban" element={<Kanban />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/analysis" element={<Analysis />} />
        </Routes>
      </Layout>
      <ToastContainer />
    </Router>
  );
}

export default App;
