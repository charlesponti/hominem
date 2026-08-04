import { Navigation as UiNavigation } from '@ponti-studios/ui/navigation';
import { Button } from '@ponti-studios/ui/primitives';
import { Link, useLocation } from 'react-router';

import { useHasProfile, useUser } from '../hooks/useAuth';

interface NavLink {
  href: string;
  label: string;
}

const PORTFOLIO_LINKS: NavLink[] = [
  { href: '/work', label: 'Work' },
  { href: '/projects', label: 'Projects' },
  { href: '/skills', label: 'Skills' },
  { href: '/testimonials', label: 'Testimonials' },
];

const PUBLIC_LINKS: NavLink[] = [{ href: '/demo', label: 'Demo' }];

const AUTHENTICATED_LINKS: NavLink[] = [
  { href: '/applications', label: 'Applications' },
  { href: '/account', label: 'Account' },
];

function isActive(pathname: string, href: string) {
  if (href === pathname) return true;
  return href !== '/' && pathname.startsWith(`${href}/`);
}

export default function Navigation() {
  const user = useUser();
  const hasProfile = useHasProfile();
  const location = useLocation();
  const isAuthenticated = Boolean(user);

  const links: NavLink[] = isAuthenticated
    ? hasProfile
      ? [...PORTFOLIO_LINKS, ...AUTHENTICATED_LINKS]
      : []
    : PUBLIC_LINKS;

  return (
    <UiNavigation>
      <UiNavigation.Brand>
        <Link to="/">Career</Link>
      </UiNavigation.Brand>

      <UiNavigation.List>
        {links.map((link) => (
          <UiNavigation.Item
            key={link.href}
            asChild
            active={isActive(location.pathname, link.href)}
          >
            <Link to={link.href}>{link.label}</Link>
          </UiNavigation.Item>
        ))}
      </UiNavigation.List>

      {!isAuthenticated && (
        <UiNavigation.Action>
          <Button variant="outline" asChild>
            <Link to="/auth">Log in</Link>
          </Button>
        </UiNavigation.Action>
      )}
    </UiNavigation>
  );
}
