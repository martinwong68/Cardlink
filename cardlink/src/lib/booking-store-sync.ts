import { createClient } from "@/src/lib/supabase/client";

/**
 * Sync a booking service to the store as a service-type product.
 * Called when creating or updating a booking_service.
 */
export async function syncBookingServiceToStore(
  companyId: string,
  service: {
    id: string;
    name: string;
    description?: string | null;
    price: number;
    duration_minutes: number;
    category?: string | null;
    is_active: boolean;
  }
) {
  const supabase = createClient();

  // Check if a linked store product already exists
  const { data: existing } = await supabase
    .from("store_products")
    .select("id")
    .eq("company_id", companyId)
    .eq("product_type", "service")
    .eq("metadata->>booking_service_id", service.id)
    .maybeSingle();

  const productData = {
    name: service.name,
    description: service.description || null,
    price: service.price,
    category_id: null as string | null,
    is_active: service.is_active,
    product_type: "service",
    metadata: {
      booking_service_id: service.id,
      duration_minutes: service.duration_minutes,
    },
  };

  // Try to find or create category "Services"
  if (service.category) {
    const { data: cat } = await supabase
      .from("store_categories")
      .select("id")
      .eq("company_id", companyId)
      .eq("name", service.category)
      .maybeSingle();

    if (cat) {
      productData.category_id = cat.id as string;
    }
  }

  if (existing) {
    // Update existing product
    await supabase
      .from("store_products")
      .update(productData)
      .eq("id", existing.id);
  } else {
    // Create new product
    await supabase
      .from("store_products")
      .insert({
        ...productData,
        company_id: companyId,
      });
  }
}

/**
 * Sync a store product (service type) back to booking_service.
 * Called when editing a store_product with product_type='service'.
 */
export async function syncStoreProductToBookingService(
  companyId: string,
  product: {
    id: string;
    name: string;
    description?: string | null;
    price: number;
    is_active: boolean;
    metadata?: { booking_service_id?: string; duration_minutes?: number } | null;
  }
) {
  const bookingServiceId = product.metadata?.booking_service_id;
  if (!bookingServiceId) return;

  const supabase = createClient();

  await supabase
    .from("booking_services")
    .update({
      name: product.name,
      description: product.description || null,
      price: product.price,
      is_active: product.is_active,
      duration_minutes: product.metadata?.duration_minutes ?? 60,
    })
    .eq("id", bookingServiceId)
    .eq("company_id", companyId);
}
