/**
 * @fileoverview PromisedImage component
 * Renders an image from either a string URL or a Promise that resolves to a URL.
 * Automatically shows a loading fallback while the URL resolves and falls back
 * to a native `<img>` for `blob:` URLs (local object URLs).
 *
 * The component forwards remaining `next/image` props to the underlying
 * `Image` component when possible; common presentation props are forwarded
 * to the native `<img>` fallback.
 *
 * @author Danny Bernier
 * @version 1.0.0
 */

import React, { useEffect, useState } from 'react';
import Image, { ImageProps } from 'next/image';

/**
 * Props for `PromisedImage`.
 *
 * - `url`: a string URL or a Promise that resolves to a string URL.
 * - `alt`: alt text for the image (required).
 * - `loadingFallback`: optional React node shown while the URL is resolving.
 *
 * All other `next/image` props (except `src` and `alt`) may be provided and
 * are forwarded to the `next/image` component for non-blob URLs. For blob
 * URLs the component will render a native `<img>` and forward common
 * presentation props like `className`, `style`, `width` and `height`.
 */
type PromisedImageProps = Omit<ImageProps, 'src' | 'alt'> & {
    url: Promise<string> | string;
    alt: string;
    loadingFallback?: React.ReactNode;
};

/**
 * PromisedImage
 *
 * Default exported React component that accepts a `url` (string or Promise)
 * and renders an image. While the URL is resolving this component shows `loadingFallback`
 * (or a spinner). If the resolved URL is a `blob:` URL this component renders a native
 * `<img>` element. For normal HTTP or S3 URLs this component renders `next/image` and forwards `imgProps`.
 *
 * @param props - `PromisedImageProps`
 */
export default function PromisedImage({ url, alt, loadingFallback, ...imgProps }: PromisedImageProps) {
    const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setResolvedUrl(null);
        Promise.resolve(url).then(u => {
            if (!cancelled) setResolvedUrl(u);
        });
        return () => { cancelled = true; };
    }, [url]);


    if (!resolvedUrl) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 64 }}>
                {loadingFallback ?? (
                    <img
                        src="/spinner.gif"
                        alt="Loading..."
                        width={64}
                        height={64}
                        style={{ display: 'block' }}
                    />
                )}
            </div>
        );
    }

    // If the resolved URL is a blob (local object URL), render a native <img>
    // since next/image requires explicit width/height or `fill` and cannot handle blob: URLs with the optimizer.
    if (typeof resolvedUrl === 'string' && resolvedUrl.startsWith('blob:')) {
        // Extract common presentation props to forward to the native img
        const { className, style, onClick, width, height } = imgProps as any;
        return (
            <img
                src={resolvedUrl}
                alt={alt}
                className={className}
                style={style}
                onClick={onClick as React.MouseEventHandler<HTMLImageElement>}
                width={typeof width === 'number' ? width : undefined}
                height={typeof height === 'number' ? height : undefined}
            />
        );
    }

    return (
        <Image
            src={resolvedUrl}
            alt={alt}
            {...imgProps}
        />
    );
}