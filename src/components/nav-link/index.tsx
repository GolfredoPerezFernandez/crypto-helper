import { Slot, component$ } from '@builder.io/qwik';
import { Link, useLocation, type LinkProps } from '@builder.io/qwik-city';

type NavLinkProps = LinkProps & { activeClass?: string };

export const NavLink = component$(
    ({ activeClass, ...props }: NavLinkProps) => {
        const location = useLocation();
        const locale = location.params.locale;
        let toPathname = props.href ?? '';

        // Handle locale prefixing for absolute paths
        if (locale && toPathname.startsWith('/') && !toPathname.startsWith('http')) {
            const localePrefix = `/${locale}`;
            if (!toPathname.startsWith(localePrefix)) {
                // Ensure we don't double slash if toPathname is exactly "/"
                toPathname = toPathname === '/' ? `${localePrefix}/` : `${localePrefix}${toPathname}`;
            }
        }

        const locationPathname = location.url.pathname;

        // Simple active check: if the current location equals or starts with the href
        const normalize = (p: string) => p.endsWith('/') ? p : `${p}/`;
        const normalizedTo = normalize(toPathname);
        const normalizedLoc = normalize(locationPathname);

        const isActive = normalizedLoc === normalizedTo ||
            (normalizedTo !== '/' &&
                normalizedTo !== `/${locale}/` && // Don't match everything if we are at root of locale
                normalizedLoc.startsWith(normalizedTo));

        return (
            <Link
                {...props}
                href={toPathname}
                class={[props.class, isActive ? "active" : "", isActive && activeClass ? activeClass : ""]}
            >
                <Slot />
            </Link>
        );
    }
);
