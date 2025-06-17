
import { AuthProvider } from './contexts/AuthContext';
import Comments from './components/comment/comment';
import { Toaster } from 'react-hot-toast';



function App() {

  return (
    <div className=" bg-gray-50 ">
       <AuthProvider>
       <Toaster position="top-right" />
        <Comments />
        </AuthProvider>
     
    </div>
  );
}

export default App;