'use client';

import {
  Navbar as HeroNavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle,
  Button,
  Avatar,
  Link,
} from '@heroui/react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from '@/lib/auth/auth-client';
import { saveRedirectUrl, getRedirectUrl, clearRedirectUrl } from '@/lib/auth/utils';
import { appConfig } from '@/lib/config';

export function Navbar() {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogin = async () => {
    // Save current URL for redirect after login
    saveRedirectUrl(pathname);

    // Initiate Google OAuth
    await signIn.social({
      provider: 'google',
      callbackURL: pathname,
    });
  };

  const handleLogout = async () => {
    await signOut();
    clearRedirectUrl();
    router.push('/');
  };

  // Check for redirect after login
  useEffect(() => {
    if (session && !isPending) {
      const redirectUrl = getRedirectUrl();
      if (redirectUrl && redirectUrl !== pathname) {
        clearRedirectUrl();
        router.push(redirectUrl);
      }
    }
  }, [session, isPending, pathname, router]);

  const menuItems = [
    { key: 'home', label: t('nav.home'), href: '/' },
    { key: 'interview', label: t('nav.interview'), href: '/interview' },
  ];

  return (
    <HeroNavbar isMenuOpen={isMenuOpen} onMenuOpenChange={setIsMenuOpen} maxWidth="xl" isBordered>
      {/* Brand and mobile toggle */}
      <NavbarContent>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          className="sm:hidden"
          srOnlyText={isMenuOpen ? 'Close menu' : 'Open menu'}
        />
        <NavbarBrand>
          <Link href="/" color="foreground">
            <p className="font-bold text-inherit">{appConfig.name}</p>
          </Link>
        </NavbarBrand>
      </NavbarContent>

      {/* Desktop menu */}
      <NavbarContent className="hidden gap-4 sm:flex" justify="center">
        {menuItems.map((item) => (
          <NavbarItem key={item.key} isActive={pathname === item.href}>
            <Link color={pathname === item.href ? 'primary' : 'foreground'} href={item.href}>
              {item.label}
            </Link>
          </NavbarItem>
        ))}
      </NavbarContent>

      {/* Auth section */}
      <NavbarContent justify="end">
        {isPending ? (
          <NavbarItem>
            <Button isLoading size="sm" variant="flat">
              {t('common.loading')}
            </Button>
          </NavbarItem>
        ) : session?.user ? (
          <>
            <NavbarItem className="hidden sm:flex">
              <span className="text-sm">{session.user.name}</span>
            </NavbarItem>
            <NavbarItem>
              <Avatar
                size="sm"
                src={session.user.image || undefined}
                name={session.user.name || undefined}
              />
            </NavbarItem>
            <NavbarItem>
              <Button size="sm" variant="flat" onPress={handleLogout}>
                {t('nav.logout')}
              </Button>
            </NavbarItem>
          </>
        ) : (
          <NavbarItem>
            <Button size="sm" color="primary" onPress={handleLogin}>
              {t('nav.login')}
            </Button>
          </NavbarItem>
        )}
      </NavbarContent>

      {/* Mobile menu */}
      <NavbarMenu>
        {menuItems.map((item) => (
          <NavbarMenuItem key={item.key}>
            <Link
              className="w-full"
              color={pathname === item.href ? 'primary' : 'foreground'}
              href={item.href}
              size="lg"
            >
              {item.label}
            </Link>
          </NavbarMenuItem>
        ))}

        {session?.user && (
          <NavbarMenuItem>
            <div className="flex items-center gap-2 py-2">
              <Avatar
                size="sm"
                src={session.user.image || undefined}
                name={session.user.name || undefined}
              />
              <span className="text-sm">{session.user.name}</span>
            </div>
          </NavbarMenuItem>
        )}
      </NavbarMenu>
    </HeroNavbar>
  );
}
