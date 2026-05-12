// Shared product catalog (attached to window for cross-file, non-module use)
window.ATELIER_PRODUCTS = [
  {
    id: 'tshirt-essential',
    type: 'tshirt',
    name: 'The Essential Tee',
    category: 'T-Shirt',
    price: 89,
    description: 'Heavyweight 240 gsm Supima cotton, garment-dyed for a lived-in softness. Boxy fit, dropped shoulder, ribbed neckline.',
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
    colors: ['#1a1a1a', '#4a4038', '#3a4a6b'],
    defaultColor: '#1a1a1a',
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
