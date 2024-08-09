import { Routes, Route, useLocation } from "react-router-dom";
import './App.css';
import Home from './screens/Home';
import AuthForm from "./screens/Auth";

function App() {
  const location = useLocation();
  const userData = location.state?.userData;
  return (
    <div className="App">
      <Routes>
        <Route path="/" exact element={<AuthForm />} />
        <Route path="/Home" exact element={<Home userData={userData} />} />
      </Routes>
    </div>
  );
}

export default App;

