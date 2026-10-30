import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import CollegeDetail from "./pages/CollegeDetail";
import Compare from "./pages/Compare";
import Explore from "./pages/Explore";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import { Chat, Dashboard, Login, Predictor } from "./pages/Upcoming";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="explore" element={<Explore />} />
        <Route path="colleges/:slug" element={<CollegeDetail />} />
        <Route path="predictor" element={<Predictor />} />
        <Route path="compare" element={<Compare />} />
        <Route path="chat" element={<Chat />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="login" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
