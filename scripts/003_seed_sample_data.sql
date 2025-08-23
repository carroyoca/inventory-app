-- Insert sample inventory data for testing
INSERT INTO inventory_items (
  product_type,
  house_zone,
  product_name,
  product_id,
  description,
  notes,
  estimated_price,
  sale_price,
  status,
  created_by
) VALUES 
(
  'Painting',
  'Living Room',
  'Abstract Oil Painting',
  'AOP-001',
  'Large abstract oil painting with vibrant colors, approximately 24x36 inches',
  'Purchased from local artist in 2018, excellent condition',
  1200.00,
  1500.00,
  'available',
  auth.uid()
),
(
  'Sculpture',
  'Garden',
  'Bronze Garden Statue',
  'BGS-002',
  'Bronze statue of a dancing figure, weather-resistant finish',
  'Needs minor cleaning, small patina spots',
  800.00,
  950.00,
  'available',
  auth.uid()
),
(
  'Ceramic',
  'Kitchen',
  'Vintage Pottery Set',
  'VPS-003',
  'Set of 6 handmade ceramic bowls with matching serving dish',
  'One bowl has small chip on rim, otherwise perfect',
  150.00,
  200.00,
  'sold',
  auth.uid()
);
