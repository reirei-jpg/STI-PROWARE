import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Megaphone,
    Sparkles,
} from 'lucide-react';

import {
    useEffect,
    useState,
} from 'react';

import { Link } from '@inertiajs/react';

import type {
    CatalogProduct,
} from '@/components/catalog/CatalogCard';

interface ComingSoonCarouselProps {
    products: CatalogProduct[];
}

export default function ComingSoonCarousel({
    products,
}: ComingSoonCarouselProps) {
    const [currentIndex, setCurrentIndex] =
        useState(0);

    /*
    | Once the visitor touches or clicks the carousel it stops sliding by
    | itself, so a slide can never change under their cursor or finger and
    | cause a wrong click. It starts sliding again the next time the page
    | is opened.
    */

    const [autoRotate, setAutoRotate] =
        useState(true);

    /*
    |--------------------------------------------------------------------------
    | Keep Current Slide Valid
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (
            currentIndex >= products.length
        ) {
            setCurrentIndex(0);
        }
    }, [
        currentIndex,
        products.length,
    ]);

    /*
    |--------------------------------------------------------------------------
    | Automatic Rotation
    |--------------------------------------------------------------------------
    |
    | Change advertisement every 5 seconds, until the visitor
    | interacts with the carousel.
    |
    */

    useEffect(() => {
        if (
            !autoRotate
            || products.length <= 1
        ) {
            return;
        }

        const timer =
            window.setInterval(
                () => {
                    setCurrentIndex(
                        (previousIndex) =>
                            (
                                previousIndex
                                + 1
                            )
                            % products.length,
                    );
                },
                5000,
            );

        return () => {
            window.clearInterval(
                timer,
            );
        };
    }, [
        autoRotate,
        products.length,
    ]);

    if (products.length === 0) {
        return null;
    }

    const product =
        products[currentIndex];

        const showNewBadge = (() => {
            if (
                !product.new_badge_started_at
                || !product.new_badge_duration_days
                || product.new_badge_duration_days <= 0
            ) {
                return false;
            }

            const startedAt =
                new Date(
                    product.new_badge_started_at,
                );

            const expiresAt =
                new Date(startedAt);

            expiresAt.setDate(
                expiresAt.getDate()
                + product.new_badge_duration_days,
            );

            return new Date() < expiresAt;
        })();


    const showPrevious = () => {
        setCurrentIndex(
            (previousIndex) =>
                previousIndex === 0
                    ? products.length - 1
                    : previousIndex - 1,
        );
    };

    const showNext = () => {
        setCurrentIndex(
            (previousIndex) =>
                (
                    previousIndex + 1
                )
                % products.length,
        );
    };

    return (
        <section
            onPointerDown={() =>
                setAutoRotate(false)
            }
            className="
                relative
                overflow-hidden
                rounded-3xl
                border
                border-blue-100
                bg-white
                shadow-sm
            "
        >
            <div
                className="
                    grid
                    min-h-[230px]
                    md:grid-cols-[38%_62%]
                "
            >
                {/* Product Image */}

                <div
                    className="
                        relative
                        min-h-[200px]
                        overflow-hidden
                        bg-slate-100
                        md:min-h-[230px]
                    "
                >
                    {product.image_url ? (
                        <img
                            key={
                                product.id
                            }
                            src={
                                product.image_url
                            }
                            alt={
                                product.name
                            }
                            className="
                                absolute
                                inset-0
                                h-full
                                w-full
                                object-contain
                                p-4
                            "
                        />
                    ) : (
                        <div
                            className="
                                flex
                                h-full
                                min-h-[230px]
                                items-center
                                justify-center
                                bg-blue-50
                                text-blue-500
                            "
                        >
                            <Megaphone
                                size={52}
                            />
                        </div>
                    )}

                    <div
                        className="
                            absolute
                            left-4
                            top-4
                            rounded-full
                            bg-amber-400
                            px-4
                            py-2
                            text-xs
                            font-black
                            uppercase
                            tracking-wide
                            text-slate-900
                            shadow-sm
                        "
                    >
                        Coming Soon
                    </div>


                    {showNewBadge && (
                    <div
                        className="
                            absolute
                            bottom-4
                            left-4
                            rounded-full
                            bg-emerald-600
                            px-4
                            py-2
                            text-xs
                            font-black
                            uppercase
                            tracking-wide
                            text-white
                            shadow-sm
                        "
                    >
                        New
                    </div>
                )}
                </div>

                {/* Advertisement Content */}

                <div
                    className="
                        relative
                        flex
                        flex-col
                        justify-center
                        bg-gradient-to-br
                        from-blue-600
                        to-blue-800
                        px-7
                        py-8
                        text-white
                        sm:px-10
                    "
                >
                    <div
                        className="
                            max-w-2xl
                        "
                    >
                        <p
                            className="
                                text-xs
                                font-black
                                uppercase
                                tracking-[0.2em]
                                text-yellow-300
                            "
                        >
                            Upcoming
                            Merchandise
                        </p>

                        <h2
                            className="
                                mt-2
                                text-2xl
                                font-black
                                sm:text-3xl
                            "
                        >
                            {
                                product.name
                            }
                        </h2>

                        <p
                            className="
                                mt-2
                                line-clamp-2
                                text-sm
                                leading-6
                                text-blue-100
                            "
                        >
                            {
                                product.description
                                ?? 'A new STI merchandise item is coming soon.'
                            }
                        </p>

                        <div
                            className="
                                mt-4
                                flex
                                flex-wrap
                                items-center
                                gap-3
                            "
                        >
                            {product.accepts_preorders && (
                                <span
                                    className="
                                        rounded-full
                                        bg-yellow-400
                                        px-3
                                        py-1.5
                                        text-xs
                                        font-black
                                        text-slate-900
                                    "
                                >
                                    Preorder
                                    Available
                                </span>
                            )}

                            {product.early_bird && (
                                <span
                                    className="
                                        inline-flex
                                        items-center
                                        gap-1.5
                                        rounded-full
                                        bg-violet-500
                                        px-3
                                        py-1.5
                                        text-xs
                                        font-black
                                        text-white
                                    "
                                >
                                    <Sparkles
                                        size={14}
                                    />

                                    {
                                        product
                                            .early_bird
                                            .discount_percent
                                    }% off
                                    &middot;{' '}
                                    {
                                        product
                                            .early_bird
                                            .remaining_slots
                                    }{' '}
                                    slot
                                    {product
                                        .early_bird
                                        .remaining_slots ===
                                    1
                                        ? ''
                                        : 's'}{' '}
                                    left
                                </span>
                            )}

                            {product.expected_release_date && (
                                <span
                                    className="
                                        flex
                                        items-center
                                        gap-2
                                        text-sm
                                        font-semibold
                                        text-blue-100
                                    "
                                >
                                    <CalendarDays
                                        size={16}
                                    />

                                    {
                                        product.expected_release_date
                                    }
                                </span>
                            )}
                        </div>

                        <Link
                            href={
                                `/catalog/${product.id}`
                            }
                            className="
                                mt-5
                                inline-flex
                                items-center
                                rounded-xl
                                bg-white
                                px-5
                                py-2.5
                                text-sm
                                font-black
                                text-blue-700
                                shadow-sm
                                transition
                                hover:bg-blue-50
                            "
                        >
                            {product.accepts_preorders
                                ? 'View Preorder'
                                : 'View Product'}
                        </Link>
                    </div>
                </div>
            </div>

            {/* Previous / Next */}

            {products.length > 1 && (
                <>
                    <button
                        type="button"
                        onClick={
                            showPrevious
                        }
                        aria-label="Previous coming soon item"
                        className="
                            absolute
                            left-3
                            top-1/2
                            flex
                            h-9
                            w-9
                            -translate-y-1/2
                            items-center
                            justify-center
                            rounded-full
                            bg-white/90
                            text-slate-700
                            shadow-md
                            transition
                            hover:bg-white
                        "
                    >
                        <ChevronLeft
                            size={20}
                        />
                    </button>

                    <button
                        type="button"
                        onClick={
                            showNext
                        }
                        aria-label="Next coming soon item"
                        className="
                            absolute
                            right-3
                            top-1/2
                            flex
                            h-9
                            w-9
                            -translate-y-1/2
                            items-center
                            justify-center
                            rounded-full
                            bg-white/90
                            text-slate-700
                            shadow-md
                            transition
                            hover:bg-white
                        "
                    >
                        <ChevronRight
                            size={20}
                        />
                    </button>
                </>
            )}

            {/* Slide Dots */}

            {products.length > 1 && (
                <div
                    className="
                        absolute
                        bottom-3
                        left-1/2
                        flex
                        -translate-x-1/2
                        items-center
                        gap-2
                        rounded-full
                        bg-black/20
                        px-3
                        py-2
                    "
                >
                    {products.map(
                        (
                            slideProduct,
                            index,
                        ) => (
                            <button
                                key={
                                    slideProduct.id
                                }
                                type="button"
                                onClick={() =>
                                    setCurrentIndex(
                                        index,
                                    )
                                }
                                aria-label={
                                    `Show ${slideProduct.name}`
                                }
                                className={`
                                    h-2.5
                                    rounded-full
                                    transition-all

                                    ${
                                        index
                                        === currentIndex
                                            ? 'w-6 bg-white'
                                            : 'w-2.5 bg-white/50 hover:bg-white/80'
                                    }
                                `}
                            />
                        ),
                    )}
                </div>
            )}
        </section>
    );
}