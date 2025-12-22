import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { formatCurrency } from "../utils/numberFormat";

interface Product {
  id: string;
  sku: string;
  name: string;
  priceCents: number;
  taxRate: number;
  barcode?: string;
}

interface ProductListProps {
  onAddToCart: (item: any) => void;
}

export function ProductList({ onAddToCart }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/v1/products`);
        setProducts(response.data);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">Loading products...</div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Products</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {products.slice(0, 12).map((product) => (
          <div
            key={product.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <h3 className="font-medium text-gray-800">{product.name}</h3>
            <p className="text-sm text-gray-600">SKU: {product.sku}</p>
            <p className="text-lg font-semibold text-blue-600 mt-2">
              {formatCurrency(product.priceCents)}
            </p>
            <button
              onClick={() =>
                onAddToCart({
                  productId: product.id,
                  name: product.name,
                  priceCents: product.priceCents,
                  taxRate: product.taxRate,
                  quantity: 1,
                })
              }
              className="mt-2 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
