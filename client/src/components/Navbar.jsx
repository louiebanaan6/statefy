import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import api from '../api/axios';
import UserAvatar from './UserAvatar';

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-bold text-xl text-near-black">
      <span className="text-primary">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2z" fill="#E8002D" />
          <path d="M8 10h8M8 13h5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      Statefy
    </Link>
  );
}

function NavItem({ to, icon, label, badge }) {
  const location = useLocation();
  const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors relative
        ${active ? 'bg-primary/10 text-primary' : 'text-near-black hover:bg-gray-100'}`}
    >
      <span className="text-xl relative">
        {icon}
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span className="hidden md:block">{label}</span>
    </Link>
  );
}

const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const DiscoverIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
);

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const PersonIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchCount = () => {
      api.get('/notifications/unread-count')
        .then(res => setUnreadCount(res.data.count))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-100 p-4 z-30">
        <div className="mb-8 px-3 pt-2">
          <Logo />
        </div>

        <nav className="flex-1 flex flex-col gap-1">
          <NavItem to="/" icon={<HomeIcon />} label="Home" />
          <NavItem to="/discover" icon={<DiscoverIcon />} label="Discover" />
          {user && <NavItem to="/create" icon={<PlusIcon />} label="Create Statement" />}
          {user && <NavItem to="/notifications" icon={<BellIcon />} label="Notifications" badge={unreadCount} />}
          {user && <NavItem to={`/profile/${user.username}`} icon={<PersonIcon />} label="Profile" />}
          {user?.is_admin && <NavItem to="/admin" icon={<ShieldIcon />} label="Admin Panel" />}
        </nav>

        <div className="border-t border-gray-100 pt-4 mt-4">
          {user ? (
            <div className="flex items-center gap-3">
              <UserAvatar user={user} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-near-black truncate">{user.display_name}</p>
                <p className="text-xs text-secondary truncate">@{user.username}</p>
              </div>
              <button onClick={handleLogout} className="text-secondary hover:text-primary transition-colors p-1" title="Log out">
                <LogoutIcon />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link to="/login" className="btn-secondary text-center text-sm py-2 px-4 rounded-lg border border-gray-200 hover:bg-surface transition-colors font-medium">Log in</Link>
              <Link to="/register" className="bg-primary text-white text-center text-sm py-2 px-4 rounded-lg hover:bg-primary-hover transition-colors font-medium">Sign up</Link>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30 flex items-center justify-around px-2 py-1">
        <MobileNavItem to="/" icon={<HomeIcon />} label="Home" />
        <MobileNavItem to="/discover" icon={<DiscoverIcon />} label="Discover" />
        {user && <MobileNavItem to="/create" icon={<PlusIcon />} label="Create" />}
        {user ? (
          <MobileNavItem to="/notifications" icon={<BellIcon />} label="Alerts" badge={unreadCount} />
        ) : (
          <MobileNavItem to="/login" icon={<PersonIcon />} label="Login" />
        )}
        {user && <MobileNavItem to={`/profile/${user.username}`} icon={<PersonIcon />} label="Profile" />}
      </nav>
    </>
  );
}

function MobileNavItem({ to, icon, label, badge }) {
  const location = useLocation();
  const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg min-w-[48px] relative transition-colors
        ${active ? 'text-primary' : 'text-secondary'}`}
    >
      <span className="relative">
        {icon}
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}
