// /* eslint-disable @typescript-eslint/no-explicit-any */
// import React, { useState, useEffect } from "react";
// import { Link } from "react-router-dom";

// type Candidate = {
//   id: string;
//   _id?: string;
//   name?: string;
//   full_name?: string;
//   position?: string;
//   photoUrl?: string;
//   photo_url?: string;
//   party?: string;
//   manifesto?: string;
//   votes?: number;
//   [k: string]: any;
// };

// const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

// const Home: React.FC = () => {
//   // Countdown timer state
//   // const [timeLeft, setTimeLeft] = useState<string>("");
//   const [candidates, setCandidates] = useState<Candidate[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);




//   // load candidates from API
//   useEffect(() => {
//     const ac = new AbortController();
//     const load = async () => {
//       setLoading(true);
//       setError(null);
//       try {
//         const res = await fetch(`${API_BASE}/api/candidates`, { signal: ac.signal });
//         const text = await res.text();
//         let data: any = null;
//         try {
//           data = text ? JSON.parse(text) : null;
//         } catch {
//           data = text;
//         }
//         if (!res.ok) {
//           throw new Error((data && data.message) || String(data) || `HTTP ${res.status}`);
//         }

//         // try to find candidate list in various shapes
//         let list: any[] = [];
//         if (Array.isArray(data)) list = data;
//         else if (Array.isArray(data.data)) list = data.data;
//         else if (Array.isArray(data.candidates)) list = data.candidates;
//         else if (Array.isArray(data.items)) list = data.items;
//         else if (Array.isArray(data.results)) list = data.results;
//         else if (data?.candidatesList && Array.isArray(data.candidatesList)) list = data.candidatesList;

//         // normalize
//         const normalized: Candidate[] = (list || []).map((c: any) => ({
//           id: String(c._id ?? c.id ?? ""),
//           _id: c._id ?? c.id,
//           name: c.name ?? c.full_name ?? c.fullName ?? "",
//           full_name: c.full_name ?? c.name ?? c.fullName ?? "",
//           position: c.position ?? c.position_title ?? "Unspecified",
//           photoUrl: c.photoUrl ?? c.photo_url ?? c.symbol ?? "",
//           photo_url: c.photo_url ?? c.photoUrl ?? "",
//           party: c.party ?? c.party_name ?? "",
//           manifesto: c.manifesto ?? "",
//           votes: Number(c.votes ?? c.vote_count ?? c.voteCount ?? 0),
//           ...c,
//         }));

//         setCandidates(normalized);
//       } catch (err: any) {
//         if (err.name === "AbortError") return;
//         setError(err?.message ?? String(err));
//       } finally {
//         setLoading(false);
//       }
//     };
//     load();
//     return () => ac.abort();
//   }, []);


//   const PLACEHOLDER =
//     "data:image/svg+xml;utf8," +
//     encodeURIComponent(
//       `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect fill='#e5e7eb' width='100%' height='100%'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#6b7280' font-size='20'>No image</text></svg>`
//     );

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
//       {/* Hero Section */}
//       <div className="py-16 text-center bg-indigo-800 text-white">
//         <h1 className="text-4xl md:text-6xl font-extrabold mb-4">MUCSU Election 2025</h1>
//         <p className="text-lg md:text-xl mb-6 max-w-2xl mx-auto">
//           Your vote shapes the future of Mawlana Bhashani Science and Technology University. Secure, transparent, anonymous.
//         </p>
//         {/* <div className="text-2xl font-semibold mb-4">Election Countdown: {timeLeft}</div> */}
//         <Link
//           to="/voting-page"
//           className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition duration-300 shadow-lg"
//           aria-label="Go to Voting Page"
//         >
//           Vote Now
//         </Link>
//       </div>

//       {/* Featured Candidates Section */}
//       <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
//         <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-8">Featured Candidates</h2>

//         {loading ? (
//           <div className="text-center py-12 text-gray-600">Loading candidates…</div>
//         ) : error ? (
//           <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg text-center shadow-sm">
//             ❌ Error loading candidates: {error}
//           </div>
//         ) : candidates.length === 0 ? (
//           <div className="text-center py-12 text-gray-600">No candidates found.</div>
//         ) : (
//           <>
//             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
//               {candidates.slice(0, 8).map((candidate) => {
//                 const imgSrc = candidate.photoUrl || candidate.photo_url || PLACEHOLDER;
//                 return (
//                   <div
//                     key={candidate.id}
//                     className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center text-center hover:shadow-xl transition duration-300"
//                   >
//                     <div className="w-28 h-28 rounded-full overflow-hidden mb-4 bg-gray-100 flex items-center justify-center">
//                       <img
//                         src={imgSrc}
//                         alt={candidate.full_name ?? "Candidate"}
//                         className="object-cover w-full h-full"
//                         onError={(e) => {
//                           (e.target as HTMLImageElement).src = PLACEHOLDER;
//                         }}
//                       />
//                     </div>
//                     <h3 className="text-lg font-semibold text-gray-900">{candidate.full_name || candidate.name}</h3>
//                     <p className="text-sm text-gray-600">{candidate.position}</p>
//                     {candidate.party && <p className="text-sm text-gray-500 italic">{candidate.party}</p>}
//                     <Link
//                       to={`/voting-page`}
//                       className="mt-4 text-indigo-600 hover:text-indigo-800 font-semibold"
//                       aria-label={`View ${candidate.full_name ?? candidate.name}'s details`}
//                     >
//                       View Ballot
//                     </Link>
//                   </div>
//                 );
//               })}
//             </div>

