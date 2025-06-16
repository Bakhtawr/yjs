
import { AuthProvider } from './contexts/AuthContext';
import Comments from './components/comment/comment';




function App() {

  return (
    <div className=" bg-gray-50 ">
       <AuthProvider>
        <Comments />
        </AuthProvider>
     
    </div>
  );
}

export default App;