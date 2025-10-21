import { createBrowserRouter } from "react-router-dom";
import VotingPage from "../components/VotingPage";
import VerificationPage from "../components/VerificationPage";
import AdminDashboard from "../components/AdminDashboard";
import ResultsPage from "../components/ResultsPage";
import RegistrationPage from "../components/RegistrationPage";
import LoginPage from "../components/LoginPage";
import MainLayout from "../MainLayout/MainLayout";
import ProfilePage from "../components/ProfilePage";
import Home from "../components/Home";
import VoterDashboard from "../components/VoterDashboard";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegistrationPage /> },
      { path: "admin-dashboard", element: <AdminDashboard /> },
      { path: "voter-dashboard", element: <VoterDashboard /> },
      { path: "voter-dashboard/:voterId", element: <VoterDashboard /> },
      { path: "results", element: <ResultsPage /> },
      { path: "voting-page", element: <VotingPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "verification", element: <VerificationPage /> },
      { path: "*", element: <div className="text-center mt-20"><h2 className="text-3xl font-bold text-red-500">404 - Page Not Found</h2></div> },
    ],
  },
]);

export default router;