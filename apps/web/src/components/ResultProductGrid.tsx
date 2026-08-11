import type { ProductCategory } from "@mcm/shared";
import { useState } from "react";

export type ResultProductItem = {
  productId: string;
  name: string;
  category: ProductCategory;
  color: string;
  imageUrl: string;
  recommendationReason: string;
  selectionOrder: number;
};

function ResultProductCard({ item }: { item: ResultProductItem }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <article className="result-product-card">
      <div className={`result-product-media${imageFailed ? " image-unavailable" : ""}`}>
        <span className="image-fallback" aria-hidden="true">MCM</span>
        {!imageFailed && (
          <img
            src={item.imageUrl}
            alt={`${item.name} 제품`}
            onError={() => setImageFailed(true)}
          />
        )}
        <span className="selection-order">{item.selectionOrder}</span>
      </div>
      <div className="result-product-copy">
        <p>{item.category} · {item.color}</p>
        <h3>{item.name}</h3>
        <p>{item.recommendationReason}</p>
      </div>
    </article>
  );
}

export function ResultProductGrid({ items }: { items: ResultProductItem[] }) {
  return (
    <div className="result-product-grid">
      {items.map((item) => <ResultProductCard key={item.productId} item={item} />)}
    </div>
  );
}
