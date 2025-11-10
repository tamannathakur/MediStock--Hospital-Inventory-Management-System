-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('inventory_staff', 'sister_incharge', 'hod', 'nurse');

-- Create enum for request status
CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected', 'fulfilled');

-- Create enum for request level
CREATE TYPE public.request_level AS ENUM ('department', 'central', 'loan');

-- Create enum for transaction type
CREATE TYPE public.transaction_type AS ENUM ('issue', 'return', 'loan', 'transfer');

-- Create enum for autoclave item status
CREATE TYPE public.autoclave_status AS ENUM ('available', 'occupied', 'maintenance');

-- Create enum for complaint status
CREATE TYPE public.complaint_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- Create departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role user_role NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT,
  batch_no TEXT,
  expiry_date DATE,
  vendor TEXT,
  price_per_unit DECIMAL(10,2),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create central_stock table
CREATE TABLE public.central_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  location TEXT DEFAULT 'Central Store',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id)
);

-- Create department_stock table
CREATE TABLE public.department_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(department_id, product_id)
);

-- Create almirah_stock table (nurse level)
CREATE TABLE public.almirah_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nurse_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(nurse_id, product_id)
);

-- Create autoclaves table
CREATE TABLE public.autoclaves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create autoclave_items table
CREATE TABLE public.autoclave_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  autoclave_id UUID NOT NULL REFERENCES public.autoclaves(id) ON DELETE CASCADE,
  status autoclave_status NOT NULL DEFAULT 'available',
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_date TIMESTAMP WITH TIME ZONE,
  sterilized_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create requests table
CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requested_by UUID NOT NULL REFERENCES public.profiles(id),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  autoclave_item_id UUID REFERENCES public.autoclave_items(id) ON DELETE SET NULL,
  quantity INTEGER,
  status request_status NOT NULL DEFAULT 'pending',
  request_level request_level NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  target_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES public.profiles(id),
  from_department_id UUID REFERENCES public.departments(id),
  to_user_id UUID REFERENCES public.profiles(id),
  to_department_id UUID REFERENCES public.departments(id),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  autoclave_item_id UUID REFERENCES public.autoclave_items(id) ON DELETE SET NULL,
  quantity INTEGER,
  type transaction_type NOT NULL,
  approved_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create complaints table
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raised_by UUID NOT NULL REFERENCES public.profiles(id),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  autoclave_item_id UUID REFERENCES public.autoclave_items(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  status complaint_status NOT NULL DEFAULT 'open',
  resolved_by UUID REFERENCES public.profiles(id),
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_autoclaves_updated_at BEFORE UPDATE ON public.autoclaves
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_autoclave_items_updated_at BEFORE UPDATE ON public.autoclave_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'nurse')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.central_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.almirah_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autoclaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autoclave_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- RLS Policies for departments (readable by all authenticated users)
CREATE POLICY "Departments are viewable by authenticated users"
  ON public.departments FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies for products (all authenticated users can read)
CREATE POLICY "Products are viewable by authenticated users"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Inventory staff can manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('inventory_staff', 'hod')
    )
  );

-- RLS Policies for central_stock
CREATE POLICY "Central stock is viewable by authenticated users"
  ON public.central_stock FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Inventory staff can manage central stock"
  ON public.central_stock FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('inventory_staff', 'hod')
    )
  );

-- RLS Policies for department_stock
CREATE POLICY "Department stock is viewable by authenticated users"
  ON public.department_stock FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can manage their department stock"
  ON public.department_stock FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND (role IN ('inventory_staff', 'hod') OR 
           (role = 'sister_incharge' AND department_id = department_stock.department_id))
    )
  );

-- RLS Policies for almirah_stock
CREATE POLICY "Users can view almirah stock in their department"
  ON public.almirah_stock FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND (department_id = almirah_stock.department_id OR role IN ('inventory_staff', 'hod'))
    )
  );

CREATE POLICY "Nurses and sisters can manage almirah stock"
  ON public.almirah_stock FOR ALL
  TO authenticated
  USING (
    auth.uid() = nurse_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND (role IN ('sister_incharge', 'inventory_staff', 'hod') 
           AND department_id = almirah_stock.department_id)
    )
  );

-- RLS Policies for autoclaves (viewable across departments)
CREATE POLICY "Autoclaves are viewable by authenticated users"
  ON public.autoclaves FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Department staff can manage their autoclaves"
  ON public.autoclaves FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND (role IN ('inventory_staff', 'hod') OR 
           (role = 'sister_incharge' AND department_id = autoclaves.department_id))
    )
  );

-- RLS Policies for autoclave_items (viewable across departments)
CREATE POLICY "Autoclave items are viewable by authenticated users"
  ON public.autoclave_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Department staff can manage their autoclave items"
  ON public.autoclave_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND (role IN ('inventory_staff', 'hod') OR 
           (role IN ('sister_incharge', 'nurse') AND department_id = autoclave_items.department_id))
    )
  );

-- RLS Policies for requests
CREATE POLICY "Users can view requests they created or need to approve"
  ON public.requests FOR SELECT
  TO authenticated
  USING (
    requested_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND (role IN ('inventory_staff', 'hod') OR 
           (role = 'sister_incharge' AND department_id IN (requests.department_id, requests.target_department_id)))
    )
  );

CREATE POLICY "Users can create requests"
  ON public.requests FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Authorized users can update requests"
  ON public.requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND role IN ('inventory_staff', 'sister_incharge', 'hod')
    )
  );

-- RLS Policies for transactions
CREATE POLICY "Users can view transactions involving them or their department"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (
    from_user_id = auth.uid() OR
    to_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND (role IN ('inventory_staff', 'hod') OR 
           department_id IN (transactions.from_department_id, transactions.to_department_id))
    )
  );

CREATE POLICY "Authorized users can create transactions"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND role IN ('inventory_staff', 'sister_incharge', 'hod')
    )
  );

-- RLS Policies for complaints
CREATE POLICY "Users can view complaints they raised or need to resolve"
  ON public.complaints FOR SELECT
  TO authenticated
  USING (
    raised_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND role IN ('inventory_staff', 'sister_incharge', 'hod')
    )
  );

CREATE POLICY "Users can create complaints"
  ON public.complaints FOR INSERT
  TO authenticated
  WITH CHECK (raised_by = auth.uid());

CREATE POLICY "Authorized users can update complaints"
  ON public.complaints FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND role IN ('inventory_staff', 'sister_incharge', 'hod')
    )
  );