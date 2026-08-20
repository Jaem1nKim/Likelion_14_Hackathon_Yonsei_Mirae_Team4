import type { ProductCategory } from "@mcm/shared";

import { ProductImage } from "../features/product-selection/ProductImage";

export type ResultProductItem = {
  productId: string;
  sku?: string;
  name: string;
  category: ProductCategory;
  color: string;
  imageUrl: string;
  recommendationReason: string;
  selectionOrder: number;
};

function ResultProductCard({ item }: { item: ResultProductItem }) {
  return (
    <article className="result-product-card">
      <ProductImage
        product={{
          id: item.productId,
          sku: item.sku ?? "",
          category: item.category,
          imageUrl: item.imageUrl,
        }}
        className="result-product-media"
        alt={`${item.name} 제품`}
      >
        <span className="selection-order">{item.selectionOrder}</span>
      </ProductImage>
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
