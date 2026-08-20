import { useEffect, useMemo, useState } from "react";

import { getProductImageSources, type ProductImageData } from "./product-image";

type Props = {
  product: ProductImageData;
  className: string;
  alt: string;
};

export function ProductImage({ product, className, alt }: Props) {
  const imageSources = useMemo(
    () => getProductImageSources(product),
    [product.category, product.id, product.imageUrl, product.sku],
  );
  const [imageIndex, setImageIndex] = useState(0);
  const imageSource = imageSources[imageIndex] ?? null;
  const imageUnavailable = imageSource === null;

  useEffect(() => {
    setImageIndex(0);
  }, [imageSources]);

  const handleImageError = () => {
    setImageIndex((currentIndex) => currentIndex + 1);
  };

  return (
    <span className={`${className}${imageUnavailable ? " image-unavailable" : ""}`}>
      {imageSource ? (
        <img
          key={imageSource}
          src={imageSource}
          alt={alt}
          onError={handleImageError}
        />
      ) : (
        <span
          className="image-fallback"
          role={alt ? "img" : undefined}
          aria-label={alt ? `${alt} 이미지 준비 중` : undefined}
          aria-hidden={alt ? undefined : "true"}
        >
          이미지 준비 중
        </span>
      )}
    </span>
  );
}
