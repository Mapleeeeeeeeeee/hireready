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
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
} from '@heroui/react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession, signOut } from '@/lib/auth/auth-client';
import { getRedirectUrl, clearRedirectUrl } from '@/lib/auth/utils';
import { LanguageToggle } from './LanguageToggle';

export function Navbar() {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  const userMenuItems = [
    { key: 'dashboard', label: t('nav.dashboard'), href: '/dashboard' },
    { key: 'history', label: t('nav.history'), href: '/history' },
    { key: 'profile', label: t('nav.profile'), href: '/profile' },
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
          aria-label={isMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          className="text-charcoal/70 md:hidden"
          srOnlyText={isMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
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

      {/* Auth section with Language toggle - Right aligned */}
      <NavbarContent justify="end" className="gap-4">
        {/* Language toggle - Desktop */}
        <NavbarItem className="hidden md:flex">
          <LanguageToggle />
        </NavbarItem>

        {isPending ? (
          <NavbarItem>
            <Button isLoading size="sm" variant="light" className="text-charcoal/50">
              {t('common.loading')}
            </Button>
          </NavbarItem>
        ) : session?.user ? (
          <NavbarItem>
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <button
                  type="button"
                  className="flex cursor-pointer items-center gap-2 transition-opacity outline-none hover:opacity-80"
                >
                  <span className="text-charcoal/60 hidden font-serif text-sm font-medium italic md:inline">
                    {session.user.name?.split(' ')[0]}
                  </span>
                  <Avatar
                    size="sm"
                    src={session.user.image || undefined}
                    name={session.user.name || undefined}
                    className="ring-warm-gray/20 h-8 w-8 ring-1"
                  />
                </button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label={t('nav.userMenu')}
                variant="flat"
                className="bg-warm-paper border-warm-gray/15 w-56 rounded-lg border shadow-md"
              >
                <DropdownSection showDivider>
                  <DropdownItem
                    key="user-info"
                    isReadOnly
                    className="h-14 gap-2 opacity-100"
                    textValue={session.user.email || session.user.name || 'User'}
                  >
                    <p className="text-charcoal font-medium">{session.user.name}</p>
                    <p className="text-charcoal/60 text-xs">{session.user.email}</p>
                  </DropdownItem>
                </DropdownSection>
                <DropdownSection showDivider>
                  {userMenuItems.map((item) => (
                    <DropdownItem
                      key={item.key}
                      as={Link}
                      href={item.href}
                      className={pathname === item.href ? 'text-terracotta' : 'text-charcoal'}
                    >
                      {item.label}
                    </DropdownItem>
                  ))}
                </DropdownSection>
                <DropdownSection>
                  <DropdownItem
                    key="logout"
                    className="text-terracotta"
                    color="danger"
                    onPress={handleLogout}
                  >
                    {t('nav.logout')}
                  </DropdownItem>
                </DropdownSection>
              </DropdownMenu>
            </Dropdown>
          </NavbarItem>
        ) : (
          <NavbarItem>
            <Button
              as={Link}
              href="/login"
              size="md"
              variant="light"
              className="text-charcoal/80 hover:text-charcoal hover:bg-warm-gray/10 rounded-lg px-5 font-medium transition-all"
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
            >
              {item.label}
            </Link>
          </NavbarMenuItem>
        ))}

        {/* Language toggle - Mobile */}
        <NavbarMenuItem>
          <div className="border-warm-gray/10 mt-4 border-t py-4">
            <LanguageToggle />
          </div>
        </NavbarMenuItem>

        {session?.user && (
          <>
            <NavbarMenuItem>
              <div className="border-warm-gray/10 mt-6 flex items-center gap-3 border-t py-6">
                <Avatar
                  size="sm"
                  src={session.user.image || undefined}
                  name={session.user.name || undefined}
                />
                <div className="flex flex-col">
                  <span className="text-charcoal text-lg font-medium">{session.user.name}</span>
                  <span className="text-charcoal/60 text-sm">{session.user.email}</span>
                </div>
              </div>
            </NavbarMenuItem>

            {userMenuItems.map((item) => (
              <NavbarMenuItem key={item.key}>
                <Link
                  className={`w-full py-3 font-serif text-xl ${
                    pathname === item.href ? 'text-terracotta' : 'text-charcoal'
                  }`}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </NavbarMenuItem>
            ))}

            <NavbarMenuItem>
              <Button
                className="border-terracotta/20 text-terracotta mt-4 w-full border bg-transparent text-lg"
                onPress={handleLogout}
              >
                {t('nav.logout')}
              </Button>
            </NavbarMenuItem>
          </>
        )}
      </NavbarMenu>
    </HeroNavbar>
  );
}
