import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../provider/AuthProvider";

const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // separate states for mobile menu and profile dropdown
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement | null>(null);

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      navigate("/login");
    }
  };

  const userName = user?.fullName ?? user?.full_name ?? user?.email ?? null;
  const initials = userName
    ? userName
        .split(" ")
        .map((s: string) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  // close dropdown when clicking outside
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // close menus on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setProfileOpen(false);
        setMenuOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // close menus on route change
  useEffect(() => {
    setProfileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 h-20 bg-gradient-to-r from-indigo-700 via-purple-600 to-indigo-800 shadow-lg transition-all duration-300">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex-shrink-0">
              <Link to="/" className="text-2xl font-extrabold text-white hover:text-yellow-300 transition-colors duration-300">
                MUCSU Election
              </Link>
            </div>

            <div className="hidden md:flex md:items-center md:space-x-8">
              <Link to="/" className="text-white hover:text-yellow-300 font-semibold text-lg transition-colors duration-300">
                Home
              </Link>

              {!user && (
                <>
                  <Link to="/login" className="text-white hover:text-yellow-300 font-semibold text-lg transition-colors duration-300">
                    Login
                  </Link>
                  <Link to="/register" className="text-white hover:text-yellow-300 font-semibold text-lg transition-colors duration-300">
                    Register
                  </Link>
                </>
              )}

              <Link to="/results" className="text-white hover:text-yellow-300 font-semibold text-lg transition-colors duration-300">
                Results
              </Link>

              <Link to="/voting-page" className="text-white hover:text-yellow-300 font-semibold text-lg transition-colors duration-300">
                Voting
              </Link>

              <Link to="/admin-dashboard" className="text-white hover:text-yellow-300 font-semibold text-lg transition-colors duration-300">
                Admin
              </Link>

              {user && (
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen((s) => !s)}
                    className="flex items-center gap-3 bg-white/20 px-4 py-2 rounded-full hover:bg-white/30 transition-all duration-300"
                    aria-expanded={profileOpen}
                  >
                    <div className="w-10 h-10 rounded-full bg-yellow-400 text-indigo-900 flex items-center justify-center font-bold text-xl shadow-md">
                      {initials}
                    </div>
                    <span className="text-white font-medium text-lg">{userName}</span>
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white/90 backdrop-blur-md border border-gray-200 rounded-lg shadow-xl animate-fadeIn">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-gray-800 hover:bg-indigo-100 rounded-t-lg transition-colors duration-200"
                        onClick={() => setProfileOpen(false)}
                      >
                        Profile
                      </Link>
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-b-lg transition-colors duration-200"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMenuOpen((s) => !s)}
                className="text-white hover:text-yellow-300 focus:outline-none focus:text-yellow-300 p-2 rounded-md transition-colors duration-300"
                aria-label="Toggle menu"
                aria-expanded={menuOpen}
              >
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          <div className={`md:hidden ${menuOpen ? "block" : "hidden"} transition-all duration-300 ease-in-out`}>
            <div className="px-2 pt-2 pb-4 space-y-1 bg-indigo-900/90 backdrop-blur-md rounded-b-lg shadow-lg">
              <Link
                to="/"
                className="block text-white hover:text-yellow-300 px-3 py-2 rounded-md text-lg font-semibold transition-colors duration-300"
                onClick={() => setMenuOpen(false)}
              >
                Home
              </Link>

              {!user && (
                <>
                  <Link
                    to="/login"
                    className="block text-white hover:text-yellow-300 px-3 py-2 rounded-md text-lg font-semibold transition-colors duration-300"
                    onClick={() => setMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="block text-white hover:text-yellow-300 px-3 py-2 rounded-md text-lg font-semibold transition-colors duration-300"
                    onClick={() => setMenuOpen(false)}
                  >
                    Register
                  </Link>
                </>
              )}

              <Link
                to="/results"
                className="block text-white hover:text-yellow-300 px-3 py-2 rounded-md text-lg font-semibold transition-colors duration-300"
                onClick={() => setMenuOpen(false)}
              >
                Results
              </Link>

              <Link
                to="/voting-page"
                className="block text-white hover:text-yellow-300 px-3 py-2 rounded-md text-lg font-semibold transition-colors duration-300"
                onClick={() => setMenuOpen(false)}
              >
                Voting
              </Link>

              <Link
                to="/admin-dashboard"
                className="block text-white hover:text-yellow-300 px-3 py-2 rounded-md text-lg font-semibold transition-colors duration-300"
                onClick={() => setMenuOpen(false)}
              >
                Admin
              </Link>
              <Link
                to="/voter-dashboard"
                className="block text-white hover:text-yellow-300 px-3 py-2 rounded-md text-lg font-semibold transition-colors duration-300"
                onClick={() => setMenuOpen(false)}
              >
                Voter
              </Link>

              {user && (
                <>
                  <Link
                    to="/profile"
                    className="block text-white hover:text-yellow-300 px-3 py-2 rounded-md text-lg font-semibold transition-colors duration-300"
                    onClick={() => setMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={async () => {
                      setMenuOpen(false);
                      await handleLogout();
                    }}
                    className="w-full text-left text-red-400 hover:text-red-300 px-3 py-2 rounded-md text-lg font-semibold transition-colors duration-300"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* spacer to prevent fixed header from overlapping page content */}
      <div className="h-20" aria-hidden="true" />
    </>
  );
};

export default Navbar;
