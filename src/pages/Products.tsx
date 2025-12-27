import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Products.css'

// 상품 이미지 경로 (public 폴더 사용)

interface Product {
  id: number
  name: string
  image: string
}

const products: Product[] = [
  { id: 1, name: '기타자석 4종', image: '/assets/상품 리스트/기타자석 4종.jpg' },
  { id: 2, name: '기타키링', image: '/assets/상품 리스트/기타키링.jpg' },
  { id: 3, name: '기타키링2', image: '/assets/상품 리스트/기타키링2.jpg' },
  { id: 4, name: '발_스네어', image: '/assets/상품 리스트/발_스네어.jpg' },
  { id: 5, name: '키보드뱃지', image: '/assets/상품 리스트/키보드뱃지.jpg' },
  { id: 6, name: '키보드펜던트', image: '/assets/상품 리스트/키보드펜던트.jpg' },
  { id: 7, name: '피크 보관함_기타모양(레드)', image: '/assets/상품 리스트/피크 보관함_기타모양(레드).jpg' },
  { id: 8, name: '피크 보관함_앰프모양', image: '/assets/상품 리스트/피크 보관함_앰프모양.jpg' },
  { id: 9, name: '헤드셋키링', image: '/assets/상품 리스트/헤드셋키링.jpg' },
]

const Products = () => {
  const navigate = useNavigate()
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  return (
    <div className="products-page">
      <div className="products-header">
        <button className="products-back-button" onClick={() => navigate(-1)}>
          ← 뒤로가기
        </button>
        <h1>상품 소개</h1>
      </div>

      <div className="products-grid">
        {products.map((product) => (
          <div
            key={product.id}
            className="product-card"
            onClick={() => setSelectedProduct(product)}
          >
            <div className="product-image-container">
              <img
                src={product.image}
                alt={product.name}
                className="product-image"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="product-name">{product.name}</div>
          </div>
        ))}
      </div>

      {/* 상품 상세 모달 */}
      {selectedProduct && (
        <div className="product-modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="product-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="product-modal-close"
              onClick={() => setSelectedProduct(null)}
            >
              ×
            </button>
            <div className="product-modal-image-container">
              <img
                src={selectedProduct.image}
                alt={selectedProduct.name}
                className="product-modal-image"
              />
            </div>
            <div className="product-modal-name">{selectedProduct.name}</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Products