//             <div className="text-center mt-8">
//               <Link to="/voting-page" className="text-indigo-600 hover:text-indigo-800 font-semibold text-lg">
//                 See Full Ballot
//               </Link>
//             </div>
//           </>
//         )}
//       </div>

//       {/* Election Updates Section */}
//       <div className="bg-gray-100 py-12">
//         <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
//           <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-8">Election Updates</h2>
//           <div className="space-y-6">
//             <div className="bg-white rounded-lg shadow-md p-6">
//               <h3 className="text-xl font-semibold text-gray-900">Voter Registration Open</h3>
//               <p className="text-gray-600">Register through the portal to participate. Check deadlines and instructions.</p>
//             </div>
//             <div className="bg-white rounded-lg shadow-md p-6">
//               <h3 className="text-xl font-semibold text-gray-900">Candidate Debates</h3>
//               <p className="text-gray-600">Live debates schedule will be announced here — stay tuned.</p>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Home;


/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

type Candidate = {
  id: string;
  _id?: string;
  name?: string;
  full_name?: string;
  position?: string;
  photoUrl?: string;
  photo_url?: string;
  party?: string;
  manifesto?: string;
  votes?: number;
  [k: string]: any;
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

const Home: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/candidates`, { signal: ac.signal });
        const data = await res.json();

        const list = Array.isArray(data)
          ? data
          : data?.data || data?.candidates || data?.items || data?.results || [];

        const normalized: Candidate[] = list.map((c: any) => ({
          id: String(c._id ?? c.id ?? ""),
          _id: c._id ?? c.id,
          name: c.name ?? c.full_name ?? "",
          full_name: c.full_name ?? c.name ?? "",
          position: c.position ?? "Unspecified",
          photoUrl: c.photoUrl ?? c.photo_url ?? "",
          photo_url: c.photo_url ?? c.photoUrl ?? "",
          party: c.party ?? "",
          manifesto: c.manifesto ?? "",
          votes: Number(c.votes ?? 0),
        }));

        setCandidates(normalized);
      } catch (err: any) {
        if (err.name === "AbortError") return;
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => ac.abort();
  }, []);

  const PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>
        <rect fill='#f3f4f6' width='100%' height='100%'/>
        <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#9ca3af' font-size='18'>
          No Image
        </text>
      </svg>`
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-100">
      {/* Hero Section */}
      <section className="relative bg-indigo-800  text-white py-20 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 drop-shadow-lg">
            MUCSU Election 2025
          </h1>
          <p className="text-lg md:text-xl text-gray-100 mb-8 leading-relaxed">
            Shape the future of your university. Cast your vote for transparent, fair, and digital democracy.
          </p>
          <Link
            to="/voting-page"
            className="inline-block bg-white text-indigo-700 font-semibold px-8 py-3 rounded-full shadow-lg hover:bg-gray-100 transition-transform transform hover:-translate-y-1"
          >
            Vote Now
          </Link>
        </div>
      </section>

      {/* Featured Candidates */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-center text-gray-800 mb-12">
          Featured Candidates
        </h2>

        {loading ? (
          <div className="text-center py-10 text-gray-500 text-lg">Loading candidates...</div>
        ) : error ? (
          <div className="bg-red-100 text-red-700 px-6 py-4 rounded-lg text-center shadow-sm">
            ❌ Error: {error}
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-10 text-gray-600">No candidates found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
            {candidates.slice(0, 12).map((candidate) => (
              <div
                key={candidate.id}
                className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-shadow duration-300 p-6 text-center border border-gray-100"
              >
                <div className="w-32 h-32 mx-auto rounded-full overflow-hidden mb-4 border-4 border-indigo-200 shadow-inner">
                  <img
                    src={candidate.photoUrl || candidate.photo_url || PLACEHOLDER}
                    alt={candidate.full_name ?? "Candidate"}
                    className="object-cover w-full h-full"
                    onError={(e) => ((e.target as HTMLImageElement).src = PLACEHOLDER)}
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{candidate.full_name || candidate.name}</h3>
                <p className="text-sm text-indigo-600 font-medium">{candidate.position}</p>
                {candidate.party && (
                  <p className="text-xs text-gray-500 italic mt-1">{candidate.party}</p>
                )}
                <Link
                  to="/voting-page"
                  className="mt-4 inline-block text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
                >
                  View Ballot →
                </Link>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Link
            to="/voting-page"
            className="text-indigo-700 hover:text-indigo-900 font-semibold text-lg"
          >
            See Full Ballot
          </Link>
        </div>
      </section>

      {/* Election Updates */}
      <section className="bg-gray-50 py-16 border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-gray-800 mb-10">
            Election Updates
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-semibold text-indigo-700 mb-3">🗳️ Voter Registration</h3>
              <p className="text-gray-600">
                Register now through the student portal to ensure your eligibility. Stay aware of the deadlines.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-semibold text-indigo-700 mb-3">🎤 Candidate Debates</h3>
              <p className="text-gray-600">
                Join live debates to hear each candidate’s vision and plans for a better campus experience.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
