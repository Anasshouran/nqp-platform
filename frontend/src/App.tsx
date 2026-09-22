import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AppRoutes from './routes';

function App() {
  return (
    <>
      <AppRoutes />
      <ToastContainer
        position="bottom-left"
        rtl
        autoClose={4000}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable={false}
        theme="colored"
        toastStyle={{ fontFamily: '"IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif', fontWeight: 600, borderRadius: 12 }}
      />
    </>
  );
}

export default App;
