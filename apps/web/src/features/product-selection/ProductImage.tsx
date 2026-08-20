import { useLayoutEffect, useMemo, useState, type ReactNode } from "react";

import { getProductImageSources, type ProductImageData } from "./product-image";

type Props = {
  product: ProductImageData;
  className: string;
  alt: string;
  children?: ReactNode;
};

export function ProductImage({ product, className, alt, children }: Props) {
  const sources = useMemo(
    () => getProductImageSources(product),
    [product.category, product.id, product.imageUrl, product.sku],
  );
  const [sourceIndex, setSourceIndex] = useState(0);
  const source = sources[sourceIndex] ?? null;

  useLayoutEffect(() => {
    setSourceIndex(0);
  }, [sources]);

  return (
    <span className={`${className}${source ? "" : " image-unavailable"}`}>
      {source ? (
        <img
          key={source}
          src={source}
          alt={alt}
          onError={() => setSourceIndex((current) => current + 1)}
        />
      ) : (
        <span
          className="image-fallback"
          role={alt ? "img" : undefined}
          aria-label={alt ? `${alt} 이미지 준비 중` : undefined}
          aria-hidden={alt ? undefined : "true"}
        >
          MCM
        </span>
      )}
      {children}
    </span>
  );
}
