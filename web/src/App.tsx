import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Matrix from "./pages/Matrix";
import OfferWizard from "./pages/OfferWizard";
import Prospects from "./pages/Prospects";
import Outreach from "./pages/Outreach";

const NAV = [
  { to: "/", label: "Dashboard", step: "" },
  { to: "/matrix", label: "Opportunity Matrix", step: "01" },
  { to: "/offer", label: "Offer Generator", step: "02" },
  { to: "/prospects", label: "List Builder", step: "03" },
  { to: "/outreach", label: "Outreach", step: "04" },
];

function Nav() {
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:gap-1.5">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            `flex shrink-0 items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              isActive ? "bg-ink text-paper" : "text-ink-soft hover:bg-cream hover:text-ink"
            }`
          }
        >
          {item.step && <span className="font-display text-xs italic opacity-60">{item.step}</span>}
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
        <aside className="border-b border-line px-4 py-4 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r md:px-5 md:py-8">
          <div className="mb-2 md:mb-10">
            <p className="font-display text-2xl font-bold tracking-tight text-ink">
              Launch<span className="text-clay">Kit</span>
            </p>
            <p className="mt-1 hidden text-xs italic leading-snug text-ink-soft md:block">
              Sell before you build.
            </p>
          </div>
          <Nav />
        </aside>
        <main className="flex-1 px-4 py-8 md:px-10 md:py-10">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/matrix" element={<Matrix />} />
            <Route path="/offer" element={<OfferWizard />} />
            <Route path="/prospects" element={<Prospects />} />
            <Route path="/outreach" element={<Outreach />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
