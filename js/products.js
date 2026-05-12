// Helper: Unsplash image at any size, auto-format, auto-compress, cropped to a product-card aspect
// All source photos are royalty-free under the Unsplash License.
const U = (id, w = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

// Shared product catalog (attached to window for cross-file, non-module use)
window.ATELIER_PRODUCTS = [
  {
    id: 'tshirt-essential',
    type: 'tshirt',
    name: 'The Essential Tee',
    category: 'T-Shirt',
    price: 89,
    description: 'Heavyweight 240 gsm Supima cotton, garment-dyed for a lived-in softness. Boxy fit, dropped shoulder, ribbed neckline.',
    image: U('1521572163474-6864f9cf17ab'),      // white tee on hanger
    imageLarge: U('1521572163474-6864f9cf17ab', 1400),
    accent: '#f5f1e8',
    colors: ['#1a1a1a', '#f5f1e8', '#8b2e2e', '#3a4a6b', '#c9a96e'],
    defaultColor: '#f5f1e8',
    specs: [
      ['Material', '100% Supima Cotton'],
      ['Weight', '240 gsm'],
      ['Fit', 'Boxy, dropped shoulder'],
      ['Origin', 'Portugal']
    ]
  },
  {
    id: 'tshirt-graphic',
    type: 'tshirt',
    name: 'Oversized Graphic Tee',
    category: 'T-Shirt',
    price: 110,
    description: 'Relaxed silhouette with a minimalist screen-printed motif. Soft-washed for drape.',
    image: U('1583743814966-8936f5b7be1a'),      // black folded tee
    imageLarge: U('1583743814966-8936f5b7be1a', 1400),
    accent: '#1a1a1a',
    colors: ['#1a1a1a', '#f5f1e8', '#2e5d4a'],
    defaultColor: '#1a1a1a',
    specs: [
      ['Material', 'Organic Cotton'],
      ['Weight', '220 gsm'],
      ['Fit', 'Oversized'],
      ['Origin', 'Portugal']
    ]
  },
  {
    id: 'hoodie-signature',
    type: 'hoodie',
    name: 'Cashmere Hoodie',
    category: 'Hoodie',
    price: 640,
    description: 'A hoodie engineered like a suit. Grade-A Mongolian cashmere, raglan sleeve, kangaroo pocket.',
    image: U('1556821840-3a63f95609a7'),          // hoodie flat-lay beige
    imageLarge: U('1556821840-3a63f95609a7', 1400),
    accent: '#4a4038',
    colors: ['#1a1a1a', '#4a4038', '#8b2e2e', '#2e5d4a', '#c9a96e'],
    defaultColor: '#4a4038',
    specs: [
      ['Material', '100% Grade-A Cashmere'],
      ['Weight', '480 gsm'],
      ['Fit', 'Relaxed'],
      ['Origin', 'Italy']
    ]
  },
  {
    id: 'hoodie-tech',
    type: 'hoodie',
    name: 'Technical Zip Hoodie',
    category: 'Hoodie',
    price: 320,
    description: 'Water-resistant cotton blend with bonded seams and a two-way YKK zip.',
    image: U('1578587018452-892bacefd3f2'),       // dark hoodie
    imageLarge: U('1578587018452-892bacefd3f2', 1400),
    accent: '#3a4a6b',
    colors: ['#1a1a1a', '#3a4a6b', '#4a4038'],
    defaultColor: '#3a4a6b',
    specs: [
      ['Material', 'Cotton / Nylon'],
      ['Weight', '360 gsm'],
      ['Fit', 'Regular'],
      ['Origin', 'Japan']
    ]
  },
  {
    id: 'jacket-wool',
    type: 'jacket',
    name: 'Overcoat — Double Face',
    category: 'Jacket',
    price: 1280,
    description: 'Double-faced virgin wool overcoat. Hand-stitched edges, raglan construction, horn buttons.',
    image: U('1544022613-e87ca75a784a'),          // camel coat
    imageLarge: U('1544022613-e87ca75a784a', 1400),
    accent: '#4a4038',
    colors: ['#1a1a1a', '#4a4038', '#3a4a6b'],
    defaultColor: '#4a4038',
    specs: [
      ['Material', 'Virgin Wool (double face)'],
      ['Weight', '720 gsm'],
      ['Fit', 'Oversized, mid-thigh'],
      ['Origin', 'Italy']
    ]
  },
  {
    id: 'jacket-leather',
    type: 'jacket',
    name: 'Lambskin Biker',
    category: 'Jacket',
    price: 1640,
    description: 'Vegetable-tanned Italian lambskin. Asymmetric front zip. Hand-burnished at the seams.',
    image: U('1551028719-00167b16eac5'),          // black leather biker
    imageLarge: U('1551028719-00167b16eac5', 1400),
    accent: '#1a1a1a',
    colors: ['#1a1a1a', '#4a4038'],
    defaultColor: '#1a1a1a',
    specs: [
      ['Material', 'Italian Lambskin'],
      ['Lining', 'Cupro'],
      ['Hardware', 'Gunmetal'],
      ['Origin', 'Italy']
    ]
  },
  {
    id: 'pants-trouser',
    type: 'pants',
    name: 'Pleated Wool Trouser',
    category: 'Pants',
    price: 380,
    description: 'Single-pleat wool trouser with a high rise and a gentle taper.',
    image: U('1594633312681-425c7b97ccd1'),       // tailored trouser
    imageLarge: U('1594633312681-425c7b97ccd1', 1400),
    accent: '#3a4a6b',
    colors: ['#1a1a1a', '#4a4038', '#3a4a6b'],
    defaultColor: '#1a1a1a',
    specs: [
      ['Material', 'Super 120s Wool'],
      ['Rise', 'High'],
      ['Leg', 'Tapered'],
      ['Origin', 'Italy']
    ]
  },
  {
    id: 'pants-denim',
    type: 'pants',
    name: 'Selvedge Denim',
    category: 'Pants',
    price: 260,
    description: '14 oz Japanese selvedge denim from Okayama. Raw, unsanforized — built to break in.',
    image: U('1542272604-787c3835535d'),          // raw denim
    imageLarge: U('1542272604-787c3835535d', 1400),
    accent: '#1e2a42',
    colors: ['#1e2a42', '#1a1a1a'],
    defaultColor: '#1e2a42',
    specs: [
      ['Material', '14 oz Japanese Selvedge'],
      ['Wash', 'Raw'],
      ['Fit', 'Straight'],
      ['Origin', 'Japan']
    ]
  }
];

window.ATELIER_CART = {
  count: 0,
  add() {
    this.count++;
    const el = document.getElementById('cart-count');
    if (el) el.textContent = this.count;
  }
};
