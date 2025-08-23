-- Create inventory_items table based on Google Sheets columns
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Product Information
  product_type TEXT NOT NULL,
  house_zone TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_id TEXT, -- Serial numbers or identification codes
  description TEXT NOT NULL,
  notes TEXT, -- Added notes field for annotations
  
  -- Pricing
  estimated_price DECIMAL(10,2),
  sale_price DECIMAL(10,2),
  
  -- Status and Links
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'sold', 'reserved', 'not_for_sale')), -- Updated status values to match form
  listing_link TEXT,
  
  -- Photos (will store Blob URLs)
  photos JSONB DEFAULT '[]', -- Changed to JSONB for better handling of photo URLs
  
  -- User association for RLS
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE -- Renamed from user_id to created_by to match form code
);

-- Enable Row Level Security
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_items
CREATE POLICY "Users can view their own inventory items" 
  ON inventory_items FOR SELECT 
  USING (auth.uid() = created_by); -- Updated to use created_by

CREATE POLICY "Users can insert their own inventory items" 
  ON inventory_items FOR INSERT 
  WITH CHECK (auth.uid() = created_by); -- Updated to use created_by

CREATE POLICY "Users can update their own inventory items" 
  ON inventory_items FOR UPDATE 
  USING (auth.uid() = created_by); -- Updated to use created_by

CREATE POLICY "Users can delete their own inventory items" 
  ON inventory_items FOR DELETE 
  USING (auth.uid() = created_by); -- Updated to use created_by

-- Create indexes for better performance
CREATE INDEX idx_inventory_items_created_by ON inventory_items(created_by); -- Updated index name
CREATE INDEX idx_inventory_items_product_type ON inventory_items(product_type);
CREATE INDEX idx_inventory_items_house_zone ON inventory_items(house_zone);
CREATE INDEX idx_inventory_items_status ON inventory_items(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inventory_items_updated_at 
  BEFORE UPDATE ON inventory_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
