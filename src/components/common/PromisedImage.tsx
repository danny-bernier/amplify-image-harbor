import React, { useEffect, useState } from 'react';
import Image, { ImageProps } from 'next/image';

type PromisedImageProps = Omit<ImageProps, 'src' | 'alt'> & {
    url: Promise<string> | string;
    alt: string;
    loadingFallback?: React.ReactNode;
};

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

    return (
        <Image
            src={resolvedUrl}
            alt={alt}
            {...imgProps}
        />
    );
}