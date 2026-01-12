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

export function Navbar() {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogin = async () => {
    saveRedirectUrl(pathname);
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
    <HeroNavbar
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      maxWidth="xl"
      className="bg-warm-paper/90 border-warm-gray/10 border-b py-4 backdrop-blur-md"
    >
      {/* Brand and mobile toggle */}
      <NavbarContent>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          className="text-charcoal/70 md:hidden"
          srOnlyText={isMenuOpen ? 'Close menu' : 'Open menu'}
        />
        <NavbarBrand>
          <Link href="/" className="text-charcoal transition-opacity hover:opacity-80">
            <p className="font-serif text-2xl font-semibold tracking-tight text-inherit">
              HireReady
            </p>
          </Link>
        </NavbarBrand>
      </NavbarContent>

      {/* Desktop menu - Centered */}
      <NavbarContent className="hidden gap-8 md:flex" justify="center">
        {menuItems.map((item) => (
          <NavbarItem key={item.key} isActive={pathname === item.href}>
            <Link
              href={item.href}
              className={`text-sm font-medium tracking-wide transition-colors ${
                pathname === item.href ? 'text-terracotta' : 'text-charcoal/60 hover:text-charcoal'
              }`}
            >
              {item.label}
            </Link>
          </NavbarItem>
        ))}
      </NavbarContent>

      {/* Auth section - Minimalist */}
      <NavbarContent justify="end">
        {isPending ? (
          <NavbarItem>
            <Button isLoading size="sm" variant="light" className="text-charcoal/50">
              {t('common.loading')}
            </Button>
          </NavbarItem>
        ) : session?.user ? (
          <>
            <NavbarItem className="hidden md:flex">
              <span className="text-charcoal/60 pr-3 font-serif text-sm font-medium italic">
                {session.user.name?.split(' ')[0]}
              </span>
            </NavbarItem>
            <NavbarItem>
              <Avatar
                size="sm"
                src={session.user.image || undefined}
                name={session.user.name || undefined}
                className="ring-warm-gray/20 h-8 w-8 ring-1"
              />
            </NavbarItem>
            <NavbarItem>
              <Button
                size="sm"
                variant="light"
                onPress={handleLogout}
                className="text-terracotta/80 hover:text-terracotta min-w-16 px-2 font-medium"
              >
                {t('nav.logout')}
              </Button>
            </NavbarItem>
          </>
        ) : (
          <NavbarItem>
            <Button
              size="md"
              variant="light"
              className="text-charcoal/80 hover:text-charcoal hover:bg-warm-gray/10 rounded-lg px-5 font-medium transition-all"
              onPress={handleLogin}
            >
              {t('nav.login')}
            </Button>
          </NavbarItem>
        )}
      </NavbarContent>

      {/* Mobile menu */}
      <NavbarMenu className="bg-warm-paper pt-8">
        {menuItems.map((item) => (
          <NavbarMenuItem key={item.key}>
            <Link
              className={`w-full py-3 font-serif text-xl ${
                pathname === item.href ? 'text-terracotta' : 'text-charcoal'
              }`}
              href={item.href}
              size="lg"
            >
              {item.label}
            </Link>
          </NavbarMenuItem>
        ))}

        {session?.user && (
          <NavbarMenuItem>
            <div className="border-warm-gray/10 mt-6 flex items-center gap-3 border-t py-6">
              <Avatar
                size="sm"
                src={session.user.image || undefined}
                name={session.user.name || undefined}
              />
              <span className="text-charcoal text-lg font-medium">{session.user.name}</span>
            </div>
            <Button
              className="border-terracotta/20 text-terracotta mt-2 w-full border bg-transparent text-lg"
              onPress={handleLogout}
            >
              {t('nav.logout')}
            </Button>
          </NavbarMenuItem>
        )}
      </NavbarMenu>
    </HeroNavbar>
  );
}
